-- =============================================================================
-- Consolidacao de multiple_permissive_policies (linter Supabase)
-- =============================================================================
-- OBJETIVO: reduzir o numero de policies PERMISSIVE avaliadas por (role, comando)
-- substituindo varias policies por UMA por comando, SEM alterar o acesso efetivo.
--
-- PRINCIPIO DE EQUIVALENCIA:
--   Sob RLS, o acesso de um (role, comando) = OR de todas as policies PERMISSIVE
--   que se aplicam aquele (role, comando). Mapeamento comando -> clausula:
--     SELECT -> USING
--     DELETE -> USING
--     INSERT -> WITH CHECK
--     UPDATE -> USING (linhas visiveis) e WITH CHECK (novo valor)
--   Uma policy FOR ALL conta para os 4: USING vale p/ SELECT/UPDATE/DELETE,
--   WITH CHECK p/ INSERT/UPDATE.
--   Cada policy nova reproduz o OR dos predicados das originais que cobriam
--   aquele comando -> logicamente identico (1:1).
--
-- RESTRICTIVE: nao existe NENHUMA policy RESTRICTIVE no schema public
--   (verificado: select * from pg_policies where permissive='RESTRICTIVE' => vazio).
--   Portanto nenhuma e tocada.
--
-- PREDICADOS: copiados LITERALMENTE da definicao remota (incluindo is_admin(),
--   current_corretora(), is_corretora(), (select auth.uid())). Subselects nao
--   foram reescritos.
--
-- TABELAS DEIXADAS DE FORA (roles MISTAS por policy -> consolidar mudaria o
-- acesso POR ROLE, ex.: conceder a anon o que era so de authenticated):
--   - leads             : leads_tenant_write/read [public] + leads_produtor_insert [authenticated]
--   - produtores        : owner_write/read [public] + corretora_related_read [authenticated]
--   - whatsapp_leads    : admin_write [authenticated] + self_or_anon_insert [anon,authenticated] + corretora_read [authenticated]
--   - corretora_waitlist: admin_all [authenticated] + public_insert [anon,authenticated]
--   Mantidas exatamente como estao.
--
-- IDEMPOTENTE: cada create e precedido de drop policy if exists.
-- =============================================================================

-- =====================================================================
-- PADRAO A: <t>_write [ALL, public/auth] + <t>_read/_select [SELECT]
--   SELECT = write.USING OR read.USING
--   INSERT = write.WITH CHECK
--   UPDATE = USING write.USING / CHECK write.WITH CHECK
--   DELETE = write.USING
-- =====================================================================

-- ---- audit_log (role: public) --------------------------------------
drop policy if exists "audit_log_admin_write" on public.audit_log;
drop policy if exists "audit_log_tenant_read" on public.audit_log;
drop policy if exists "audit_log_select" on public.audit_log;
drop policy if exists "audit_log_insert" on public.audit_log;
drop policy if exists "audit_log_update" on public.audit_log;
drop policy if exists "audit_log_delete" on public.audit_log;
create policy "audit_log_select" on public.audit_log for select to public
  using ( is_admin() OR (is_admin() OR (corretora_id = current_corretora())) );
create policy "audit_log_insert" on public.audit_log for insert to public
  with check ( is_admin() );
create policy "audit_log_update" on public.audit_log for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "audit_log_delete" on public.audit_log for delete to public
  using ( is_admin() );

-- ---- classificacoes_cob (role: public) -----------------------------
drop policy if exists "classificacoes_cob_tenant_write" on public.classificacoes_cob;
drop policy if exists "classificacoes_cob_tenant_read" on public.classificacoes_cob;
drop policy if exists "classificacoes_cob_select" on public.classificacoes_cob;
drop policy if exists "classificacoes_cob_insert" on public.classificacoes_cob;
drop policy if exists "classificacoes_cob_update" on public.classificacoes_cob;
drop policy if exists "classificacoes_cob_delete" on public.classificacoes_cob;
create policy "classificacoes_cob_select" on public.classificacoes_cob for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (EXISTS ( SELECT 1
   FROM lotes l
  WHERE ((l.id = classificacoes_cob.lote_id) AND (l.produtor_id = ( SELECT auth.uid() AS uid)))))) );
