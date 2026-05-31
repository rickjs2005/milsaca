-- =================================================================
-- Milsaca — superuser desacoplado de user_role
-- Data: 2026-05-18
-- =================================================================
-- O "admin" é o operador da plataforma (Rick) — nada a ver com
-- produtor ou corretora, que são clientes. Antes, admin era apenas
-- um valor do enum user_role em profiles, misturado nos signups e
-- no array profiles.roles. Isso era confuso conceitualmente e perigoso
-- (signup malicioso poderia tentar setar role=admin via metadata).
--
-- Agora: tabela app_admins separada, alimentada manualmente. Quem
-- não está lá NÃO é admin, ponto.
--
-- is_admin() — re-definida pra ler de app_admins. As 40+ policies
-- existentes que chamam is_admin() continuam funcionando sem mudança.
-- =================================================================

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- app_admins só é lida pelo próprio app_admin (defesa em profundidade —
-- security definer functions já bypassam RLS, mas se algum query rodar
-- com role authenticated direto, nada vaza).
drop policy if exists "admins read app_admins" on public.app_admins;
create policy "admins read app_admins"
  on public.app_admins
  for select
  to authenticated
  using (auth.uid() in (select user_id from public.app_admins));

-- Helper canônico — substitui semanticamente o is_admin() antigo.
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;

-- Mantém o nome is_admin() pra compatibilidade com policies já escritas,
-- mas redireciona pra app_admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin()
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- =================================================================
-- Seed: provisiona o admin inicial (Rick)
-- =================================================================
-- Fail-safe: se o user não existir ainda (ex.: ambiente de dev novo),
-- a migration roda sem erro mas ninguém vira admin. O provisionamento
-- pode ser refeito via script ou inserindo manualmente em app_admins.
insert into public.app_admins (user_id, notes)
select id, 'Admin Milsaca - founder'
  from auth.users
 where email = 'milsaca2026@gmail.com'
   and not exists (
     select 1 from public.app_admins a where a.user_id = auth.users.id
   );

comment on table public.app_admins is
  'Operadores da plataforma (superusers). Não é cliente — alimenta /admin.';
comment on function public.is_app_admin() is
  'true se auth.uid() está em app_admins. Use em policies e em código.';
comment on function public.is_admin() is
  'Alias histórico de is_app_admin() — mantido pra não reescrever 40+ policies.';
