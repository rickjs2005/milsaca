-- =================================================================
-- Milsaca — índices de performance em notifications (auditoria 4.7)
-- Data: 2026-06-51 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- A tabela `notifications` (initial_schema.sql) só tinha índice em
-- user_id. A query quente da caixa de entrada filtra por user_id e
-- ordena por created_at desc; o badge de não-lidas filtra por
-- read_at is null. Sem índice composto/parcial isso vira seq scan +
-- sort por usuário — irrelevante no piloto, problema com milhares de
-- notificações por usuário.
--
-- Idempotente (if not exists). Apenas leitura/índices — sem mudança de
-- schema destrutiva.
-- =================================================================

-- Lista da caixa de entrada: where user_id = ? order by created_at desc
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Badge de não-lidas: where user_id = ? and read_at is null
-- Índice parcial = pequeno e rápido (só as não-lidas, que são minoria).
create index if not exists notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