create policy "classificacoes_cob_insert" on public.classificacoes_cob for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "classificacoes_cob_update" on public.classificacoes_cob for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "classificacoes_cob_delete" on public.classificacoes_cob for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- coffee_types (role: public) -----------------------------------
drop policy if exists "coffee_types_admin_write" on public.coffee_types;
drop policy if exists "coffee_types_public_read" on public.coffee_types;
drop policy if exists "coffee_types_select" on public.coffee_types;
drop policy if exists "coffee_types_insert" on public.coffee_types;
drop policy if exists "coffee_types_update" on public.coffee_types;
drop policy if exists "coffee_types_delete" on public.coffee_types;
create policy "coffee_types_select" on public.coffee_types for select to public
  using ( is_admin() OR ((active = true) OR is_admin()) );
create policy "coffee_types_insert" on public.coffee_types for insert to public
  with check ( is_admin() );
create policy "coffee_types_update" on public.coffee_types for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "coffee_types_delete" on public.coffee_types for delete to public
  using ( is_admin() );

-- ---- compradores (role: public) ------------------------------------
drop policy if exists "compradores_tenant_write" on public.compradores;
drop policy if exists "compradores_tenant_read" on public.compradores;
drop policy if exists "compradores_select" on public.compradores;
drop policy if exists "compradores_insert" on public.compradores;
drop policy if exists "compradores_update" on public.compradores;
drop policy if exists "compradores_delete" on public.compradores;
create policy "compradores_select" on public.compradores for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora())) );
create policy "compradores_insert" on public.compradores for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "compradores_update" on public.compradores for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "compradores_delete" on public.compradores for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- contratos (role: public) --------------------------------------
drop policy if exists "contratos_tenant_write" on public.contratos;
drop policy if exists "contratos_tenant_read" on public.contratos;
drop policy if exists "contratos_select" on public.contratos;
drop policy if exists "contratos_insert" on public.contratos;
drop policy if exists "contratos_update" on public.contratos;
drop policy if exists "contratos_delete" on public.contratos;
create policy "contratos_select" on public.contratos for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (produtor_id = ( SELECT auth.uid() AS uid))) );
create policy "contratos_insert" on public.contratos for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "contratos_update" on public.contratos for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "contratos_delete" on public.contratos for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- corretoras (role: public) -------------------------------------
drop policy if exists "corretoras_admin_write" on public.corretoras;
drop policy if exists "corretoras_self_or_admin_read" on public.corretoras;
drop policy if exists "corretoras_select" on public.corretoras;
drop policy if exists "corretoras_insert" on public.corretoras;
drop policy if exists "corretoras_update" on public.corretoras;
drop policy if exists "corretoras_delete" on public.corretoras;
create policy "corretoras_select" on public.corretoras for select to public
  using ( is_admin() OR ((((id = current_corretora()) AND (deleted_at IS NULL)) OR is_admin())) );
create policy "corretoras_insert" on public.corretoras for insert to public
  with check ( is_admin() );
create policy "corretoras_update" on public.corretoras for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "corretoras_delete" on public.corretoras for delete to public
  using ( is_admin() );

