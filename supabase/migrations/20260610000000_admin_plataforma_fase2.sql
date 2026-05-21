-- =================================================================
-- Milsaca — Fase 2 da Plataforma: funções de automação + tabelas
-- Data: 2026-05-21
-- =================================================================
-- Liga a lógica que ficou em "pending_setup" no /admin/automacoes:
--   - SQL functions pra expirar trials/assinaturas (idempotente,
--     SECURITY DEFINER pra rodar sem RLS)
--   - SQL functions pra criar nudges (lembretes) em message_dispatches
--   - SQL function pra reprocessar system_event
--   - Tabela lead_waitlist (fallback quando nenhuma corretora match)
--   - Tabela moderation_reports (denúncias)
--
-- Cada função registra um system_event com o resultado, pra que o
-- admin veja em /admin/fila-eventos. Não exige Supabase CLI nem edge
-- functions Deno — tudo roda dentro do banco.
--
-- Idempotente: CREATE OR REPLACE FUNCTION + IF NOT EXISTS em tabelas.
-- =================================================================

-- -----------------------------------------------------------------
-- helper: registra evento de sistema sem expor o caller a INSERT direto
-- -----------------------------------------------------------------
create or replace function public.fn_log_system_event(
  p_kind text,
  p_status text,
  p_payload jsonb default '{}'::jsonb,
  p_error text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.system_events (kind, status, payload, error, processed_at)
  values (p_kind, p_status, p_payload, p_error,
          case when p_status in ('success','failed','skipped') then now() else null end)
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.fn_log_system_event is
  'Helper interno pra outras SQL functions registrarem eventos no system_events sem expor INSERT direto.';

-- -----------------------------------------------------------------
-- 1. expire_trials — trial cujo trial_ends_at já passou → expired
-- -----------------------------------------------------------------
create or replace function public.expire_trials() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.subscriptions
       set status = 'expired'
     where status = 'trial'
       and trial_ends_at is not null
       and trial_ends_at < now()
    returning id
  )
  select count(*) into v_count from updated;

  perform public.fn_log_system_event(
    'cron.expire-trials.run',
    'success',
    jsonb_build_object('expired_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.expire-trials.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 2. expire_subscriptions — active cujo current_period_end passou → past_due
-- -----------------------------------------------------------------
create or replace function public.expire_subscriptions() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.subscriptions
       set status = 'past_due'
     where status = 'active'
       and current_period_end is not null
       and current_period_end < now()
    returning id
  )
  select count(*) into v_count from updated;

  perform public.fn_log_system_event(
    'cron.expire-subscriptions.run',
    'success',
    jsonb_build_object('past_due_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.expire-subscriptions.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 3. nudge_trial_ending — trial expirando em 3 dias → message_dispatch
-- -----------------------------------------------------------------
create or replace function public.nudge_trial_ending() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_count integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'email' and kind = 'trial_expira_3d' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-trial-ending.run',
      'skipped',
      jsonb_build_object('reason', 'template_not_found'),
      'Template email/trial_expira_3d não encontrado ou inativo.'
    );
    return 0;
  end if;

  with subs as (
    select s.id, s.corretora_id, s.trial_ends_at, c.email, c.name as corretora_name
      from public.subscriptions s
      join public.corretoras c on c.id = s.corretora_id
     where s.status = 'trial'
       and s.trial_ends_at between now() + interval '2 days' and now() + interval '4 days'
       and c.email is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.corretora_id = s.corretora_id
            and d.created_at > now() - interval '6 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id)
      select v_template_id, 'email', subs.email,
             jsonb_build_object(
               'nome', subs.corretora_name,
               'dias', greatest(0, extract(day from subs.trial_ends_at - now())::int)
             ),
             subs.corretora_id
        from subs
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-trial-ending.run',
    'success',
    jsonb_build_object('dispatched_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-trial-ending.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 4. nudge_stale_leads — leads em_negociacao parados há 3+ dias
-- -----------------------------------------------------------------
create or replace function public.nudge_stale_leads() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template_id uuid;
  v_count integer := 0;
begin
  select id into v_template_id
    from public.notification_templates
   where channel = 'whatsapp' and kind = 'lead_parado_3d' and active = true
   limit 1;

  if v_template_id is null then
    perform public.fn_log_system_event(
      'cron.nudge-stale-leads.run',
      'skipped',
      jsonb_build_object('reason', 'template_not_found')
    );
    return 0;
  end if;

  -- Procura leads com status em_negociacao sem evento (lead_events) ou update
  -- nos últimos 3 dias. O "last touched" é o max(updated_at) ou created_at.
  -- Mandamos WhatsApp pra corretora dona do lead.
  with stale as (
    select l.id as lead_id,
           l.corretora_id,
           c.phone as corretora_phone,
           c.name  as corretora_name,
           coalesce(p.full_name, 'produtor') as produtor_nome
      from public.leads l
      join public.corretoras c on c.id = l.corretora_id
      left join public.profiles p on p.id = l.produtor_id
     where l.status = 'em_negociacao'
       and coalesce(l.updated_at, l.created_at) < now() - interval '3 days'
       and c.phone is not null
       and not exists (
         select 1 from public.message_dispatches d
          where d.template_id = v_template_id
            and d.lead_id = l.id
            and d.created_at > now() - interval '6 days'
       )
  ),
  inserted as (
    insert into public.message_dispatches (template_id, channel, recipient, payload, corretora_id, lead_id)
      select v_template_id, 'whatsapp', stale.corretora_phone,
             jsonb_build_object(
               'corretora_nome', stale.corretora_name,
               'produtor_nome', stale.produtor_nome
             ),
             stale.corretora_id,
             stale.lead_id
        from stale
    returning id
  )
  select count(*) into v_count from inserted;

  perform public.fn_log_system_event(
    'cron.nudge-stale-leads.run',
    'success',
    jsonb_build_object('dispatched_count', v_count)
  );

  return v_count;
exception when others then
  perform public.fn_log_system_event(
    'cron.nudge-stale-leads.run',
    'failed',
    '{}'::jsonb,
    sqlerrm
  );
  raise;
end;
$$;

-- -----------------------------------------------------------------
-- 5. reprocess_system_event — admin clica e marca evento como pending
-- -----------------------------------------------------------------
create or replace function public.reprocess_system_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode reprocessar eventos.';
  end if;

  update public.system_events
     set status = 'pending',
         error = null,
         attempts = 0,
         processed_at = null,
         scheduled_at = now()
   where id = p_event_id
     and status in ('failed','skipped');
end;
$$;

-- Conceder execução pra authenticated (admin é checado dentro da função).
grant execute on function public.expire_trials() to authenticated;
grant execute on function public.expire_subscriptions() to authenticated;
grant execute on function public.nudge_trial_ending() to authenticated;
grant execute on function public.nudge_stale_leads() to authenticated;
grant execute on function public.reprocess_system_event(uuid) to authenticated;

-- -----------------------------------------------------------------
-- 6. lead_waitlist — fallback quando nenhuma corretora match
-- -----------------------------------------------------------------
create table if not exists public.lead_waitlist (
  id            uuid primary key default extensions.uuid_generate_v4(),
  source        text not null,
  payload       jsonb not null default '{}'::jsonb,
  region        text,
  specie        text,
  contact       text,
  status        text not null
    check (status in ('pending','contacted','converted','dropped'))
    default 'pending',
  notes         text,
  handled_by    uuid references public.profiles(id) on delete set null,
  handled_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.lead_waitlist enable row level security;

create index if not exists lead_waitlist_status_idx
  on public.lead_waitlist (status, created_at desc);

drop policy if exists lead_waitlist_admin_all on public.lead_waitlist;
create policy lead_waitlist_admin_all
  on public.lead_waitlist
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_lead_waitlist on public.lead_waitlist;
create trigger tg_set_updated_at_lead_waitlist
  before update on public.lead_waitlist
  for each row execute function public.tg_set_updated_at();

comment on table public.lead_waitlist is
  'Lista de espera quando nenhuma corretora match nas lead_distribution_rules. Suporte Milsaca trata manualmente.';

-- -----------------------------------------------------------------
-- 7. moderation_reports — denúncias
-- -----------------------------------------------------------------
create table if not exists public.moderation_reports (
  id            uuid primary key default extensions.uuid_generate_v4(),
  target_type   text not null check (target_type in ('corretora','produtor','lead','message')),
  target_id     uuid not null,
  reporter_id   uuid references public.profiles(id) on delete set null,
  reason        text not null,
  details       text,
  status        text not null
    check (status in ('open','reviewing','dismissed','actioned'))
    default 'open',
  resolution    text,
  resolved_by   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.moderation_reports enable row level security;

create index if not exists moderation_reports_status_idx
  on public.moderation_reports (status, created_at desc);
create index if not exists moderation_reports_target_idx
  on public.moderation_reports (target_type, target_id);

drop policy if exists moderation_reports_admin_all on public.moderation_reports;
create policy moderation_reports_admin_all
  on public.moderation_reports
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_moderation_reports on public.moderation_reports;
create trigger tg_set_updated_at_moderation_reports
  before update on public.moderation_reports
  for each row execute function public.tg_set_updated_at();

comment on table public.moderation_reports is
  'Denúncias contra corretoras/produtores/leads/mensagens. Open → reviewing → dismissed|actioned. Reporter pode ser null pra denúncia anônima/externa.';

-- =================================================================
-- Done. Verificação rápida via:
--   select expire_trials();          -- vai criar 1 system_event success
--   select * from public.system_events order by created_at desc limit 5;
-- =================================================================
