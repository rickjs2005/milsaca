-- =================================================================
-- Milsaca — WIPE OPERACIONAL do Supabase remoto
-- =================================================================
-- Objetivo: remover TODOS os dados de tenant (incluindo a corretora
-- fictícia "gojo café" do piloto) antes de abrir pra corretoras reais.
--
-- Decisões do owner (2026-05-28):
--   - Wipe operacional TOTAL (não só o gojo).
--   - Apagar perfis + auth.users (recadastro do zero).
--   - MANTER cotações reais de mercado (market_quotes) + catálogos + config.
--
-- COMO RODAR: Supabase Studio -> SQL Editor (roda como postgres/superuser).
--   supabase-js NÃO faz TRUNCATE nem apaga auth.users em massa, por isso
--   este SQL é colado no Studio, não num script .mjs.
--
-- ⚠️ IRREVERSÍVEL. FAÇA BACKUP ANTES:
--   Dashboard -> Database -> Backups (confirmar PITR/snapshot recente).
--
-- Preserva (7 tabelas): market_quotes, coffee_types, pracas,
--   quote_sources, plans, platform_settings, notification_templates.
-- =================================================================


-- -----------------------------------------------------------------
-- PASSO 1 — PREVIEW (read-only): quanto será apagado. Rode e revise.
-- -----------------------------------------------------------------
select c.relname as tabela, c.reltuples::bigint as linhas_aprox
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname not in ('market_quotes','coffee_types','pracas',
                        'quote_sources','plans','platform_settings','notification_templates')
order by linhas_aprox desc;

select count(*) as usuarios_auth from auth.users;


-- -----------------------------------------------------------------
-- PASSO 2 — WIPE (transacional). Rode SÓ depois de revisar o Passo 1.
-- -----------------------------------------------------------------
begin;

do $$
declare
  alvo text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ')
    into alvo
  from pg_tables
  where schemaname = 'public'
    and tablename not in (
      'market_quotes','coffee_types','pracas',
      'quote_sources','plans','platform_settings','notification_templates'
    );

  if alvo is not null then
    execute 'truncate table ' || alvo || ' restart identity cascade';
  end if;
end $$;

-- Remove todos os logins (cascade limpa identities/sessions/mfa de auth).
delete from auth.users;

commit;


-- -----------------------------------------------------------------
-- PASSO 3 — VERIFICAÇÃO pós-wipe.
-- -----------------------------------------------------------------
-- Operacionais devem dar 0:
select 'corretoras'    as t, count(*) from corretoras
union all select 'profiles',      count(*) from profiles
union all select 'produtores',    count(*) from produtores
union all select 'leads',         count(*) from leads
union all select 'propostas',     count(*) from propostas
union all select 'subscriptions', count(*) from subscriptions
union all select 'auth.users',    count(*) from auth.users;

-- Preservadas devem manter contagem (catálogos seedados por migration):
select 'market_quotes'     as t, count(*) from market_quotes
union all select 'coffee_types',      count(*) from coffee_types    -- 7
union all select 'pracas',            count(*) from pracas          -- 10
union all select 'quote_sources',     count(*) from quote_sources   -- 6
union all select 'plans',             count(*) from plans
union all select 'platform_settings', count(*) from platform_settings;

-- Programa de Fundadoras intacto -> esperado {open:true, total:5, used:0}:
select * from founder_program_status();