-- ---- entregas (role: public) ---------------------------------------
drop policy if exists "entregas_tenant_write" on public.entregas;
drop policy if exists "entregas_tenant_read" on public.entregas;
drop policy if exists "entregas_select" on public.entregas;
drop policy if exists "entregas_insert" on public.entregas;
drop policy if exists "entregas_update" on public.entregas;
drop policy if exists "entregas_delete" on public.entregas;
create policy "entregas_select" on public.entregas for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (produtor_id = ( SELECT auth.uid() AS uid))) );
create policy "entregas_insert" on public.entregas for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "entregas_update" on public.entregas for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "entregas_delete" on public.entregas for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- favoritos (role: public) --------------------------------------
drop policy if exists "favoritos_owner_write" on public.favoritos;
drop policy if exists "favoritos_owner_read" on public.favoritos;
drop policy if exists "favoritos_select" on public.favoritos;
drop policy if exists "favoritos_insert" on public.favoritos;
drop policy if exists "favoritos_update" on public.favoritos;
drop policy if exists "favoritos_delete" on public.favoritos;
create policy "favoritos_select" on public.favoritos for select to public
  using ( (( SELECT auth.uid() AS uid) = produtor_id) OR (((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin())) );
create policy "favoritos_insert" on public.favoritos for insert to public
  with check ( (( SELECT auth.uid() AS uid) = produtor_id) );
create policy "favoritos_update" on public.favoritos for update to public
  using ( (( SELECT auth.uid() AS uid) = produtor_id) )
  with check ( (( SELECT auth.uid() AS uid) = produtor_id) );
create policy "favoritos_delete" on public.favoritos for delete to public
  using ( (( SELECT auth.uid() AS uid) = produtor_id) );

-- ---- lead_events (role: public) ------------------------------------
drop policy if exists "lead_events_tenant_write" on public.lead_events;
drop policy if exists "lead_events_envolvido_read" on public.lead_events;
drop policy if exists "lead_events_select" on public.lead_events;
drop policy if exists "lead_events_insert" on public.lead_events;
drop policy if exists "lead_events_update" on public.lead_events;
drop policy if exists "lead_events_delete" on public.lead_events;
create policy "lead_events_select" on public.lead_events for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.produtor_id = ( SELECT auth.uid() AS uid))))) );
create policy "lead_events_insert" on public.lead_events for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "lead_events_update" on public.lead_events for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "lead_events_delete" on public.lead_events for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- lotes (role: public) ------------------------------------------
drop policy if exists "lotes_tenant_write" on public.lotes;
drop policy if exists "lotes_tenant_read" on public.lotes;
drop policy if exists "lotes_select" on public.lotes;
drop policy if exists "lotes_insert" on public.lotes;
drop policy if exists "lotes_update" on public.lotes;
drop policy if exists "lotes_delete" on public.lotes;
create policy "lotes_select" on public.lotes for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (produtor_id = ( SELECT auth.uid() AS uid))) );
create policy "lotes_insert" on public.lotes for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "lotes_update" on public.lotes for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "lotes_delete" on public.lotes for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- message_dispatches (role: public) -----------------------------
drop policy if exists "message_dispatches_admin_write" on public.message_dispatches;
drop policy if exists "message_dispatches_admin_read" on public.message_dispatches;
drop policy if exists "message_dispatches_select" on public.message_dispatches;
drop policy if exists "message_dispatches_insert" on public.message_dispatches;
drop policy if exists "message_dispatches_update" on public.message_dispatches;
drop policy if exists "message_dispatches_delete" on public.message_dispatches;
create policy "message_dispatches_select" on public.message_dispatches for select to public
  using ( is_admin() OR (is_admin()) );
create policy "message_dispatches_insert" on public.message_dispatches for insert to public
  with check ( is_admin() );
create policy "message_dispatches_update" on public.message_dispatches for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "message_dispatches_delete" on public.message_dispatches for delete to public
  using ( is_admin() );

-- ---- ofertas_comprador (role: authenticated) -----------------------
drop policy if exists "ofertas_comprador_tenant_write" on public.ofertas_comprador;
drop policy if exists "ofertas_comprador_tenant_read" on public.ofertas_comprador;
drop policy if exists "ofertas_comprador_select" on public.ofertas_comprador;
drop policy if exists "ofertas_comprador_insert" on public.ofertas_comprador;
drop policy if exists "ofertas_comprador_update" on public.ofertas_comprador;
drop policy if exists "ofertas_comprador_delete" on public.ofertas_comprador;
create policy "ofertas_comprador_select" on public.ofertas_comprador for select to authenticated
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora())) );
create policy "ofertas_comprador_insert" on public.ofertas_comprador for insert to authenticated
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "ofertas_comprador_update" on public.ofertas_comprador for update to authenticated
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "ofertas_comprador_delete" on public.ofertas_comprador for delete to authenticated
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- plans (role: authenticated) -----------------------------------
drop policy if exists "plans_admin_all" on public.plans;
drop policy if exists "plans_select" on public.plans;
drop policy if exists "plans_insert" on public.plans;
drop policy if exists "plans_update" on public.plans;
drop policy if exists "plans_delete" on public.plans;
create policy "plans_select" on public.plans for select to authenticated
  using ( is_admin() OR ((active OR is_admin())) );
