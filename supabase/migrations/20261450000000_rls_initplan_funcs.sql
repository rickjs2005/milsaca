-- =============================================================================
-- Migration: 20260664000000_rls_initplan_funcs
-- Performance (advisor auth_rls_initplan) — 2a leva: embrulhar as FUNÇÕES
-- customizadas em (select ...) nas tabelas QUENTES.
-- =============================================================================
-- ⚠️ TOCA CONTROLE DE ACESSO (RLS). Aplicar SÓ com autorização explícita.
--
-- Contexto: 20260822000000_perf_rls_initplan já embrulhou auth.uid()/auth.role()
-- em (select ...), mas deixou is_admin()/current_corretora()/is_corretora()
-- CRUAS. Essas três são `stable security definer` e dependem só de auth.uid()
-- (constante na request) — logo o Postgres pode avaliá-las UMA vez por query
-- (InitPlan) em vez de uma vez por linha quando embrulhadas em (select f()).
-- Ganho em SELECT/UPDATE sob RLS nas tabelas grandes.
--
-- SEMÂNTICA INALTERADA: cada policy é recriada 1:1 com a definição EXATA do
-- estado atual (rastreada migration a migration), trocando SOMENTE:
--     is_admin()         -> (select is_admin())
--     current_corretora()-> (select current_corretora())
--     is_corretora()     -> (select is_corretora())
-- (preservando o prefixo public. onde a definição corrente o usava).
-- (select auth.uid()) já vinha embrulhado de 20260822 — mantido como está.
-- DROP IF EXISTS antes de cada CREATE (idempotente). SQL NÃO testado em banco
-- ao vivo — revisar antes de aplicar.
--
-- ⚠️ ORDENAÇÃO: o nome 20260664000000 ordena ANTES de 20260822 e 20260831
-- (consolidação) e de 20261090/20261170. Num banco JÁ provisionado (db push do
-- pendente) ela roda por último e tem efeito; mas num REBUILD do zero ela
-- rodaria cedo e seria sobrescrita pelas migrations posteriores. Pra ser
-- rebuild-safe, renomear pra um timestamp > 20261170000000. Ver caveat no
-- handoff. (Nome mantido conforme especificação da tarefa.)
--
-- Estado-fonte de cada policy:
--   leads_tenant_read           -> 20260822000000
--   leads_tenant_write          -> 20260514000000 (initial_schema, nunca recriada)
--   contratos_*                 -> 20260831000000 (consolidação)
--   entregas_*                  -> 20260831000000
--   produtor_pagamentos_*       -> 20260831000000
--   lotes_*                     -> 20260831000000
--   lotes_corretora_amostra_read-> 20261080000000
--   lead_events_select/update/delete -> 20260831000000
--   lead_events_insert          -> 20261170000000
--   propostas_*                 -> 20260831000000
--   notifications_select        -> 20260831000000
--   notifications_insert        -> 20261090000000
--   (notifications_update / leads_produtor_insert NÃO usam essas funções —
--    pulados de propósito.)
-- =============================================================================

-- ---- leads ------------------------------------------------------------------
drop policy if exists leads_tenant_read on public.leads;
create policy leads_tenant_read on public.leads as permissive for select to public
  using ((select is_admin()) or (corretora_id = (select current_corretora())) or (produtor_id = (select auth.uid())));

drop policy if exists leads_tenant_write on public.leads;
create policy leads_tenant_write on public.leads as permissive for all to public
  using ((select public.is_admin()) or corretora_id = (select public.current_corretora()))
  with check ((select public.is_admin()) or corretora_id = (select public.current_corretora()));

-- ---- contratos --------------------------------------------------------------
drop policy if exists contratos_select on public.contratos;
create policy contratos_select on public.contratos for select to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) OR ((select is_admin()) OR (corretora_id = (select current_corretora())) OR (produtor_id = (select auth.uid()))) );
drop policy if exists contratos_insert on public.contratos;
create policy contratos_insert on public.contratos for insert to public
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists contratos_update on public.contratos;
create policy contratos_update on public.contratos for update to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) )
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists contratos_delete on public.contratos;
create policy contratos_delete on public.contratos for delete to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );

-- ---- entregas ---------------------------------------------------------------
drop policy if exists entregas_select on public.entregas;
create policy entregas_select on public.entregas for select to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) OR ((select is_admin()) OR (corretora_id = (select current_corretora())) OR (produtor_id = (select auth.uid()))) );
drop policy if exists entregas_insert on public.entregas;
create policy entregas_insert on public.entregas for insert to public
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists entregas_update on public.entregas;
create policy entregas_update on public.entregas for update to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) )
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists entregas_delete on public.entregas;
create policy entregas_delete on public.entregas for delete to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );

