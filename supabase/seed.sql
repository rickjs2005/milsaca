-- =================================================================
-- Seed inicial do Milsaca (dev local) — auditoria 4.10
-- =================================================================
-- `supabase db reset` aplica as migrations e depois este arquivo.
--
-- Objetivo: dados MÍNIMOS e REPRODUZÍVEIS pra abrir o app local com
-- alguma coisa na tela (catálogo de corretoras + uma corretora demo
-- fixa), SEM depender de um usuário auth (que só existe após login).
--
-- O que NÃO entra aqui:
--   - Cotações fake: a REGRA DE OURO (lib/quotes-mode.ts) proíbe preço
--     inventado em modo `real`. Pra seedar cotações demo, use o
--     seed-remote.mjs com QUOTES_MODE=demo.
--   - Dados ligados a um usuário (profile/produtor/leads/contratos):
--     dependem de um auth.users que só existe após o primeiro login.
--     Isso é feito pelo seed-remote.mjs (que recebe/usa o email demo).
--
-- Tudo idempotente: on conflict do nothing. Rodar de novo não duplica.
-- =================================================================

-- Corretora demo FIXA (id determinístico pra referência em docs/scripts).
-- Espelha as corretoras que o seed-remote.mjs cria (Cooxupé/Carmo).
insert into public.corretoras (id, name, slug, city, state, phone, email, verified)
values
  (
    '00000000-0000-0000-0000-0000000c0001',
    'Cooxupé (demo)',
    'cooxupe',
    'Guaxupé',
    'MG',
    '+5535999999999',
    'contato@cooxupe.example',
    true
  ),
  (
    '00000000-0000-0000-0000-0000000c0002',
    'Carmo Coffees (demo)',
    'carmo-coffees',
    'Carmo de Minas',
    'MG',
    '+5535988887777',
    'contato@carmocoffees.example',
    true
  )
on conflict (slug) do nothing;

-- Catálogos (coffee_types/pracas/quote_sources) já vêm seedados pelas
-- migrations 20260613000000 e 20260614000000 — não re-seedamos aqui.
--
-- Para popular um produtor demo completo (profile multi-role, fazenda,
-- leads, contratos, lote+classificação COB e — em QUOTES_MODE=demo —
-- cotações), use o seed-remote.mjs com a CONTA DEMO documentada nele.
