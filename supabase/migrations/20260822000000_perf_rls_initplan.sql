-- =============================================================================
-- Migration: 20260822000000_perf_rls_initplan
-- Agente S3 — Performance (advisors): auth_rls_initplan.
-- =============================================================================
-- ⚠️ TOCA CONTROLE DE ACESSO (RLS). Aplicar SÓ com autorização explícita.
--
-- Recria 24 policies trocando auth.uid()/auth.role() por (select auth.uid())/
-- (select auth.role()), que o Postgres avalia uma vez por query (InitPlan) em
-- vez de uma vez por linha — ganho de performance em tabelas grandes sob RLS.
--
-- Cada policy foi recriada 1:1 com a definição EXATA coletada do remoto via
-- pg_policies (mesma role, cmd, USING e WITH CHECK). As funções customizadas
-- is_admin() e current_corretora() NÃO foram alteradas (não são as funções
-- auth.* sinalizadas; mexer nelas mudaria semântica). DROP IF EXISTS antes de
-- recriar. Aplicar em transação (apply_migration já roda atômico).
--
-- multiple_permissive_policies (143 / 34 tuplas) e unused_index (48) seguem como
-- follow-up — ver relatório da sessão 2026-05-30.
-- =============================================================================

drop policy if exists classificacoes_cob_tenant_read on public.classificacoes_cob;
create policy classificacoes_cob_tenant_read on public.classificacoes_cob as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (exists (select 1 from lotes l where l.id = classificacoes_cob.lote_id and l.produtor_id = (select auth.uid()))));

drop policy if exists contratos_tenant_read on public.contratos;
create policy contratos_tenant_read on public.contratos as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (produtor_id = (select auth.uid())));

drop policy if exists cotacoes_authenticated_read on public.cotacoes;
create policy cotacoes_authenticated_read on public.cotacoes as permissive for select to public
  using ((select auth.role()) = 'authenticated'::text);

drop policy if exists entregas_tenant_read on public.entregas;
create policy entregas_tenant_read on public.entregas as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (produtor_id = (select auth.uid())));

drop policy if exists favoritos_owner_read on public.favoritos;
create policy favoritos_owner_read on public.favoritos as permissive for select to public
  using (((select auth.uid()) = produtor_id) or is_admin());

drop policy if exists favoritos_owner_write on public.favoritos;
create policy favoritos_owner_write on public.favoritos as permissive for all to public
  using ((select auth.uid()) = produtor_id) with check ((select auth.uid()) = produtor_id);

drop policy if exists lead_events_envolvido_read on public.lead_events;
create policy lead_events_envolvido_read on public.lead_events as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (lead_id in (select leads.id from leads where leads.produtor_id = (select auth.uid()))));

drop policy if exists leads_produtor_insert on public.leads;
create policy leads_produtor_insert on public.leads as permissive for insert to authenticated
  with check ((produtor_id = (select auth.uid())) and (status = 'novo'::lead_status));

drop policy if exists leads_tenant_read on public.leads;
create policy leads_tenant_read on public.leads as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (produtor_id = (select auth.uid())));

drop policy if exists lgpd_consents_insert on public.lgpd_consents;
create policy lgpd_consents_insert on public.lgpd_consents as permissive for insert to anon, authenticated
  with check ((profile_id is null) or (((select auth.uid()) is not null) and (profile_id = (select auth.uid()))));

drop policy if exists lgpd_consents_owner_read on public.lgpd_consents;
create policy lgpd_consents_owner_read on public.lgpd_consents as permissive for select to authenticated
  using ((profile_id = (select auth.uid())) or is_admin());

drop policy if exists lotes_tenant_read on public.lotes;
create policy lotes_tenant_read on public.lotes as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (produtor_id = (select auth.uid())));

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications as permissive for select to public
  using (((select auth.uid()) = user_id) or is_admin());

drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications as permissive for update to public
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists price_alerts_owner_select on public.price_alerts;
create policy price_alerts_owner_select on public.price_alerts as permissive for select to public
  using (((select auth.uid()) = produtor_id) or is_admin());

drop policy if exists price_alerts_owner_write on public.price_alerts;
create policy price_alerts_owner_write on public.price_alerts as permissive for all to public
  using (((select auth.uid()) = produtor_id) or is_admin()) with check (((select auth.uid()) = produtor_id) or is_admin());

drop policy if exists produtor_pagamentos_tenant_read on public.produtor_pagamentos;
create policy produtor_pagamentos_tenant_read on public.produtor_pagamentos as permissive for select to public
  using (is_admin() or (corretora_id = current_corretora()) or (produtor_id = (select auth.uid())));

drop policy if exists produtores_owner_read on public.produtores;
create policy produtores_owner_read on public.produtores as permissive for select to public
  using ((((select auth.uid()) = profile_id) or is_admin()) and ((deleted_at is null) or is_admin()));

drop policy if exists produtores_owner_write on public.produtores;
create policy produtores_owner_write on public.produtores as permissive for all to public
  using (((select auth.uid()) = profile_id) or is_admin()) with check (((select auth.uid()) = profile_id) or is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles as permissive for select to public
  using (((select auth.uid()) = id) and ((deleted_at is null) or is_admin()));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles as permissive for update to public
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists propostas_select_produtor on public.propostas;
create policy propostas_select_produtor on public.propostas as permissive for select to authenticated
  using (exists (select 1 from leads where leads.id = propostas.lead_id and leads.produtor_id = (select auth.uid())));

drop policy if exists propostas_update_produtor on public.propostas;
create policy propostas_update_produtor on public.propostas as permissive for update to authenticated
  using ((status = 'enviada'::proposta_status) and (exists (select 1 from leads where leads.id = propostas.lead_id and leads.produtor_id = (select auth.uid()))))
  with check ((status = any (array['aceita'::proposta_status, 'rejeitada'::proposta_status])) and (exists (select 1 from leads where leads.id = propostas.lead_id and leads.produtor_id = (select auth.uid()))));

drop policy if exists whatsapp_leads_self_or_anon_insert on public.whatsapp_leads;
create policy whatsapp_leads_self_or_anon_insert on public.whatsapp_leads as permissive for insert to anon, authenticated
  with check ((produtor_id is null) or (((select auth.uid()) is not null) and (produtor_id = (select auth.uid()))));
