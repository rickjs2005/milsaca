-- =================================================================
-- Milsaca — whatsapp_leads aceita insert anônimo
-- Data: 2026-05-20
-- =================================================================
-- BUG fechado:
--   A rota /api/leads/whatsapp aceita anon (não tem auth gate), mas a
--   policy `whatsapp_leads_self_insert` (20260528) é `to authenticated`.
--   Cliques vindos da home pública (source='home_publica') silenciosamente
--   falham no insert — retornam wa_url mas `logged: false`. Sem tracking.
--
-- FIX:
--   Reescreve a policy de INSERT pra aceitar `anon` E `authenticated`,
--   com a invariante:
--     - se produtor_id é null, insert OK (clique anônimo)
--     - se produtor_id é set, precisa bater com auth.uid() (anti-spoof)
--
-- Rate limit por IP continua via /api/leads/whatsapp pra abuso.
-- =================================================================

drop policy if exists "whatsapp_leads_self_insert" on public.whatsapp_leads;

create policy "whatsapp_leads_self_or_anon_insert"
  on public.whatsapp_leads
  for insert
  to anon, authenticated
  with check (
    produtor_id is null
    or (auth.uid() is not null and produtor_id = auth.uid())
  );

-- anon precisa de grant INSERT explícito (RLS sozinha não basta).
grant insert on public.whatsapp_leads to anon;

comment on policy "whatsapp_leads_self_or_anon_insert" on public.whatsapp_leads is
  'Anon insere com produtor_id null (clique anônimo). Authenticated só insere produtor_id = self.';
