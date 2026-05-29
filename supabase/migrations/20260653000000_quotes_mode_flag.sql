-- =================================================================
-- Milsaca — QUOTES_MODE como flag hot-swappable (auditoria 4.8)
-- Data: 2026-06-53 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Antes, trocar o modo de cotações (real <-> demo) exigia mudar a env
-- var QUOTES_MODE e redeployar. Agora a fonte de verdade é
-- platform_settings.quotes_mode, editável no /admin sem redeploy.
--
-- Precedência no runtime (lib/quotes-mode.ts):
--   1. platform_settings.quotes_mode (esta flag — via get_quotes_mode())
--   2. env QUOTES_MODE / NEXT_PUBLIC_QUOTES_MODE (fallback)
--   3. 'real' (default seguro)
--
-- Default da flag: 'real' (produção segura por construção). on conflict
-- do nothing pra não sobrescrever um ajuste já feito pelo admin.
--
-- get_quotes_mode() é SECURITY DEFINER e pública porque platform_settings
-- tem RLS admin-only — o badge "Demonstração" precisa ler o modo mesmo
-- pra produtor anon/logado. Expõe SÓ esse agregado (1 string), nada mais.
-- =================================================================

-- 1) Setting (default 'real') ----------------------------------------------
insert into public.platform_settings (key, value, description)
values (
  'quotes_mode',
  '"real"'::jsonb,
  'Modo de cotações: "real" (só dados reais) ou "demo" (permite seed fake + badge Demonstração). Hot-swappable, lido por lib/quotes-mode.ts.'
)
on conflict (key) do nothing;

-- 2) RPC pública que lê só o modo --------------------------------------------
create or replace function public.get_quotes_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}') from public.platform_settings where key = 'quotes_mode'),
    'real'
  );
$$;

revoke all on function public.get_quotes_mode() from public;
grant execute on function public.get_quotes_mode() to anon, authenticated;

comment on function public.get_quotes_mode() is
  'Modo de cotações atual ("real"|"demo") a partir de platform_settings.quotes_mode. Público (anon) pra render do badge Demonstração. Default "real".';
