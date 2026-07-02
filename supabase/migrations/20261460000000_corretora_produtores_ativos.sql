-- =================================================================
-- Milsaca — count(distinct produtores ativos) no banco (E2)
-- =================================================================
-- O dashboard da corretora calculava "produtores ativos" puxando TODOS os
-- leads (não arquivados) + TODOS os contratos da corretora só pra deduplicar
-- os produtor_id num Set em memória (cresce linear com o tamanho do tenant,
-- a cada render do home). Esta função faz o count(distinct) no Postgres.
--
-- Lógica espelha 1:1 a do app (loadDashboardKpis):
--   produtores ativos = distintos de
--     leads    where status <> 'arquivado' and produtor_id is not null
--     UNION
--     contratos where produtor_id is not null
--
-- SECURITY INVOKER (default): roda com as permissões do chamador, então a
-- RLS de leads/contratos já restringe às linhas da própria corretora — passar
-- um corretora_id alheio retorna 0 (sem vazamento). O filtro por
-- corretora_id é redundante com a RLS mas mantém a intenção explícita.
--
-- Idempotente: create or replace.
-- =================================================================

create or replace function public.corretora_produtores_ativos(
  p_corretora_id uuid
)
returns integer
language sql
stable
as $$
  select count(distinct produtor_id)::int
  from (
    select produtor_id
      from public.leads
     where corretora_id = p_corretora_id
       and produtor_id is not null
       and status <> 'arquivado'
    union
    select produtor_id
      from public.contratos
     where corretora_id = p_corretora_id
       and produtor_id is not null
  ) s;
$$;

revoke all on function public.corretora_produtores_ativos(uuid) from public;
grant execute on function public.corretora_produtores_ativos(uuid) to authenticated;

comment on function public.corretora_produtores_ativos(uuid) is
  'Conta produtores distintos com negócio ativo (leads não-arquivados + contratos) de uma corretora. SECURITY INVOKER: RLS escopa por corretora. Substitui a dedup em memória do dashboard (E2).';
