-- =================================================================
-- Milsaca — F0 mensageria: mapeamento p/ templates Meta (WhatsApp HSM)
-- Data: 2026-07-02 (timestamp único — ver docs/milsaca/convencao-migrations.md)
-- =================================================================
-- A WhatsApp Cloud API só aceita texto livre dentro da janela de 24h
-- aberta pelo USUÁRIO. Toda notificação iniciada pela plataforma (nosso
-- caso: nudges, alertas, digests) exige TEMPLATE pré-aprovado pela Meta
-- (HSM), enviado como type:"template" com parâmetros POSICIONAIS.
--
-- Esta migration adiciona `meta_template_name` em notification_templates:
--   - NULL  → worker envia type:"text" (só funciona em janela de 24h;
--             fora dela a Meta responde 131047 → falha permanente).
--   - Nome  → worker envia type:"template" com os parâmetros na ORDEM
--             da coluna `variables` (jsonb array). A ordem de `variables`
--             passa a ser CONTRATO: {{1}} = variables[0], {{2}} = [1]...
--             NÃO reordenar `variables` sem re-registrar o template na Meta.
--
-- Convenção de nome: 'milsaca_' || kind (minúsculo/underscore, padrão Meta).
-- O template correspondente precisa existir APROVADO na Meta com o corpo
-- numerado equivalente — ver docs/milsaca/meta-templates-whatsapp.md.
-- Template não aprovado/inexistente → erro 4xx do provider → dispatch
-- 'failed' visível em /admin/fila-eventos (comportamento intencional).
--
-- Idempotente: add column if not exists; seed só preenche onde está NULL.
-- Expand-only (nenhuma coluna removida/renomeada) — mobile não é afetado.
-- =================================================================

alter table public.notification_templates
  add column if not exists meta_template_name text;

comment on column public.notification_templates.meta_template_name is
  'Nome do template aprovado na Meta (WhatsApp Cloud API). NULL = envio type:"text" (só janela 24h). Parâmetros posicionais seguem a ORDEM do array `variables` — não reordenar sem re-registrar na Meta.';

-- Seed: mapeia todos os templates whatsapp existentes pra 'milsaca_<kind>'.
-- Só onde ainda é NULL (idempotente e não sobrescreve ajuste manual do admin).
update public.notification_templates
   set meta_template_name = 'milsaca_' || kind
 where channel = 'whatsapp'
   and meta_template_name is null;
