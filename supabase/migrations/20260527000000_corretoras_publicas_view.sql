-- =================================================================
-- Milsaca — fechar exposição pública de PII em corretoras
-- Data: 2026-05-18
-- =================================================================
-- HOJE: policy `corretoras_public_read using (true)` + grant select
-- pra `anon` permitem que QUALQUER um (incluindo não-logados) faça
-- `select * from corretoras` e leia CNPJ, IE, CEP, endereço, bairro,
-- telefone_fixo. Vazamento de PII reportável (LGPD).
--
-- AGORA:
--   - RLS de SELECT em `corretoras` fica restrita à dona + admin.
--   - `anon` perde acesso total à tabela.
--   - Cria view `corretoras_publicas` com SÓ as colunas seguras
--     (sem cnpj/ie/cep/endereco/bairro/telefone_fixo). View roda com
--     security_invoker = off (executa como owner) — escolha consciente
--     porque os campos projetados já são públicos por desenho.
--   - Catálogo (produtor lendo corretoras pra contratar) usa a view.
--   - Dona da corretora e admin continuam lendo a tabela base (perfil,
--     onboarding, edição, espelho de contrato).
--
-- Migração não-destrutiva: nenhum dado é removido; só o ACESSO muda.
-- =================================================================

-- ----------------------------------------------------------------
-- 1. Restringe SELECT da tabela base
-- ----------------------------------------------------------------
drop policy if exists "corretoras_public_read" on public.corretoras;

create policy "corretoras_self_or_admin_read"
  on public.corretoras
  for select
  using (
    id = public.current_corretora()
    or public.is_admin()
  );

-- ----------------------------------------------------------------
-- 2. Revoga acesso de anon à tabela base
-- ----------------------------------------------------------------
revoke select on public.corretoras from anon;
-- authenticated mantém o grant; RLS gate o acesso linha-a-linha.

-- ----------------------------------------------------------------
-- 3. View pública pro catálogo
-- ----------------------------------------------------------------
-- security_invoker = off é o default em PG <17 e equivale a executar
-- como owner (bypass RLS). Escolha consciente: a view PROJETA SÓ
-- campos seguros, então mesmo que execute como owner, não vaza PII.
-- Em PG 17+ o default mudou; fixamos explicitamente.
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
  created_at
from public.corretoras;

comment on view public.corretoras_publicas is
  'Catálogo público de corretoras. NUNCA adicionar cnpj/ie/cep/endereco/bairro/telefone_fixo aqui.';

revoke all on public.corretoras_publicas from public;
grant select on public.corretoras_publicas to authenticated;
-- anon: deliberadamente sem grant. Catálogo hoje é só pra logados
-- (/painel/produtor/corretoras). Quando houver vitrine pública, dar
-- grant aqui após confirmar que policies não vazam pra anon.

-- ----------------------------------------------------------------
-- 4. RPC pra contagem agregada do dashboard admin
-- ----------------------------------------------------------------
-- O dashboard /admin precisa contar corretoras com vários filtros.
-- Como admin tem acesso à tabela base via RLS, mantém funcionando
-- via `is_admin()`. Sem mudança nas queries do admin.
