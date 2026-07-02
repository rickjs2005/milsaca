# Runbook — aplicar melhorias (sessão 2026-06-29) no staging

Pacote de 6 migrations novas (`20261410`–`20261460`) + mudanças de app já no working tree
(typecheck/lint limpos). **Nada foi aplicado a banco ainda** — este runbook descreve a ordem
segura de aplicar e validar em **staging** antes de produção.

> Regra do projeto: nunca `db:push` remoto sem credenciais confirmadas. Confirme que o
> Supabase CLI está **linkado ao projeto de STAGING** (`supabase projects list` / `supabase link`)
> antes de qualquer comando.

---

## 0. Pré-requisitos

1. CLI linkado ao **staging** (NÃO produção): `supabase link --project-ref <STAGING_REF>`.
2. Backup/snapshot do banco de staging (ou confie que é descartável).
3. Branch limpa com as mudanças desta sessão.
4. `git status` deve listar: 6 arquivos em `supabase/migrations/`, `packages/types/src/database.ts`,
   e os arquivos de app (`auth/*/route.ts`, `painel/produtor/negociacoes/*`, `painel/corretora/propostas/_actions.ts`,
   `painel/corretora/leads/_actions.ts`, `painel/corretora/_lib/dashboard.ts`, `components/indicadores-live.tsx`,
   `entrar/_actions.ts`, `laudos/[id]/page.tsx`, `components/empty-state.tsx`, `app/page.tsx`, `app/globals.css`,
   `components/ui/{button,card}.tsx`, skeletons).

---

## 1. As 6 migrations (ordem já correta por timestamp)

| Migration | Item | O que faz | Risco |
|---|---|---|---|
| `20261410_lead_state_machine` | P1 | Trigger `before update` em `leads` valida transições de `lead_status`; `convertido` terminal | Médio — pode barrar transição legítima se houver fluxo não previsto |
| `20261420_propostas_expiry_cron` | P5 | `expirar_propostas_vencidas()` + cron diário 03:10 UTC | Baixo |
| `20261430_propostas_unique_aceita` | P6 | Índices únicos parciais: 1 proposta `aceita` por lead e por lote | Baixo (pode falhar a criação se já existir dado violando — ver passo 3) |
| `20261440_laudo_publico_sem_email` | S2 | `get_laudo_publico` sem `co.email` (chave vira `null`) | Baixo |
| `20261450_rls_initplan_funcs` | E3 | Reescreve policies de 8 tabelas embrulhando `is_admin()/current_corretora()/is_corretora()` em `(select …)` | **ALTO — mexe em RLS** |
| `20261460_corretora_produtores_ativos` | E2 | `count(distinct)` de produtores ativos (substitui dedup em memória do dashboard) | Baixo (mas exige regen de types — passo 4) |

> **Recomendação:** aplique `20261450` (E3/RLS) **separada** das outras e valide isolada (passo 5).
> As demais são aditivas e de baixo risco.

---

## 2. Pré-checagem de dados (antes do push) — evita falha na criação dos índices únicos

A migration P6 cria índices únicos. Se já existir lead/lote com **2 propostas `aceita`**, a criação falha.
Rode no SQL editor do staging:

```sql
-- lead com >1 proposta aceita (deve voltar 0 linhas)
select lead_id, count(*) from public.propostas
 where status='aceita' and lead_id is not null
 group by lead_id having count(*) > 1;

-- lote com >1 proposta aceita (deve voltar 0 linhas)
select lote_id, count(*) from public.propostas
 where status='aceita' and lote_id is not null
 group by lote_id having count(*) > 1;
```

Se voltar linhas, resolva os duplicados (manter 1 `aceita`, marcar as outras `rejeitada`) antes do push.

---

## 3. Aplicar as migrations

```bash
# aplica TODAS as pendentes na ordem
pnpm db:push
```

(Se preferir aplicar E3 isolada: mova temporariamente `20261450_*.sql` pra fora, faça `db:push`,
valide o resto, depois volte o arquivo e `db:push` de novo.)

Confirme:

```sql
-- P5: cron registrado
select jobname, schedule from cron.job where jobname = 'milsaca-expirar-propostas';
-- P6: índices criados
select indexname from pg_indexes where tablename='propostas' and indexname like 'propostas_uma_aceita%';
-- P1: trigger criado
select tgname from pg_trigger where tgrelid='public.leads'::regclass and tgname='leads_validate_transition';
```

---

## 4. Regenerar os tipos (obrigatório p/ E2)

A RPC `corretora_produtores_ativos` foi adicionada **à mão** em `packages/types/src/database.ts`
(passo "expand"). Regenere a partir do banco e confirme que não houve drift:

