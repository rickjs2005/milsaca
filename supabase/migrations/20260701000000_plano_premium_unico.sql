-- =================================================================
-- Milsaca — Colapso dos planos pagos em um único "Premium"
-- Data: 2026-07-01
-- =================================================================
-- Decisão de produto: simplificar o catálogo pago pra UM único plano
-- "Premium" R$100/mês (1º mês grátis). Antes existiam dois pagos:
--   - 'corretora-pro'      R$299/mês
--   - 'corretora-premium'  "sob consulta"
--
-- Esta migration:
--   1) Reescreve 'corretora-premium' pra ser o ÚNICO plano pago:
--      nome "Premium", R$100 (10000 cents), mensal, ativo, com a lista
--      completa de features.
--   2) Desativa 'corretora-pro' (active=false) — não aparece mais no
--      catálogo, mas o registro fica pra histórico/integridade de FKs.
--   3) Re-aponta assinaturas vivas do 'corretora-pro' pro 'corretora-premium'
--      pra ninguém ficar órfão de plano.
--
-- NÃO toca em:
--   - 'corretora-fundador' (programa de fundadoras, grátis vitalício)
--   - settings founder_program_open / founder_slots_total
--   - 'gratuito' (plano grátis padrão)
--
-- Idempotente: todos os UPDATEs filtram por slug e podem rodar N vezes
-- sem efeito colateral. Se os slugs pagos não existirem no banco, viram
-- no-ops seguros.
-- =================================================================

-- 1) Premium passa a ser o único plano pago ---------------------------------
update public.plans
set
  name = 'Premium',
  price_cents = 10000,
  billing_period = 'monthly',
  active = true,
  description = 'Painel completo da corretora — R$100/mês, 1º mês grátis.',
  features = '[
    "Perfil público (/c/<slug>)",
    "Classificação COB ilimitada",
    "Templates de WhatsApp pra leads e lotes",
    "Cotações manuais da praça",
    "Leads ilimitados",
    "Lotes ilimitados",
    "Contratos + entregas + comissão",
    "Analytics comercial (conversão, mix, top compradores)",
    "Automação comercial (sugestões de follow-up)",
    "Múltiplos operadores na corretora",
    "Relatórios PDF + export CSV",
    "Suporte prioritário no WhatsApp",
    "API pública pra integração"
  ]'::jsonb,
  updated_at = now()
where slug = 'corretora-premium';

-- 2) Desativa o antigo plano Pro --------------------------------------------
update public.plans
set
  active = false,
  updated_at = now()
where slug = 'corretora-pro';

-- 3) Migra assinaturas vivas do Pro pro Premium -----------------------------
update public.subscriptions
set
  plan_id = (select id from public.plans where slug = 'corretora-premium'),
  updated_at = now()
where plan_id = (select id from public.plans where slug = 'corretora-pro');
