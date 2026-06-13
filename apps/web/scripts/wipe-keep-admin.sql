-- =================================================================
-- Milsaca — WIPE mantendo o(s) ADMIN (Supabase remoto)
-- =================================================================
-- Variante do wipe-operacional.sql que PRESERVA a(s) conta(s) admin.
-- Usado em 2026-06-13 pra zerar a demo mantendo milsaca2026@gmail.com.
--
-- Decisão (owner, 2026-06-13): apagar TUDO menos o admin — dados
-- operacionais + todos os logins não-admin — antes de abrir pra
-- corretoras reais, sem precisar recriar a conta de plataforma.
--
-- Preserva:
--   - 7 catálogos/config: market_quotes, coffee_types, pracas,
--     quote_sources, plans, platform_settings, notification_templates.
--   - Admin(s): linhas de profiles / app_admins / auth.users cujo id
--     está em public.app_admins (auto-detectado — não hardcoda UUID).
-- Apaga: todo o resto (dados de tenant/operacional + logins não-admin).
--
-- COMO RODAR: Supabase Studio -> SQL Editor (roda como postgres).
-- ⚠️ IRREVERSÍVEL. Faça backup antes (Dashboard -> Database -> Backups).
--
-- Por que DELETE + replica (e não TRUNCATE como o wipe-operacional):
--   pra preservar linhas específicas (o admin) sem que TRUNCATE CASCADE
--   derrube public.profiles via FK profiles.corretora_id -> corretoras.
--   session_replication_role=replica desabilita FK/triggers, então dá
--   pra DELETE em qualquer ordem sem restrict/cascade surpresa.
--   O DELETE de auth.users fica FORA da transação replica, em modo
--   normal, pra o cascade do Supabase limpar auth.identities/sessions/mfa.
-- =================================================================


-- -----------------------------------------------------------------
-- PASSO 1 — PREVIEW (read-only): o que será apagado. Rode e revise.
-- -----------------------------------------------------------------
select c.relname as tabela, c.reltuples::bigint as linhas_aprox
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname not in ('market_quotes','coffee_types','pracas',
                        'quote_sources','plans','platform_settings','notification_templates')
order by linhas_aprox desc;

-- logins que serão removidos (todos que NÃO estão em app_admins):
select email from auth.users
where id not in (select user_id from public.app_admins);


-- -----------------------------------------------------------------
-- PASSO 2 — WIPE dos dados public + perfis não-admin (transacional).
--           Rode SÓ depois de revisar o Passo 1.
-- -----------------------------------------------------------------
begin;
set local session_replication_role = replica;  -- desabilita FK + triggers

-- apaga toda tabela public exceto os 7 catálogos/config + profiles + app_admins
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in (
        'market_quotes','coffee_types','pracas','quote_sources',
        'plans','platform_settings','notification_templates',
        'profiles','app_admins'
      )
  loop
    execute format('delete from public.%I', r.tablename);
  end loop;
end $$;

-- perfis: mantém só os admins
delete from public.profiles
 where id not in (select user_id from public.app_admins);

-- admin não é tenant: garante perfil limpo (sem corretora vinculada/órfã)
update public.profiles
   set corretora_id = null, corretora_role = null
 where id in (select user_id from public.app_admins);

commit;


-- -----------------------------------------------------------------
-- PASSO 3 — apaga logins não-admin (modo NORMAL: cascade limpa auth.*)
-- -----------------------------------------------------------------
delete from auth.users
 where id not in (select user_id from public.app_admins);


-- -----------------------------------------------------------------
-- PASSO 4 — (opcional) Storage. ⚠️ deletar storage.objects aqui remove
-- a metadata/listagem mas NÃO apaga o blob no backend (fica órfão).
-- Pra apagar o arquivo de fato, use a Storage API com a secret key:
--   supabase.storage.from(<bucket>).remove([<paths>])
-- Descomente pra limpar a listagem (buckets em storage.buckets ficam):
-- delete from storage.objects;


-- -----------------------------------------------------------------
-- PASSO 5 — VERIFICAÇÃO pós-wipe.
-- -----------------------------------------------------------------
select 'auth.users (=nº de admins)' as t, count(*) n from auth.users
union all select 'profiles (=nº de admins)', count(*) from public.profiles
union all select 'app_admins', count(*) from public.app_admins
union all select 'corretoras (0)', count(*) from public.corretoras
union all select 'produtores (0)', count(*) from public.produtores
union all select 'leads (0)', count(*) from public.leads
union all select 'contratos (0)', count(*) from public.contratos;

-- catálogos preservados:
select 'coffee_types' t, count(*) n from public.coffee_types
union all select 'pracas', count(*) from public.pracas
union all select 'quote_sources', count(*) from public.quote_sources
union all select 'plans', count(*) from public.plans;

-- Programa de Fundadoras intacto -> esperado {open:true, total:5, used:0}:
select * from founder_program_status();
