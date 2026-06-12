-- 2026-06-12 — Higiene pós-advisors da rede social: funções SECURITY DEFINER
-- não devem ficar expostas via PostgREST /rpc.
--
-- Trigger functions: EXECUTE é checado só no CREATE TRIGGER, não no disparo —
-- revogar de todos os clientes não afeta os triggers.
-- social_pode_publicar(): roda dentro das policies de RLS como o papel da
-- query, então `authenticated` PRECISA manter EXECUTE; revoga só anon/public.

revoke execute on function public.tg_social_likes_count() from public, anon, authenticated;
revoke execute on function public.tg_social_comments_count() from public, anon, authenticated;
revoke execute on function public.tg_social_notify_like() from public, anon, authenticated;
revoke execute on function public.tg_social_notify_comment() from public, anon, authenticated;
revoke execute on function public.tg_social_notify_follow() from public, anon, authenticated;

revoke execute on function public.social_pode_publicar() from public, anon;
