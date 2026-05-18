-- =================================================================
-- Milsaca — tracking de leads via WhatsApp
-- Data: 2026-05-18
-- =================================================================
-- Hoje o botão "Falar no WhatsApp" do produtor abre wa.me direto sem
-- deixar rastro. Sem isso, é impossível medir conversão de catálogo
-- → contato → contrato.
--
-- Esta tabela registra o CLIQUE (intent to contact), antes do
-- redirect. Não captura a conversa do WhatsApp (fora do escopo).
--
-- Privacidade:
--   - IP não é armazenado em cru; só hash com salt fixo de instalação
--   - User-agent armazenado pra distinguir bots/mobile/desktop
--   - produtor_id nullable: catálogo logado seta; rota anon (se houver
--     no futuro) deixa null
-- =================================================================

create type public.whatsapp_lead_source as enum (
  'catalogo_corretoras',
  'perfil_corretora',
  'home_publica',
  'outro'
);

create table public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  produtor_id uuid references public.profiles(id) on delete set null,
  contato_email text,
  source public.whatsapp_lead_source not null default 'catalogo_corretoras',
  message text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index whatsapp_leads_corretora_idx
  on public.whatsapp_leads (corretora_id, created_at desc);
create index whatsapp_leads_produtor_idx
  on public.whatsapp_leads (produtor_id)
  where produtor_id is not null;
create index whatsapp_leads_created_idx
  on public.whatsapp_leads (created_at desc);

alter table public.whatsapp_leads enable row level security;

-- INSERT: authenticated insere; produtor_id (quando preenchido) tem
-- que bater com auth.uid() pra não fingir lead de outro user.
create policy "whatsapp_leads_self_insert"
  on public.whatsapp_leads
  for insert
  to authenticated
  with check (
    produtor_id is null or produtor_id = auth.uid()
  );

-- SELECT: corretora dona vê leads dela; admin vê tudo.
-- Produtor NÃO vê (são leads pra corretora, não pra ele).
create policy "whatsapp_leads_corretora_read"
  on public.whatsapp_leads
  for select
  to authenticated
  using (
    corretora_id = public.current_corretora()
    or public.is_admin()
  );

-- DELETE/UPDATE: só admin (raro precisar — auditoria preserva)
create policy "whatsapp_leads_admin_write"
  on public.whatsapp_leads
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.whatsapp_leads is
  'Cliques do botão "Falar no WhatsApp" em corretoras. Registra intent antes do redirect.';
