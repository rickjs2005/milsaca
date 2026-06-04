-- =================================================================
-- Milsaca — Lote: kg como fonte da verdade, sacas derivada (gerada)
-- Data: 2026-06-04  (Fase 2a do brief "Unidade bag ⇄ saca ⇄ kg")
-- =================================================================
-- Decisões (ver _Milsaca/20 - Tela do Produtor.md):
--   B) peso_kg (já existente) vira a VERDADE; peso_sacas atual vira
--      peso_sacas_legado; peso_sacas é RE-CRIADA como coluna GERADA
--      (peso_kg/60) — mantém o NOME pra não quebrar os ~20 leitores.
--      numeric SEM escala fixa: nunca arredondar sacas no banco (regra de ouro).
--   A) corretora_id vira NULLABLE (produtor registra lote rascunho antes
--      de ter corretora) + policies RLS pro produtor escrever só o
--      próprio lote rascunho não-reivindicado.
--   Metadados de entrada: unidade_entrada / qtd_volumes / peso_por_volume_kg.
-- Aditiva, idempotente. bag_count (negociação) vem na 2b (20261070).
-- =================================================================

-- 1) Migra peso_sacas → peso_kg (verdade) + renomeia o legado.
--    Só roda enquanto peso_sacas ainda é a coluna ORIGINAL (não gerada).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lotes'
      and column_name = 'peso_sacas' and is_generated = 'NEVER'
  ) then
    update public.lotes
       set peso_kg = peso_sacas * 60
     where peso_kg is null and peso_sacas is not null;

    alter table public.lotes rename column peso_sacas to peso_sacas_legado;
  end if;
end $$;

-- 2) Re-cria peso_sacas como coluna GERADA a partir de peso_kg.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lotes'
      and column_name = 'peso_sacas'
  ) then
    alter table public.lotes
      add column peso_sacas numeric generated always as (peso_kg / 60.0) stored;
    comment on column public.lotes.peso_sacas is
      'DERIVADA de peso_kg (verdade) / 60. Não arredonda no banco. Unidade de negócio.';
  end if;
end $$;

-- 3) Metadados de entrada (só pra reexibir do jeito que o produtor digitou).
alter table public.lotes
  add column if not exists unidade_entrada     text,
  add column if not exists qtd_volumes         integer,
  add column if not exists peso_por_volume_kg  numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lotes_unidade_entrada_check') then
    alter table public.lotes
      add constraint lotes_unidade_entrada_check
      check (unidade_entrada is null or unidade_entrada in ('saca','bag','kg'));
  end if;
end $$;

-- 4) corretora_id nullable (produtor cria rascunho sem corretora ainda).
alter table public.lotes alter column corretora_id drop not null;

-- 5) RLS: produtor escreve só o PRÓPRIO lote rascunho ainda não reivindicado
--    (corretora_id null). Não pode forjar corretora_id nem escalar status.
--    SELECT já é coberto por lotes_tenant_read (produtor_id = auth.uid()).
drop policy if exists "lotes_produtor_insert_rascunho" on public.lotes;
create policy "lotes_produtor_insert_rascunho"
  on public.lotes for insert to authenticated
  with check (
    produtor_id = auth.uid() and corretora_id is null and status = 'rascunho'
  );

drop policy if exists "lotes_produtor_update_rascunho" on public.lotes;
create policy "lotes_produtor_update_rascunho"
  on public.lotes for update to authenticated
  using  (produtor_id = auth.uid() and corretora_id is null and status = 'rascunho')
  with check (produtor_id = auth.uid() and corretora_id is null and status = 'rascunho');

drop policy if exists "lotes_produtor_delete_rascunho" on public.lotes;
create policy "lotes_produtor_delete_rascunho"
  on public.lotes for delete to authenticated
  using (produtor_id = auth.uid() and corretora_id is null and status = 'rascunho');

-- 6) Recria a view pública pra projetar a peso_sacas GERADA (e peso_kg).
--    Mesma definição da 20260652 (sem PII), só re-apontando as colunas.
drop view if exists public.lotes_publicos;
create view public.lotes_publicos
with (security_invoker = off) as
select
  l.id, l.codigo, l.safra, l.descricao, l.specie, l.processo,
  l.peso_sacas, l.peso_kg, l.status, l.created_at, l.corretora_id, l.produtor_id,
  c.name as corretora_name, c.slug as corretora_slug, c.city as corretora_city,
  c.state as corretora_state, c.descricao as corretora_descricao,
  c.logo_url as corretora_logo_url, c.verified as corretora_verified,
  p.city as produtor_city, p.state as produtor_state, p.altitude_m,
  p.certificacoes, p.indicacao_geografica, p.foto_capa_url,
  cl.tipo as classificacao_tipo, cl.fora_de_tipo as classificacao_fora_de_tipo,
  cl.bebida as classificacao_bebida, cl.pontuacao as classificacao_pontuacao,
  cl.peneira_dominante as classificacao_peneira, cl.bica_corrida as classificacao_bica_corrida
from public.lotes l
join public.corretoras c on c.id = l.corretora_id
left join public.produtores p on p.profile_id = l.produtor_id
left join lateral (
  select tipo, fora_de_tipo, bebida, pontuacao, peneira_dominante, bica_corrida
  from public.classificacoes_cob
  where lote_id = l.id and not anulada
  order by created_at desc
  limit 1
) cl on true
where l.status in (
  'aguardando_classificacao','classificado','fora_de_tipo','rebeneficiar','vendido'
);

comment on view public.lotes_publicos is
  'Catálogo público de lotes. NUNCA adicionar PII aqui (cpf, cnpj, telefone/email do produtor OU da corretora, nome do produtor, nome da fazenda, geolocalização precisa, observações internas). Contato da corretora só via fluxo autenticado + rate-limit.';

revoke all on public.lotes_publicos from public;
grant select on public.lotes_publicos to anon;
grant select on public.lotes_publicos to authenticated;
