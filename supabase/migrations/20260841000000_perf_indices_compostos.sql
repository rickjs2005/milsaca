-- =================================================================
-- Milsaca — índices compostos (tenant + data) e cleanup de notificações
-- Data: 2026-08-41 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- Complementa a auditoria de performance:
--   - 20260821: 17 índices de FK (corretora_id, produtor_id, etc.) — simples.
--   - 20260822: RLS initplan otimizado.
-- Faltavam índices COMPOSTOS nas tabelas transacionais grandes que são
-- listadas por tenant e ordenadas por data desc. O índice simples só em
-- corretora_id obriga o Postgres a fazer sort em memória/disco depois do
-- index scan; o composto (corretora_id, created_at desc) entrega as linhas
-- já na ordem da listagem, eliminando o passo de sort.
--
-- Idempotente: todos os índices usam `if not exists`; a função usa
-- `create or replace`; o agendamento faz unschedule-if-exists antes.
--
-- NOTA SOBRE CONCURRENTLY: as migrations do Supabase rodam dentro de uma
-- transação, e `create index concurrently` NÃO pode rodar em transação.
-- Por isso usamos `create index` normal (toma lock ACCESS EXCLUSIVE de
-- escrita durante a construção). No piloto as tabelas são pequenas, então
-- o lock é instantâneo. Se no futuro alguma tabela crescer muito, criar o
-- índice via psql direto fora de transação com CONCURRENTLY.
-- =================================================================

-- -----------------------------------------------------------------
-- (a) Índices compostos (corretora_id, created_at desc)
-- -----------------------------------------------------------------
-- Coluna de data confirmada no remoto: todas as tabelas abaixo têm
-- `created_at timestamptz` e é por ela que as listagens ordenam
-- (order by created_at desc). `contratos` também tem `signed_at`, mas a
-- listagem padrão ordena por created_at; signed_at é filtro pontual, não
-- coberto aqui.

-- leads: lista da corretora (where corretora_id = ? order by created_at desc)
create index if not exists leads_corretora_created_idx
  on public.leads (corretora_id, created_at desc);

-- contratos
create index if not exists contratos_corretora_created_idx
  on public.contratos (corretora_id, created_at desc);

-- lotes
create index if not exists lotes_corretora_created_idx
  on public.lotes (corretora_id, created_at desc);

-- entregas
create index if not exists entregas_corretora_created_idx
  on public.entregas (corretora_id, created_at desc);

-- ofertas_comprador
create index if not exists ofertas_comprador_corretora_created_idx
  on public.ofertas_comprador (corretora_id, created_at desc);

-- produtor_pagamentos
create index if not exists produtor_pagamentos_corretora_created_idx
  on public.produtor_pagamentos (corretora_id, created_at desc);

-- notifications: o índice (user_id, created_at desc) JÁ EXISTE
-- (notifications_user_created_idx, criado em 20260651). Não recriar.

-- market_quotes: a PRIMARY KEY já é (source, symbol) e a tabela mantém
-- UMA linha por par source+symbol (upsert, sem histórico). Logo "última
-- cotação por fonte/símbolo" é resolvido diretamente pela PK — um índice
-- (source, symbol, fetched_at desc) seria redundante. Há também
-- market_quotes_quoted_at_idx (quoted_at desc) pra varreduras por data.
-- Portanto NENHUM índice novo em market_quotes.

-- -----------------------------------------------------------------
-- (b) Cleanup automático de notificações antigas
-- -----------------------------------------------------------------
-- Função que apaga notificações com mais de 90 dias. SECURITY DEFINER com
-- search_path fixo (padrão do projeto). NÃO é executada na migration —
-- só criada e agendada via cron.
create or replace function public.cleanup_old_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.notifications
   where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to authenticated;

comment on function public.cleanup_old_notifications is
  'Apaga notifications com created_at > 90 dias. Rodada por cron diariamente às 04:00 UTC. Retorna nº de linhas removidas.';

-- Agendamento diário às 04:00 UTC. Mesmo padrão das demais migrations de
-- cron (20260655): só agenda se o schema cron existir; unschedule
-- defensivo pra ser idempotente.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'milsaca-cleanup-notifications') then
      perform cron.unschedule('milsaca-cleanup-notifications');
    end if;
    perform cron.schedule(
      'milsaca-cleanup-notifications',
      '0 4 * * *',
      $cron$select public.cleanup_old_notifications();$cron$
    );
  else
    raise notice 'pg_cron não instalado; cleanup_old_notifications criado mas não agendado.';
  end if;
end $$;
