-- =================================================================
-- Milsaca — Admin Plataforma: settings, eventos, comunicação, regras
-- Data: 2026-05-21
-- =================================================================
-- Cria a infraestrutura pro admin operar como "cérebro da plataforma"
-- em vez de mesa de operação manual. Inclui:
--   1. platform_settings        — configurações chave/valor
--   2. system_events            — fila/log de eventos automáticos
--   3. notification_templates   — templates (whatsapp/email)
--   4. message_dispatches       — histórico de envios externos
--   5. lead_distribution_rules  — regras de roteamento de leads
--
-- Nota: NÃO conflita com a tabela `notifications` legacy (caixa
-- de entrada interna do produtor/corretora). Por isso o nome
-- `message_dispatches` pra log de envios externos.
--
-- Idempotente: usa IF NOT EXISTS + DROP POLICY IF EXISTS + ON CONFLICT.
-- =================================================================

-- -----------------------------------------------------------------
-- 1. platform_settings
-- -----------------------------------------------------------------
create table if not exists public.platform_settings (
  key           text primary key,
  value         jsonb not null default 'null'::jsonb,
  description   text,
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin_all on public.platform_settings;
create policy platform_settings_admin_all
  on public.platform_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_platform_settings on public.platform_settings;
create trigger tg_set_updated_at_platform_settings
  before update on public.platform_settings
  for each row execute function public.tg_set_updated_at();

insert into public.platform_settings (key, value, description) values
  ('trial_days', '30', 'Dias de trial automático ao aprovar corretora'),
  ('public_signup_produtor', 'true', 'Cadastro público de produtor habilitado'),
  ('public_signup_corretora', 'true', 'Cadastro público de corretora habilitado (requer aprovação)'),
  ('manual_approval_corretora', 'true', 'Aprovação manual obrigatória pra corretora'),
  ('support_whatsapp', '"5533999999999"', 'WhatsApp oficial do suporte (E.164 sem +)'),
  ('support_email', '"contato@milsaca.app"', 'E-mail oficial do suporte'),
  ('whatsapp_provider', '"wa_me"', 'Provider WhatsApp: wa_me | meta_cloud'),
  ('cotacoes_provider', '"cepea_scrape"', 'Provider de cotações: cepea_scrape | cepea_api'),
  ('region_default', '"MG"', 'UF padrão no catálogo público'),
  ('lead_distribution_mode', '"manual"', 'manual | round_robin | smart'),
  ('lead_max_per_corretora_solo', '20', 'Limite mensal de leads pra plano Solo'),
  ('lead_max_per_corretora_pro', '200', 'Limite mensal de leads pra plano Pro')
on conflict (key) do nothing;

-- -----------------------------------------------------------------
-- 2. system_events — fila/log unificada de eventos automáticos
-- -----------------------------------------------------------------
create table if not exists public.system_events (
  id            uuid primary key default extensions.uuid_generate_v4(),
  kind          text not null,
  status        text not null
    check (status in ('pending','processing','success','failed','skipped'))
    default 'pending',
  payload       jsonb not null default '{}'::jsonb,
  error         text,
  attempts      integer not null default 0,
  scheduled_at  timestamptz,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.system_events enable row level security;

create index if not exists system_events_kind_status_idx
  on public.system_events (kind, status, created_at desc);
create index if not exists system_events_status_pending_idx
  on public.system_events (status, scheduled_at)
  where status in ('pending','processing');

drop policy if exists system_events_admin_read on public.system_events;
create policy system_events_admin_read
  on public.system_events
  for select
  using (public.is_admin());

drop policy if exists system_events_admin_write on public.system_events;
create policy system_events_admin_write
  on public.system_events
  for all
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.system_events is
  'Fila/log unificada de eventos automáticos (cron, integrações, jobs). Acessível só pra admin via /admin/fila-eventos e /admin/automacoes.';

-- -----------------------------------------------------------------
-- 3. notification_templates
-- -----------------------------------------------------------------
create table if not exists public.notification_templates (
  id          uuid primary key default extensions.uuid_generate_v4(),
  channel     text not null check (channel in ('whatsapp','email')),
  kind        text not null,
  name        text not null,
  body        text not null,
  subject     text,
  variables   jsonb not null default '[]'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (channel, kind)
);
alter table public.notification_templates enable row level security;

drop policy if exists notif_templates_admin_all on public.notification_templates;
create policy notif_templates_admin_all
  on public.notification_templates
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_notif_templates on public.notification_templates;
create trigger tg_set_updated_at_notif_templates
  before update on public.notification_templates
  for each row execute function public.tg_set_updated_at();

insert into public.notification_templates (channel, kind, name, body, subject, variables) values
  ('whatsapp', 'lead_novo',
   'Lead novo — corretora',
   'Olá {{corretora_nome}}, há um novo produtor interessado: {{produtor_nome}} de {{cidade}}/{{uf}}. Sacas: {{sacas}}. Responda dentro de 2h pra aumentar chance de fechamento.',
   null,
   '["corretora_nome","produtor_nome","cidade","uf","sacas"]'::jsonb),
  ('email', 'corretora_aprovada',
   'Corretora aprovada — boas-vindas',
   'Olá {{nome}}, sua corretora {{corretora}} foi aprovada no Milsaca. Trial de 30 dias começou — aproveite pra cadastrar lotes e fechar primeiros contratos.',
   'Sua corretora foi aprovada no Milsaca',
   '["nome","corretora"]'::jsonb),
  ('email', 'trial_expira_3d',
   'Trial expirando em 3 dias',
   'Olá {{nome}}, seu trial Milsaca expira em {{dias}} dias. Pra continuar usando, escolha um plano em /painel/corretora/perfil.',
   'Seu trial Milsaca expira em breve',
   '["nome","dias"]'::jsonb),
  ('email', 'assinatura_vencida',
   'Assinatura vencida',
   'Olá {{nome}}, sua assinatura Milsaca venceu. Acesso ao painel está limitado até regularizar.',
   'Sua assinatura Milsaca venceu',
   '["nome"]'::jsonb),
  ('whatsapp', 'lead_parado_3d',
   'Lead parado há 3 dias',
   'Oi {{corretora_nome}}, o lead com {{produtor_nome}} está sem mensagem há 3 dias. Vale dar um toque ou marcar como perdido.',
   null,
   '["corretora_nome","produtor_nome"]'::jsonb)
on conflict (channel, kind) do nothing;

-- -----------------------------------------------------------------
-- 4. message_dispatches — histórico de envios externos
-- -----------------------------------------------------------------
-- IMPORTANTE: NÃO usar nome `notifications` — já existe tabela
-- legacy com esse nome (caixa de entrada interna do produtor/
-- corretora). `message_dispatches` é mais semântico mesmo:
-- registra cada DESPACHO (WhatsApp/e-mail) feito pelo sistema.
-- -----------------------------------------------------------------
create table if not exists public.message_dispatches (
  id            uuid primary key default extensions.uuid_generate_v4(),
  template_id   uuid references public.notification_templates(id) on delete set null,
  channel       text not null check (channel in ('whatsapp','email')),
  recipient     text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null
    check (status in ('pending','sent','failed','retried'))
    default 'pending',
  error         text,
  lead_id       uuid,
  corretora_id  uuid references public.corretoras(id) on delete set null,
  profile_id    uuid references public.profiles(id) on delete set null,
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.message_dispatches enable row level security;

create index if not exists message_dispatches_status_idx
  on public.message_dispatches (status, created_at desc);
create index if not exists message_dispatches_corretora_idx
  on public.message_dispatches (corretora_id, created_at desc)
  where corretora_id is not null;

drop policy if exists message_dispatches_admin_read on public.message_dispatches;
create policy message_dispatches_admin_read
  on public.message_dispatches
  for select
  using (public.is_admin());

drop policy if exists message_dispatches_admin_write on public.message_dispatches;
create policy message_dispatches_admin_write
  on public.message_dispatches
  for all
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.message_dispatches is
  'Histórico de envios externos (WhatsApp/e-mail) feitos pelo sistema. NÃO confundir com `notifications` (caixa interna do app).';

-- -----------------------------------------------------------------
-- 5. lead_distribution_rules
-- -----------------------------------------------------------------
create table if not exists public.lead_distribution_rules (
  id          uuid primary key default extensions.uuid_generate_v4(),
  name        text not null,
  priority    integer not null default 100,
  conditions  jsonb not null default '{}'::jsonb,
  action      text not null
    check (action in ('match','skip','fallback_support'))
    default 'match',
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.lead_distribution_rules enable row level security;

create index if not exists lead_rules_priority_idx
  on public.lead_distribution_rules (priority asc, active);

drop policy if exists lead_rules_admin_all on public.lead_distribution_rules;
create policy lead_rules_admin_all
  on public.lead_distribution_rules
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists tg_set_updated_at_lead_rules on public.lead_distribution_rules;
create trigger tg_set_updated_at_lead_rules
  before update on public.lead_distribution_rules
  for each row execute function public.tg_set_updated_at();

insert into public.lead_distribution_rules (name, priority, conditions, action, notes)
select * from (values
  ('Bloquear corretora vencida ou inativa', 10,
   '{"corretora_status_in": ["past_due","expired","canceled","inactive"]}'::jsonb,
   'skip',
   'Corretora sem assinatura ativa não recebe lead. Avalia ANTES de qualquer match.'),
  ('Match por região + tipo de café', 50,
   '{"require_region_match": true, "require_specie_match": true}'::jsonb,
   'match',
   'Corretora precisa atender região do produtor E aceitar a espécie (arábica/conillon).'),
  ('Fallback — sem corretora elegível', 999,
   '{}'::jsonb,
   'fallback_support',
   'Quando nenhuma corretora bate todas as regras, lead vai pra lista de espera + notifica suporte.')
) as seed(name, priority, conditions, action, notes)
where not exists (select 1 from public.lead_distribution_rules);

-- =================================================================
comment on table public.platform_settings is
  'Configurações chave/valor da plataforma. Lidas pelo runtime + editáveis em /admin/configuracoes.';
comment on table public.notification_templates is
  'Templates de mensagens (WhatsApp/e-mail) com placeholders {{var}}. Render feito no momento do envio.';
comment on table public.lead_distribution_rules is
  'Regras de roteamento de leads. Avaliadas em ordem de priority asc. action=skip bloqueia, action=match valida, action=fallback_support manda pra lista de espera.';
