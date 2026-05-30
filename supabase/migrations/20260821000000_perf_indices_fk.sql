-- =============================================================================
-- Migration: 20260821000000_perf_indices_fk
-- Agente S3 — Performance (advisors): índices de cobertura para FKs sem índice.
-- =============================================================================
-- BAIXO RISCO, ALTO VALOR. Um índice b-tree por FK sem índice de cobertura.
-- Idempotente (CREATE INDEX IF NOT EXISTS). Acelera joins e evita varredura
-- sequencial em DELETE/UPDATE da tabela referenciada.
--
-- Origem: Supabase advisor performance (unindexed_foreign_keys = 17) no projeto
-- kulanbcyrfawlhrpqxtz, coletado em 2026-05-30.
--
-- NOTA: a recriação das 24 policies auth_rls_initplan foi MOVIDA para a migration
-- 20260822000000_perf_rls_initplan.sql (toca controle de acesso → aplicação
-- separada e autorizada). multiple_permissive_policies (143) e unused_index (48)
-- seguem como follow-up (ver relatório da sessão 2026-05-30).
-- =============================================================================

create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);
create index if not exists classificacoes_cob_classificador_id_idx on public.classificacoes_cob (classificador_id);
create index if not exists contratos_lead_id_idx on public.contratos (lead_id);
create index if not exists corretora_invites_created_by_idx on public.corretora_invites (created_by);
create index if not exists corretora_invites_used_by_user_id_idx on public.corretora_invites (used_by_user_id);
create index if not exists cotacoes_source_id_idx on public.cotacoes (source_id);
create index if not exists lead_events_actor_id_idx on public.lead_events (actor_id);
create index if not exists lead_waitlist_handled_by_idx on public.lead_waitlist (handled_by);
create index if not exists message_dispatches_profile_id_idx on public.message_dispatches (profile_id);
create index if not exists message_dispatches_template_id_idx on public.message_dispatches (template_id);
create index if not exists moderation_reports_reporter_id_idx on public.moderation_reports (reporter_id);
create index if not exists moderation_reports_resolved_by_idx on public.moderation_reports (resolved_by);
create index if not exists ofertas_comprador_created_by_idx on public.ofertas_comprador (created_by);
create index if not exists platform_settings_updated_by_idx on public.platform_settings (updated_by);
create index if not exists price_alerts_region_id_idx on public.price_alerts (region_id);
create index if not exists produtor_pagamentos_entrega_id_idx on public.produtor_pagamentos (entrega_id);
create index if not exists propostas_created_by_idx on public.propostas (created_by);