```bash
pnpm db:types:remote      # gera de --linked (staging) para packages/types/src/database.ts
git diff packages/types/src/database.ts
```

Esperado: o diff mostra **apenas** a assinatura `corretora_produtores_ativos` (igual à minha)
+ as outras funções novas (`expirar_propostas_vencidas`), **sem** remover/alterar nada usado pelo app.
Depois: `pnpm --filter @milsaca/web type-check` deve passar limpo.

---

## 5. Validação do E3 (RLS) — fazer com cuidado

Antes/depois de aplicar `20261450`, compare as policies e teste isolamento:

```sql
-- dump das policies das tabelas quentes (compare o 'qual' before/after — só deve mudar f() -> (select f()))
select tablename, policyname, qual, with_check
  from pg_policies
 where schemaname='public'
   and tablename in ('leads','contratos','entregas','produtor_pagamentos','lotes','lead_events','propostas','notifications')
 order by tablename, policyname;
```

Teste funcional (com 2 corretoras de teste A e B):
- Logado como corretora A: NÃO deve ver leads/contratos/propostas da corretora B.
- Produtor: deve ver só os próprios leads/propostas.
- Admin: vê tudo.
Se qualquer isolamento quebrar, **reverta** (passo 7) — é só performance, não vale o risco.

---

## 6. Paridade de KPIs (E2) e smoke das mudanças de app

**E2 — produtores ativos (deve BATER exatamente):**
```sql
-- :cid = id de uma corretora com dados
select (
  select count(distinct produtor_id) from (
    select produtor_id from public.leads
     where corretora_id = :cid and produtor_id is not null and status <> 'arquivado'
    union
    select produtor_id from public.contratos
     where corretora_id = :cid and produtor_id is not null
  ) s
) as antigo_js,
public.corretora_produtores_ativos(:cid) as novo_rpc;
-- antigo_js == novo_rpc
```

**Smoke das mudanças de app** (ver também `docs/milsaca/checklist-smoke-producao.md`):
- **Propostas (P2/P3/P4):** produtor abre `/painel/produtor/negociacoes/[id]` com proposta `enviada` →
  vê o **preço real** (não o legado) → **Aceitar** e **Recusar** funcionam → corretora é notificada;
  corretora aceita/recusa → produtor recebe notificação.
- **P1:** tentar (via UI da corretora) uma transição inválida de lead (ex.: a partir de `convertido`) → erro amigável; transições válidas seguem normais; gerar contrato (→ `convertido`) funciona.
- **P10:** criar proposta/contraproposta com valor absurdo (ex.: 999999999) → "fora do intervalo plausível".
- **S1:** acessar `/auth/callback?next=@evil.com` (com code válido) → redireciona para `/painel`, NÃO pra fora.
- **S2:** abrir laudo público (`/laudos/[id]`) → sem email da corretora; PDF público idem.
- **S3:** 6 tentativas de login do mesmo IP com emails diferentes → bloqueio por IP.
- **E5:** dashboard carrega indicadores de mercado normalmente (agora cacheados 5 min).
- **Dark mode:** abrir home do produtor no tema escuro → pílula de safra e card "Melhor oportunidade" legíveis (sem texto-fantasma).

---

## 7. Rollback (por migration, se algo falhar)

Todas idempotentes; reverter = aplicar o inverso:
- **P1:** `drop trigger if exists leads_validate_transition on public.leads;`
- **P5:** `select cron.unschedule('milsaca-expirar-propostas');` + `drop function if exists public.expirar_propostas_vencidas();`
- **P6:** `drop index if exists public.propostas_uma_aceita_por_lead; drop index if exists public.propostas_uma_aceita_por_lote;`
- **S2/E2:** as funções são `create or replace` — reverter = reaplicar a definição anterior (S2: migration `20261200000000`; E2: simplesmente `drop function public.corretora_produtores_ativos(uuid)` e reverter o `dashboard.ts`).
- **E3:** reaplicar as migrations de policy anteriores (`20260831`, `20261080/90`, `20261170`) recria o estado anterior; ou `git revert` da migration e re-push.

---

## 8. Itens AINDA deferidos (precisam de staging com dados reais + decisão)

- **E2 financeiro** (`loadResultadoMes`, `loadRankingProdutores` em `dashboard.ts`) — somas de DINHEIRO; mesmo padrão do E2 já feito, mas validar paridade em staging antes de trocar (erro mostra receita errada).
- **E1** — consolidar as ~30 queries do home da corretora em 1 RPC (reduz conexões/statements por request).
- **P6 estoque central cross-corretora** — impedir vender a mesma saca entre corretoras diferentes (decisão de produto).
- **E4** — CDN/transcodificação de mídia da Comunidade (infra/ops).