create policy "plans_insert" on public.plans for insert to authenticated
  with check ( is_admin() );
create policy "plans_update" on public.plans for update to authenticated
  using ( is_admin() ) with check ( is_admin() );
create policy "plans_delete" on public.plans for delete to authenticated
  using ( is_admin() );

-- ---- pracas (role: public) -----------------------------------------
drop policy if exists "pracas_admin_write" on public.pracas;
drop policy if exists "pracas_public_read" on public.pracas;
drop policy if exists "pracas_select" on public.pracas;
drop policy if exists "pracas_insert" on public.pracas;
drop policy if exists "pracas_update" on public.pracas;
drop policy if exists "pracas_delete" on public.pracas;
create policy "pracas_select" on public.pracas for select to public
  using ( is_admin() OR ((active = true) OR is_admin()) );
create policy "pracas_insert" on public.pracas for insert to public
  with check ( is_admin() );
create policy "pracas_update" on public.pracas for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "pracas_delete" on public.pracas for delete to public
  using ( is_admin() );

-- ---- price_alerts (role: public) -----------------------------------
-- write USING/CHECK e select USING sao identicos -> OR colapsa, mas mantemos OR literal
drop policy if exists "price_alerts_owner_write" on public.price_alerts;
drop policy if exists "price_alerts_owner_select" on public.price_alerts;
drop policy if exists "price_alerts_select" on public.price_alerts;
drop policy if exists "price_alerts_insert" on public.price_alerts;
drop policy if exists "price_alerts_update" on public.price_alerts;
drop policy if exists "price_alerts_delete" on public.price_alerts;
create policy "price_alerts_select" on public.price_alerts for select to public
  using ( ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) OR ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) );
create policy "price_alerts_insert" on public.price_alerts for insert to public
  with check ( ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) );
create policy "price_alerts_update" on public.price_alerts for update to public
  using ( ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) )
  with check ( ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) );
create policy "price_alerts_delete" on public.price_alerts for delete to public
  using ( ((( SELECT auth.uid() AS uid) = produtor_id) OR is_admin()) );

-- ---- produtor_contatos (role: public) ------------------------------
drop policy if exists "produtor_contatos_tenant_write" on public.produtor_contatos;
drop policy if exists "produtor_contatos_tenant_read" on public.produtor_contatos;
drop policy if exists "produtor_contatos_select" on public.produtor_contatos;
drop policy if exists "produtor_contatos_insert" on public.produtor_contatos;
drop policy if exists "produtor_contatos_update" on public.produtor_contatos;
drop policy if exists "produtor_contatos_delete" on public.produtor_contatos;
create policy "produtor_contatos_select" on public.produtor_contatos for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR ((((corretora_id = current_corretora()) AND (deleted_at IS NULL)) OR is_admin())) );
create policy "produtor_contatos_insert" on public.produtor_contatos for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "produtor_contatos_update" on public.produtor_contatos for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "produtor_contatos_delete" on public.produtor_contatos for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- produtor_pagamentos (role: public) ----------------------------
drop policy if exists "produtor_pagamentos_tenant_write" on public.produtor_pagamentos;
drop policy if exists "produtor_pagamentos_tenant_read" on public.produtor_pagamentos;
drop policy if exists "produtor_pagamentos_select" on public.produtor_pagamentos;
drop policy if exists "produtor_pagamentos_insert" on public.produtor_pagamentos;
drop policy if exists "produtor_pagamentos_update" on public.produtor_pagamentos;
drop policy if exists "produtor_pagamentos_delete" on public.produtor_pagamentos;
create policy "produtor_pagamentos_select" on public.produtor_pagamentos for select to public
  using ( (is_admin() OR (corretora_id = current_corretora())) OR (is_admin() OR (corretora_id = current_corretora()) OR (produtor_id = ( SELECT auth.uid() AS uid))) );
create policy "produtor_pagamentos_insert" on public.produtor_pagamentos for insert to public
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "produtor_pagamentos_update" on public.produtor_pagamentos for update to public
  using ( (is_admin() OR (corretora_id = current_corretora())) )
  with check ( (is_admin() OR (corretora_id = current_corretora())) );