-- ---- produtor_pagamentos ----------------------------------------------------
drop policy if exists produtor_pagamentos_select on public.produtor_pagamentos;
create policy produtor_pagamentos_select on public.produtor_pagamentos for select to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) OR ((select is_admin()) OR (corretora_id = (select current_corretora())) OR (produtor_id = (select auth.uid()))) );
drop policy if exists produtor_pagamentos_insert on public.produtor_pagamentos;
create policy produtor_pagamentos_insert on public.produtor_pagamentos for insert to public
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists produtor_pagamentos_update on public.produtor_pagamentos;
create policy produtor_pagamentos_update on public.produtor_pagamentos for update to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) )
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists produtor_pagamentos_delete on public.produtor_pagamentos;
create policy produtor_pagamentos_delete on public.produtor_pagamentos for delete to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );

-- ---- lotes ------------------------------------------------------------------
drop policy if exists lotes_select on public.lotes;
create policy lotes_select on public.lotes for select to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) OR ((select is_admin()) OR (corretora_id = (select current_corretora())) OR (produtor_id = (select auth.uid()))) );
drop policy if exists lotes_insert on public.lotes;
create policy lotes_insert on public.lotes for insert to public
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists lotes_update on public.lotes;
create policy lotes_update on public.lotes for update to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) )
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists lotes_delete on public.lotes;
create policy lotes_delete on public.lotes for delete to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );

drop policy if exists "lotes_corretora_amostra_read" on public.lotes;
create policy "lotes_corretora_amostra_read" on public.lotes for select to authenticated
  using (
    exists (
      select 1 from public.amostras a
      where a.lote_id = lotes.id
        and a.corretora_id = (select public.current_corretora())
        and a.status in ('agendada', 'recebida', 'classificada')
    )
  );

-- ---- lead_events ------------------------------------------------------------
drop policy if exists lead_events_select on public.lead_events;
create policy lead_events_select on public.lead_events for select to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) OR ((select is_admin()) OR (corretora_id = (select current_corretora())) OR (lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.produtor_id = (select auth.uid()))))) );
drop policy if exists lead_events_update on public.lead_events;
create policy lead_events_update on public.lead_events for update to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) )
  with check ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );
drop policy if exists lead_events_delete on public.lead_events;
create policy lead_events_delete on public.lead_events for delete to public
  using ( ((select is_admin()) OR (corretora_id = (select current_corretora()))) );

drop policy if exists lead_events_insert on public.lead_events;
create policy lead_events_insert on public.lead_events
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      corretora_id = (select public.current_corretora())
      and exists (
        select 1 from public.leads l
        where l.id = lead_id
          and l.corretora_id = (select public.current_corretora())
      )
    )
  );

-- ---- propostas --------------------------------------------------------------
drop policy if exists propostas_select on public.propostas;
create policy propostas_select on public.propostas for select to authenticated
  using ( (select is_admin()) OR ((corretora_id = (select current_corretora())) OR (select is_admin())) OR (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = (select auth.uid()))))) );
drop policy if exists propostas_insert on public.propostas;
create policy propostas_insert on public.propostas for insert to authenticated
  with check ( (select is_admin()) OR ((corretora_id = (select current_corretora()))) );
drop policy if exists propostas_update on public.propostas;
create policy propostas_update on public.propostas for update to authenticated
  using ( (select is_admin()) OR ((corretora_id = (select current_corretora()))) OR (((status = 'enviada'::proposta_status) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = (select auth.uid()))))))) )
  with check ( (select is_admin()) OR ((corretora_id = (select current_corretora()))) OR (((status = ANY (ARRAY['aceita'::proposta_status, 'rejeitada'::proposta_status])) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = propostas.lead_id) AND (leads.produtor_id = (select auth.uid()))))))) );
drop policy if exists propostas_delete on public.propostas;
create policy propostas_delete on public.propostas for delete to authenticated
  using ( (select is_admin()) OR ((corretora_id = (select current_corretora()))) );

-- ---- notifications ----------------------------------------------------------
-- notifications_update e leads_produtor_insert NÃO usam is_admin/current_corretora
-- (só auth.uid(), já embrulhado) — não são recriadas aqui.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to public
  using ( (((select auth.uid()) = user_id) OR (select is_admin())) );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
with check (
  (select is_admin()) OR (
    (select is_corretora()) AND (
      EXISTS (SELECT 1 FROM public.leads l WHERE l.produtor_id = notifications.user_id AND l.corretora_id = (select current_corretora()))
      OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.produtor_id = notifications.user_id AND c.corretora_id = (select current_corretora()))
      OR EXISTS (SELECT 1 FROM public.entregas e WHERE e.produtor_id = notifications.user_id AND e.corretora_id = (select current_corretora()))
      OR EXISTS (SELECT 1 FROM public.amostras a WHERE a.produtor_id = notifications.user_id AND a.corretora_id = (select current_corretora()))
    )
  )
);

-- =============================================================================
-- FOLLOW-UP (não tocado aqui — fora do conjunto "quente"): as policies com
-- is_admin()/current_corretora() cruas em audit_log, classificacoes_cob,
-- compradores, corretoras, ofertas_comprador, plans, pracas, produtor_contatos,
-- quote_sources, subscriptions, system_events, message_dispatches, coffee_types,
-- profiles (consolidação 20260831) e amostras (20261080) seguem para uma 3a leva.
-- =============================================================================
