---
title: Auditoria de Responsividade — Painel Web Milsaca
data: 2026-05-29
tipo: auditoria-ui
alvo: navegador mobile ~375px (Tailwind v3.4.17 mobile-first)
metodo: análise estática de markup/classes (3 frentes paralelas)
---

# Responsividade do painel web — Milsaca

> Lançamento é **web** (corretora e produtor usam no navegador, inclusive
> celular). Alvo ~375px. Severidade: 🔴 inutilizável · 🟠 ruim · 🟡 polish.

## Veredito

O problema **não está espalhado** — está concentrado em **2 shells** e **~5
tabelas**. Os componentes compartilhados (`DataTable`, `PageHeader`, `kpi-card`,
forms, dialogs) **já são responsivos**, e a maioria das páginas usa o padrão
certo (`grid-cols-1 sm:grid-cols-2`, `flex-wrap`). E há **referência pronta no
próprio repo**: o **`AdminShell`** já resolve o mobile com hambúrguer + drawer.

## 🔴 Crítico — bloqueia TODAS as telas no celular

**Os shells da corretora e do produtor têm sidebar fixa `w-64` sem versão mobile.**
- Corretora: `painel/corretora/_components/sidebar.tsx:146` (`<aside ... w-64 shrink-0>`) + `painel/corretora/layout.tsx:62-71`.
- Produtor: `painel/produtor/_components/sidebar.tsx:56` + `painel/produtor/layout.tsx:29-37`.
- **Sintoma:** a sidebar come 256px de 375px (~68%), sobra ~119px pro conteúdo (ainda menos com `px-8`). Não há hambúrguer/drawer (confirmado por grep: zero `lg:hidden`/`Sheet`/drawer nesses diretórios). **Todo o painel fica inutilizável no celular.**
- **Fix:** portar o padrão do **`admin/(panel)/_components/admin-shell.tsx`** (sidebar `hidden lg:flex` + drawer `fixed` toggleável + header mobile com botão Menu + trava de scroll + fecha ao trocar rota). É a maior alavanca isolada.

## 🟠 Tabelas largas que cortam conteúdo (sem scroll)

Wrapper `overflow-hidden` em volta de `<table className="w-full">` **clipa** o que
passa de 375px (em vez de rolar). Fix trivial: `overflow-hidden` → `overflow-x-auto`
(padrão já correto em `contratos/page.tsx:143`). Telas:
- `painel/corretora/entregas/page.tsx:127` (6 colunas)
- `painel/corretora/compradores/page.tsx:77` (6 colunas, CNPJ largo)
- `painel/corretora/leads-whatsapp/page.tsx:182` (+ `whitespace-nowrap` na data)
- `painel/corretora/analytics/page.tsx:303` (Top compradores — **sem nenhum** overflow; `CardContent p-0` → `overflow-x-auto p-0`)
- (ideal: migrar essas 4 pro `DataTable` compartilhado, que já dá cards no mobile)

## 🟠 Padding horizontal grande no mobile

Ambos os layouts usam `px-8 py-10` fixo (`corretora/layout.tsx:71`,
`produtor/layout.tsx:37`) = 64px perdidos em 375px. Fix:
`px-4 py-6 sm:px-6 lg:px-8 lg:py-10` (igual ao admin).

## 🟠 Público — laudo (`/laudos/[id]`, mais compartilhado por QR)
- `laudos/[id]/page.tsx:150`: resultado `text-3xl` + botão "Baixar PDF" na mesma
  linha sem wrap → `flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between` + título `text-2xl sm:text-3xl`.
- `laudos/[id]/page.tsx:128`: bloco `text-right` → `text-left sm:text-right`.

## 🟡 Polish
- ~45 páginas com `<h1 className="text-3xl ...">` manual (não usam `PageHeader`) →
  `text-2xl sm:text-3xl` (títulos curtos não estouram, mas alguns com ícone ficam no limite).
- `negociacoes/page.tsx:194` e `contratos/[id]/page.tsx:137`: `grid-cols-3` apertado em card estreito (cabe com `text-sm`; opcional `grid-cols-2 sm:grid-cols-3`).
- `produtor/corretoras` **mapa Leaflet** (`corretoras-map-wrapper.tsx`): confirmar que o container tem altura/largura fluida no mobile (não inspecionado a fundo).

## ✅ Já responsivo (não mexer)
`AdminShell` (referência); `components/data-table.tsx` (table→cards no mobile);
`page-header`, `kpi-card`, `empty-state`, `form-field`, `filter-bar`,
`confirm-submit`; **cadastro** (`cadastrar/_components/cadastro-form.tsx` — impecável);
landing, `entrar`, `c/[slug]`, vitrine de corretoras; e a maioria das páginas de
lista/detalhe/form (grids `sm:grid-cols-2`, `flex-wrap`). A classificação COB
(`lotes/[id]/classificar`) é genuinamente mobile-first.

> Espelho de contrato (`contratos/[id]/espelho`) é layout de **impressão A4** —
> rola na horizontal no mobile, aceitável (é pra imprimir). Não priorizar.

## Plano de correção (pequeno e concentrado)
1. 🔴 **Shell responsivo** p/ corretora e produtor — extrair um client component
   espelhando o `AdminShell` (sidebar `hidden lg:flex` + drawer + header mobile).
   Um componente reutilizável serve aos dois painéis.
2. 🟠 **4 tabelas:** `overflow-hidden`/`p-0` → `overflow-x-auto`.
3. 🟠 **Padding** dos 2 layouts → responsivo.
4. 🟠 **Laudo público:** wrap do header + título responsivo.
5. 🟡 Polish (h1 `text-2xl sm:text-3xl`, grids, mapa) — depois.
