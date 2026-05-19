-- =================================================================
-- Milsaca — LGPD: consentimento + soft-delete
-- Data: 2026-05-19
-- =================================================================
-- Duas mudanças complementares pra conformidade LGPD básica:
--
-- 1. Tabela lgpd_consents registra cada consentimento explícito
--    (signup, termos atualizados, opt-in marketing futuro etc).
--    Source-of-truth pra "user X aceitou a versão Y dos termos
--    no momento T com IP hash Z".
--
-- 2. Coluna deleted_at em profiles/produtores/corretoras/
--    produtor_contatos. Quando o titular pedir exclusão, marca o
--    timestamp em vez de DELETE cascata. Audit_log preserva histórico.
--
-- Anonimização real (substituir nome/cpf/cnpj por hash) fica como
-- backlog — fora do escopo desta migration.
-- =================================================================

-- =================================================================
-- 1. lgpd_consents
-- =================================================================
create type public.lgpd_consent_kind as enum (
  'termos_uso',
  'politica_privacidade',
  'marketing_email',
  'marketing_whatsapp',
  'compartilhamento_corretora'
);

create table public.lgpd_consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  email text,
  kind public.lgpd_consent_kind not null,
  version text not null,
  granted boolean not null default true,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index lgpd_consents_profile_idx
  on public.lgpd_consents (profile_id)
  where profile_id is not null;
create index lgpd_consents_email_idx
  on public.lgpd_consents (lower(email))
  where email is not null;
create index lgpd_consents_kind_idx
  on public.lgpd_consents (kind, created_at desc);

alter table public.lgpd_consents enable row level security;

-- Insert: authenticated insere o próprio consentimento; rota de signup
-- usa via service_role no server-side com o user recém-criado.
-- Pra rota anon (signup novo), o registro fica pendente até o profile
-- existir — gravamos com profile_id null + email.
drop policy if exists "lgpd_consents_insert" on public.lgpd_consents;
create policy "lgpd_consents_insert"
  on public.lgpd_consents
  for insert
  to anon, authenticated
  with check (
    profile_id is null
    or (auth.uid() is not null and profile_id = auth.uid())
  );

-- Select: dono lê os próprios; admin lê tudo.
drop policy if exists "lgpd_consents_owner_read" on public.lgpd_consents;
create policy "lgpd_consents_owner_read"
  on public.lgpd_consents
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

grant select, insert on public.lgpd_consents to anon, authenticated;

comment on table public.lgpd_consents is
  'Registro auditável de consentimentos LGPD. Imutável (sem update/delete por desenho).';

-- =================================================================
-- 2. Soft-delete
-- =================================================================
alter table public.profiles
  add column if not exists deleted_at timestamptz;
alter table public.produtores
  add column if not exists deleted_at timestamptz;
alter table public.corretoras
  add column if not exists deleted_at timestamptz;
alter table public.produtor_contatos
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;
create index if not exists produtores_deleted_at_idx
  on public.produtores (deleted_at)
  where deleted_at is not null;
create index if not exists corretoras_deleted_at_idx
  on public.corretoras (deleted_at)
  where deleted_at is not null;

-- Atualiza view corretoras_publicas pra esconder soft-deleted.
-- create or replace mantém ordem das colunas existentes.
create or replace view public.corretoras_publicas
with (security_invoker = off) as
select
  id,
  name,
  slug,
  city,
  state,
  phone,
  email,
  verified,
  descricao,
  logo_url,
  site_url,
  created_at,
  regioes_atendimento,
  lat,
  lng
from public.corretoras
where deleted_at is null;

comment on view public.corretoras_publicas is
  'Catálogo público. Filtra deleted_at. NUNCA adicionar cnpj/ie/cep/endereco/bairro/telefone_fixo.';

revoke all on public.corretoras_publicas from public;
grant select on public.corretoras_publicas to authenticated;
