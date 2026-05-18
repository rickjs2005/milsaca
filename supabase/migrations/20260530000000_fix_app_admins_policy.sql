-- =================================================================
-- Milsaca — corrige recursão infinita em app_admins.SELECT
-- Data: 2026-05-18
-- =================================================================
-- A policy original "admins read app_admins" fazia:
--   using (auth.uid() in (select user_id from public.app_admins))
-- O SELECT interno entra na MESMA policy → infinite recursion (42P17).
--
-- Achado pelo smoke-rbac.mjs (Etapa 10 da auditoria).
--
-- Fix: usar a função is_app_admin() (security definer, bypassa RLS
-- na consulta interna). Mesma semântica, sem recursão.
-- =================================================================

drop policy if exists "admins read app_admins" on public.app_admins;

create policy "admins read app_admins"
  on public.app_admins
  for select
  to authenticated
  using (public.is_app_admin());