create policy "produtor_pagamentos_delete" on public.produtor_pagamentos for delete to public
  using ( (is_admin() OR (corretora_id = current_corretora())) );

-- ---- quote_sources (role: public) ----------------------------------
drop policy if exists "quote_sources_admin_write" on public.quote_sources;
drop policy if exists "quote_sources_public_read" on public.quote_sources;
drop policy if exists "quote_sources_select" on public.quote_sources;
drop policy if exists "quote_sources_insert" on public.quote_sources;
drop policy if exists "quote_sources_update" on public.quote_sources;
drop policy if exists "quote_sources_delete" on public.quote_sources;
create policy "quote_sources_select" on public.quote_sources for select to public
  using ( is_admin() OR ((active = true) OR is_admin()) );
create policy "quote_sources_insert" on public.quote_sources for insert to public
  with check ( is_admin() );
create policy "quote_sources_update" on public.quote_sources for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "quote_sources_delete" on public.quote_sources for delete to public
  using ( is_admin() );

-- ---- subscriptions (role: authenticated) ---------------------------
drop policy if exists "subs_admin_all" on public.subscriptions;
drop policy if exists "subs_select" on public.subscriptions;
drop policy if exists "subscriptions_select" on public.subscriptions;
drop policy if exists "subscriptions_insert" on public.subscriptions;
drop policy if exists "subscriptions_update" on public.subscriptions;
drop policy if exists "subscriptions_delete" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions for select to authenticated
  using ( is_admin() OR (((corretora_id = current_corretora()) OR is_admin())) );
create policy "subscriptions_insert" on public.subscriptions for insert to authenticated
  with check ( is_admin() );
create policy "subscriptions_update" on public.subscriptions for update to authenticated
  using ( is_admin() ) with check ( is_admin() );
create policy "subscriptions_delete" on public.subscriptions for delete to authenticated
  using ( is_admin() );

-- ---- system_events (role: public) ----------------------------------
drop policy if exists "system_events_admin_write" on public.system_events;
drop policy if exists "system_events_admin_read" on public.system_events;
drop policy if exists "system_events_select" on public.system_events;
drop policy if exists "system_events_insert" on public.system_events;
drop policy if exists "system_events_update" on public.system_events;
drop policy if exists "system_events_delete" on public.system_events;
create policy "system_events_select" on public.system_events for select to public
  using ( is_admin() OR (is_admin()) );
create policy "system_events_insert" on public.system_events for insert to public
  with check ( is_admin() );
create policy "system_events_update" on public.system_events for update to public
  using ( is_admin() ) with check ( is_admin() );
create policy "system_events_delete" on public.system_events for delete to public
  using ( is_admin() );

-- =====================================================================
-- CASOS ESPECIAIS
-- =====================================================================

-- ---- notifications (role: public) ----------------------------------
-- Originais: admin_insert [INSERT], corretora_insert_envolvido [INSERT],
--            owner_read [SELECT], owner_update [UPDATE].
-- NAO HA policy ALL nem DELETE -> DELETE permanece negado (nenhuma policy criada).
drop policy if exists "notifications_admin_insert" on public.notifications;
drop policy if exists "notifications_corretora_insert_envolvido" on public.notifications;
drop policy if exists "notifications_owner_read" on public.notifications;
drop policy if exists "notifications_owner_update" on public.notifications;
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_select" on public.notifications for select to public
  using ( ((( SELECT auth.uid() AS uid) = user_id) OR is_admin()) );
create policy "notifications_insert" on public.notifications for insert to public
  with check ( is_admin() OR ((is_corretora() AND ((EXISTS ( SELECT 1
   FROM leads l
  WHERE ((l.produtor_id = notifications.user_id) AND (l.corretora_id = current_corretora())))) OR (EXISTS ( SELECT 1
   FROM contratos c
  WHERE ((c.produtor_id = notifications.user_id) AND (c.corretora_id = current_corretora())))) OR (EXISTS ( SELECT 1
   FROM entregas e
  WHERE ((e.produtor_id = notifications.user_id) AND (e.corretora_id = current_corretora()))))))) );
