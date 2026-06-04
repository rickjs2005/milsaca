-- =================================================================
-- Milsaca — Amostras (produtor leva amostra física; corretora classifica)
-- Data: 2026-06-04  (Brief 3 — Amostras, Fase A)
-- =================================================================
-- Fluxo: produtor agenda entrega → corretora marca recebida → corretora
-- envia laudo (bebida/tipo) + preço que pagaria → produtor compara. A amostra
-- carrega o RESULTADO (sem COB completo). O lote segue do produtor (só compara).
-- Aditiva, idempotente.
-- =================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'amostra_status') then
    create type public.amostra_status as enum (
      'agendada', 'recebida', 'classificada', 'recusada', 'cancelada'
    );
  end if;
end $$;

create table if not exists public.amostras (
  id uuid primary key default extensions.uuid_generate_v4(),
  produtor_id uuid not null references public.profiles(id) on delete cascade,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  lote_id uuid not null references public.lotes(id) on delete cascade,

  status public.amostra_status not null default 'agendada',

  -- logística (a amostra é física; o app só rastreia)
  data_entrega_prevista date,
  data_recebida date,
  data_resultado date,

  mensagem text,        -- nota do produtor ao agendar
  motivo_recusa text,   -- quando recusada

  -- laudo simplificado + oferta (corretora preenche ao classificar)
  resultado_bebida text,
  resultado_tipo text,
  resultado_fora_de_tipo boolean not null default false,
  preco_oferta numeric(12, 2),   -- R$/saca que a corretora pagaria
  laudo_observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lote_id, corretora_id)
);

create index if not exists amostras_produtor_idx on public.amostras (produtor_id);
create index if not exists amostras_corretora_idx on public.amostras (corretora_id);
create index if not exists amostras_lote_idx on public.amostras (lote_id);

drop trigger if exists amostras_set_updated_at on public.amostras;
create trigger amostras_set_updated_at before update on public.amostras
  for each row execute function public.tg_set_updated_at();

alter table public.amostras enable row level security;

-- SELECT: produtor dono OU corretora destinatária OU admin.
drop policy if exists amostras_select on public.amostras;
create policy amostras_select on public.amostras for select to authenticated
  using (
    produtor_id = auth.uid()
    or corretora_id = public.current_corretora()
    or public.is_admin()
  );

-- INSERT: produtor cria a própria amostra, e o lote tem que ser dele.
drop policy if exists amostras_produtor_insert on public.amostras;
create policy amostras_produtor_insert on public.amostras for insert to authenticated
  with check (
    produtor_id = auth.uid()
    and exists (
      select 1 from public.lotes l
      where l.id = lote_id and l.produtor_id = auth.uid()
    )
  );

-- UPDATE produtor: mexe nas próprias (ex.: cancelar, reagendar).
drop policy if exists amostras_produtor_update on public.amostras;
create policy amostras_produtor_update on public.amostras for update to authenticated
  using (produtor_id = auth.uid())
  with check (produtor_id = auth.uid());

-- UPDATE corretora: as endereçadas a ela (recebida / laudo+preço / recusar).
drop policy if exists amostras_corretora_update on public.amostras;
create policy amostras_corretora_update on public.amostras for update to authenticated
  using (corretora_id = public.current_corretora())
  with check (corretora_id = public.current_corretora());

drop policy if exists amostras_admin_all on public.amostras;
create policy amostras_admin_all on public.amostras for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- LOTES: a corretora destinatária de uma amostra ativa pode LER o lote
-- (visibilidade pra analisar a amostra) — sem virar dona dele.
drop policy if exists "lotes_corretora_amostra_read" on public.lotes;
create policy "lotes_corretora_amostra_read" on public.lotes for select to authenticated
  using (
    exists (
      select 1 from public.amostras a
      where a.lote_id = lotes.id
        and a.corretora_id = public.current_corretora()
        and a.status in ('agendada', 'recebida', 'classificada')
    )
  );
