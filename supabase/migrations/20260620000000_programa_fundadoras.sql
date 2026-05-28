-- =================================================================
-- Milsaca — Programa de Fundadoras
-- Data: 2026-05-28
-- =================================================================
-- As 5 primeiras corretoras entram GRÁTIS VITALÍCIO (programa fundador).
-- Quando as vagas enchem (ou o admin fecha manualmente), o cadastro de
-- corretora fecha e novas interessadas entram numa lista de espera.
--
-- Cria:
--   - plano grátis "corretora-fundador" (price_cents 0)
--   - settings founder_program_open / founder_slots_total
--   - tabela corretora_waitlist (insert anônimo, leitura/gestão admin)
--   - RPC founder_program_status() pública — o cadastro anônimo precisa
--     saber se ainda aceita, e platform_settings não é legível por anon
-- =================================================================

-- 1) Plano grátis Fundadora -------------------------------------------------
insert into public.plans (slug, name, description, price_cents, billing_period, features, active)
values (
  'corretora-fundador',
  'Fundadora',
  'Programa fundador — acesso completo, grátis vitalício pras primeiras corretoras.',
  0,
  'monthly',
  '["Acesso vitalício grátis", "Todas as features da corretora", "Selo de corretora fundadora"]'::jsonb,
  true
)
on conflict (slug) do nothing;

-- 2) Settings do programa ---------------------------------------------------
-- on conflict do nothing: não sobrescreve ajustes futuros do admin.
insert into public.platform_settings (key, value, description)
values
  ('founder_program_open', 'true'::jsonb, 'Programa de fundadoras aceitando cadastro de corretora.'),
  ('founder_slots_total', '5'::jsonb, 'Total de vagas de corretora fundadora (grátis vitalício).')
on conflict (key) do nothing;

-- 3) Lista de espera de corretora ------------------------------------------
create table public.corretora_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  email text,
  city text,
  state text,
  message text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'convidada', 'entrou', 'descartada')),
  notes text,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index corretora_waitlist_status_idx on public.corretora_waitlist (status);
create index corretora_waitlist_created_idx on public.corretora_waitlist (created_at desc);

drop trigger if exists set_corretora_waitlist_updated_at on public.corretora_waitlist;
create trigger set_corretora_waitlist_updated_at
  before update on public.corretora_waitlist
  for each row execute function public.set_updated_at();

alter table public.corretora_waitlist enable row level security;

-- Qualquer um (anon ou logado) pode entrar na lista de espera.
-- Espelha o padrão de whatsapp_leads_self_or_anon_insert (20260607).
drop policy if exists corretora_waitlist_public_insert on public.corretora_waitlist;
create policy corretora_waitlist_public_insert on public.corretora_waitlist
  for insert to anon, authenticated
  with check (true);

grant insert on public.corretora_waitlist to anon;

-- Só admin lê / gerencia.
drop policy if exists corretora_waitlist_admin_all on public.corretora_waitlist;
create policy corretora_waitlist_admin_all on public.corretora_waitlist
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.corretora_waitlist is
  'Corretoras interessadas quando o programa fundador está cheio/fechado. Insert público; leitura/gestão admin.';

-- 4) Status público do programa --------------------------------------------
-- platform_settings não é legível por anon; a página /cadastrar (pública)
-- precisa saber se ainda há vaga. SECURITY DEFINER expõe só o agregado.
create or replace function public.founder_program_status()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'open', coalesce(
      (select (value #>> '{}')::boolean from public.platform_settings where key = 'founder_program_open'),
      true
    ),
    'total', coalesce(
      (select (value #>> '{}')::int from public.platform_settings where key = 'founder_slots_total'),
      5
    ),
    'used', (
      select count(*)
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where p.slug = 'corretora-fundador'
        and s.status = 'active'
    )
  );
$$;

revoke all on function public.founder_program_status() from public;
grant execute on function public.founder_program_status() to anon, authenticated;

comment on function public.founder_program_status() is
  'Status do programa fundador {open,total,used}. Público (anon) pra gate do cadastro de corretora.';