create policy "notifications_update" on public.notifications for update to public
  using ( (( SELECT auth.uid() AS uid) = user_id) )
  with check ( (( SELECT auth.uid() AS uid) = user_id) );

-- ---- profiles (role: public) ---------------------------------------
-- Originais: admin_all [ALL], corretora_read_related [SELECT], self_read [SELECT],
--            self_update [UPDATE].
--   SELECT = admin.USING OR corretora_read.USING OR self_read.USING
--   INSERT = admin.WITH CHECK
--   UPDATE = USING (admin.USING OR self_update.USING) / CHECK (admin.CHECK OR self_update.CHECK)
--   DELETE = admin.USING
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_corretora_read_related" on public.profiles;
drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select to public
  using ( is_admin() OR (('produtor'::user_role = ANY (COALESCE(roles, ARRAY[]::user_role[]))) AND (deleted_at IS NULL) AND ((id IN ( SELECT leads.produtor_id
   FROM leads
  WHERE ((leads.corretora_id = current_corretora()) AND (leads.produtor_id IS NOT NULL)))) OR (id IN ( SELECT contratos.produtor_id
   FROM contratos
  WHERE (contratos.corretora_id = current_corretora()))) OR (id IN ( SELECT favoritos.produtor_id
   FROM favoritos
  WHERE (favoritos.corretora_id = current_corretora()))))) OR ((( SELECT auth.uid() AS uid) = id) AND ((deleted_at IS NULL) OR is_admin())) );
create policy "profiles_insert" on public.profiles for insert to public
  with check ( is_admin() );
create policy "profiles_update" on public.profiles for update to public
  using ( is_admin() OR ((( SELECT auth.uid() AS uid) = id)) )
  with check ( is_admin() OR ((( SELECT auth.uid() AS uid) = id)) );
create policy "profiles_delete" on public.profiles for delete to public
  using ( is_admin() );

-- ---- propostas (role: authenticated) -------------------------------
-- Originais: admin_all [ALL], delete [DELETE], insert [INSERT],
--            select [SELECT], select_produtor [SELECT],
--            update [UPDATE], update_produtor [UPDATE].
--   SELECT = admin.USING OR select.USING OR select_produtor.USING
--   INSERT = admin.CHECK OR insert.CHECK
--   UPDATE = USING (admin.USING OR update.USING OR update_produtor.USING)
--            CHECK (admin.CHECK OR update.CHECK OR update_produtor.CHECK)
--   DELETE = admin.USING OR delete.USING
drop policy if exists "propostas_admin_all" on public.propostas;
drop policy if exists "propostas_delete" on public.propostas;
drop policy if exists "propostas_insert" on public.propostas;
drop policy if exists "propostas_select" on public.propostas;
drop policy if exists "propostas_select_produtor" on public.propostas;
drop policy if exists "propostas_update" on public.propostas;
drop policy if exists "propostas_update_produtor" on public.propostas;
create policy "propostas_select" on public.propostas for select to authenticated
  using ( is_admin() OR ((corretora_id = current_corretora()) OR is_admin()) OR (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = ( SELECT auth.uid() AS uid))))) );
create policy "propostas_insert" on public.propostas for insert to authenticated
  with check ( is_admin() OR ((corretora_id = current_corretora())) );
create policy "propostas_update" on public.propostas for update to authenticated
  using ( is_admin() OR ((corretora_id = current_corretora())) OR (((status = 'enviada'::proposta_status) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = ( SELECT auth.uid() AS uid))))))) )
  with check ( is_admin() OR ((corretora_id = current_corretora())) OR (((status = ANY (ARRAY['aceita'::proposta_status, 'rejeitada'::proposta_status])) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = ( SELECT auth.uid() AS uid))))))) );
create policy "propostas_delete" on public.propostas for delete to authenticated
  using ( is_admin() OR ((corretora_id = current_corretora())) );

-- =============================================================================
-- FIM. Tabelas com roles mistas (leads, produtores, whatsapp_leads,
-- corretora_waitlist) NAO foram tocadas (ver cabecalho).
-- =============================================================================
