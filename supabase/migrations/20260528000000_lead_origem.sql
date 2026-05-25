-- =================================================================
-- Milsaca — origem do lead (rastreio de canal)
-- Data: 2026-05-25
-- =================================================================
-- O painel da corretora exibe analytics por "origem dos leads"
-- (Fase 7 do redesign). Sem essa coluna, o bloco mostrava só uma
-- segmentação pobre (produtor real vs contato sombra). Agora dá pra
-- saber por qual canal o lead chegou.
--
-- Valores:
--   - whatsapp   — produtor chegou pela conversa direta no WhatsApp
--                  (corretor clicou no botão "Falar no WhatsApp" do
--                  cadastro ou lead chegou via integração futura)
--   - formulario — produtor preencheu form de contato no perfil público
--                  da corretora (/c/[slug] no futuro)
--   - vitrine    — produtor veio do catálogo público da Milsaca
--                  (/mercado-do-cafe)
--   - manual     — corretor cadastrou na mão (default pra leads existentes
--                  ou contatos criados via /painel/corretora/produtores)
--
-- Coluna nullable porque leads existentes não tinham origem; novos
-- leads vão preencher via UI. Index parcial pra acelerar agrupamentos
-- por origem sem inflar lista de leads sem origem.
-- =================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_origem') then
    create type public.lead_origem as enum (
      'whatsapp',
      'formulario',
      'vitrine',
      'manual'
    );
  end if;
end $$;

alter table public.leads
  add column if not exists origem public.lead_origem;

create index if not exists leads_origem_idx
  on public.leads (origem)
  where origem is not null;

comment on column public.leads.origem is
  'Canal pelo qual o lead chegou. Null = legado ou origem desconhecida.';
