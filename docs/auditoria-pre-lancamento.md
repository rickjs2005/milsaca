---
title: Auditoria de Pré-Lançamento — Milsaca
data: 2026-05-29
tipo: auditoria
escopo: segurança/RLS · resiliência/financeiro · compliance/legal · performance/operação
metodo: diagnóstico (nenhum código alterado); evidências em arquivo:linha
---

# Auditoria de Pré-Lançamento — Milsaca

> **Diagnóstico apenas.** Nenhum arquivo de aplicação foi alterado. Cada achado
> traz evidência real (`arquivo:linha`). Itens ausentes estão marcados como
> "não encontrado".

---

## Resumo executivo

**Contagem de achados por severidade:**

| Severidade | Qtd |
|---|---|
| 🔴 Crítico (bloqueia lançamento) | 4 |
| 🟠 Alto | 12 |
| 🟡 Médio | 11 |
| 🟢 Baixo / OK / informativo | (vários — listados como "limpos" por área) |

### Veredito de lançamento

**Não recomendo lançamento aberto/geral ainda.** Um **piloto controlado** (o
plano atual com a *gojo café*, poucas corretoras, admin único) é **defensável**
desde que os bloqueadores 🔴 abaixo sejam resolvidos ou conscientemente
mitigados — três deles são de esforço baixo/médio.

A boa notícia que sustenta o piloto: **o isolamento multi-tenant está sólido**.
As 36 tabelas têm RLS ligado, nenhuma policy vaza dado de uma corretora para
outra, e o runtime web/mobile **nunca usa a `service_role`** (só a publishable),
então a RLS é a única linha de defesa — e ela está correta. O ponto de maior
fragilidade sistêmica não é vazamento, é **integridade transacional**: nenhum
fluxo financeiro multi-tabela usa transação/RPC atômica.

### 🔴 Bloqueadores

1. **Cap do Programa de Fundadoras é TOCTOU + erro de assinatura engolido**
   (`apps/web/src/app/admin/(panel)/_actions.ts:249-356`). Duas aprovações
   concorrentes (ou duplo-clique) furam o limite de 5 vagas grátis vitalícias;
   e se o `insert subscriptions` falhar, a corretora é aprovada **sem
   assinatura** mas com mensagem de **sucesso** (o erro só vai pro audit, nunca
   aborta). Impacto financeiro direto. **Esforço: médio.**

2. **Espelho de contrato (DANFE) sem SHA-256, sem QR e sem rota de verificação**
   (`apps/web/src/app/painel/corretora/contratos/[id]/espelho/page.tsx:219-227`).
   É o documento de maior valor jurídico (CPF/CNPJ, valor, comissão) e imita um
   DANFE com campos "Chave de acesso"/"Protocolo de autorização" que **sugerem
   uma validação que não existe** (a "chave" é só o UUID sem hifens). Indução a
   crer em autenticidade inexistente. **Esforço: alto.**

3. **Texto da Política de Privacidade afirma "anonimização" que não acontece**
   (`apps/web/src/app/politica-privacidade/page.tsx:130,158` vs.
   `supabase/migrations/20260602000000_lgpd_consents_softdelete.sql:16-17`). O
   "soft-delete" só marca `deleted_at` e esconde via RLS; nome/CPF/CNPJ/telefone
   continuam em texto pleno. Afirmação falsa em documento público = risco
   ANPD/Procon. **Corrigir o texto agora é esforço baixo** e remove o pior do
   risco legal independente de implementar a anonimização real depois.

4. **Sem captura de erros em produção (Sentry/PostHog só documentados)**
   (`docs/milsaca/observabilidade-sentry-posthog.md:3`; zero `import @sentry` /
   `posthog.init` / `instrumentation.ts` no código). Lançar sem isso é voar
   cego: erros de servidor/edge não vão a lugar nenhum. **Esforço: médio.** (É o
   bloqueador mais defensavelmente adiável para um piloto minúsculo, mas o mínimo
   — Sentry no web + 2 edge functions — é fortemente recomendado antes do go.)

---

## Área 1 — Segurança / RLS Supabase ⭐

**Veredito da área: sólido.** Nenhum bloqueador de isolamento cross-tenant.

### Tabela "RLS por tabela" (resumo)
Todas as **36 tabelas em `public` têm RLS habilitado** (cruzamento `create table`
× `enable row level security` bate 1:1 — **nenhuma tabela sem RLS**). Todas as
tabelas com dado de corretora isolam por `corretora_id = current_corretora()`
com bypass `is_admin()`. Exceções intencionais de leitura: `market_quotes`
(dado de mercado, sem PII), `cotacoes` (preço por praça, write é tenant-aware),
catálogos (`coffee_types`/`pracas`/`quote_sources`).

### Achados

**1.1 — `consume_corretora_invite` não valida `consuming_user_id == auth.uid()`**
- **Severidade**: 🟠 Alto
- **Onde**: `supabase/migrations/20260616000000_corretora_invites.sql:81-139`
- **O quê / risco**: RPC `SECURITY DEFINER` concedida a `authenticated` recebe
  `consuming_user_id` arbitrário e faz `update profiles set role='corretora',
  corretora_id=..., status='ativo' where id = consuming_user_id`, **sem checar
  que é o próprio chamador**. Quem possuir um token válido (compartilhado por
  WhatsApp, potencialmente vazável) pode (a) auto-promover-se a corretora e (b)
  escrever no profile de **outro** usuário passando o uid da vítima. Escalada de
  privilégio / alteração de conta alheia (limitada pela posse do token).
- **Como corrigir**: no início da função, `if consuming_user_id <> auth.uid()
  then raise exception 'forbidden'; end if;` (+ exigir `auth.uid() is not null`).
- **Esforço**: baixo

**1.2 — View `lotes_publicos` expõe PII de produtor + contato da corretora a `anon`**
- **Severidade**: 🟡 Médio
- **Onde**: `supabase/migrations/20260530000000_lotes_publicos_view.sql:30-31,47-66,97`
- **O quê / risco**: view com `security_invoker = off` + `grant select to anon`
  expõe, sem login, `corretora_phone`, `corretora_email`, `produtor_nome`,
  `fazenda_nome`, cidade/UF de qualquer lote publicado. Não é cross-tenant (é
  catálogo público por desenho), mas é PII de produtor + contato comercial sem
  auth nem rate-limit → risco LGPD/scraping. (A `corretoras_publicas`
  deliberadamente **não** dá grant a `anon`.)
- **Como corrigir**: remover phone/email/nome da projeção pública ou expor via
  RPC com rate-limit/token por lote; reavaliar se precisa de `anon` ou só
  `authenticated`.
- **Esforço**: baixo

**1.3 — `corretora_waitlist` insert anônimo `with check (true)`**
- **Severidade**: 🟢 Baixo
- **Onde**: `supabase/migrations/20260620000000_programa_fundadoras.sql:70-74`
- **O quê / risco**: `anon` insere livremente (nome/whatsapp/email). Leitura é só
  admin (`:78`) → **não vaza**; risco é só spam por bots. Mitigar na rota
  (rate-limit + honeypot/CAPTCHA). Mesmo padrão de `whatsapp_leads`.
- **Esforço**: baixo

**Verificados sem achado (limpos):** `service_role`/`SUPABASE_SECRET_KEY` **não
aparecem** em client/Expo/env público (só em `scripts/*.mjs` server-side e
placeholder de CI); grants a `anon` não abrem leitura de tabela tenant (o
histórico `grant select on corretoras to anon` foi revogado em
`20260527000000:40`); **Storage não está provisionado** (sem buckets/policies/
uso de `.storage` — *follow-up: ao ativar, isolar por `corretora_id` no path*);
edge functions fail-closed (`sync-cotacoes` exige `x-cron-secret`/service-role,
`send-dispatch` exige `SEND_DISPATCH_SECRET`); nenhum secret hardcoded em arquivo
versionado (`.gitignore` cobre `.env*`).

---

## Área 2 — Resiliência / Integridade financeira

**Padrão sistêmico:** nenhum fluxo financeiro multi-tabela usa RPC plpgsql
transacional — são sequências de `.insert()`/`.update()` soltas no server action.
As proteções que funcionam hoje dependem de RLS/unique constraints do banco, não
da lógica do action.

### Achados

**2.1 — `aprovarCorretora`: 4 escritas não-atômicas + erro de subscription engolido** 🔴
- **Onde**: `apps/web/src/app/admin/(panel)/_actions.ts:227-356` (subErr em `:321`,
  só logado em `:344`, sucesso em `:352`)
- **O quê / risco**: insert corretora → update profile → (self-heal plan) →
  insert subscription → insert audit, sem transação. Falha no passo 4 deixa
  corretora criada e profile ativado **sem assinatura**, e o `subErr` **não
  aborta** — a action redireciona com "aprovada como fundadora". Admin pensa que
  deu certo.
- **Como corrigir**: mover tudo para uma RPC `SECURITY DEFINER` única
  (transação implícita → rollback total em falha); no mínimo, tratar `subErr`
  como fatal.
- **Esforço**: médio

**2.2 — Cap de fundadoras com TOCTOU (sem lock)** 🔴
- **Onde**: `apps/web/src/app/admin/(panel)/_actions.ts:249-259` + RPC
  `founder_program_status` (`migrations/20260620000000_programa_fundadoras.sql:89-113`)
- **O quê / risco**: lê `used` e compara `used >= total` em JS antes do insert.
  Duas aprovações concorrentes (ou duplo-clique) leem `4 < 5` e ambas inserem →
  6+ fundadoras grátis vitalícias. Sem unique/lock/`for update`/insert
  condicional. Cada vaga extra = receita perdida permanente.
- **Como corrigir**: gate dentro de RPC transacional com `pg_advisory_xact_lock`
  + recheck na mesma transação; ou trigger que rejeita insert além do cap.
- **Esforço**: médio

**2.3 — Aprovação dupla da mesma corretora (sem idempotência)** 🟠
- **Onde**: `apps/web/src/app/admin/(panel)/_actions.ts:227-356`
- **O quê / risco**: não verifica se o profile já foi aprovado (status atual /
  `corretora_id` já preenchido) → clicar "Aprovar" 2× cria 2 corretoras (CNPJ
  unique pode barrar a 2ª se vier igual; se vier null/diferente, duplica).
- **Como corrigir**: compare-and-set no início (`status='pendente' and
  corretora_id is null`).
- **Esforço**: baixo

**2.4 — `updatePropostaStatus` sem compare-and-set de status** 🟠
- **Onde**: `apps/web/src/app/painel/corretora/propostas/_actions.ts:145-209`
- **O quê / risco**: UPDATE por `id`+`corretora_id` sem condicionar ao status
  atual → corretora pode reprocessar proposta terminal (aceita→rejeitada) e
  sobrescrever `respondida_em`. Depende da UI esconder botões.
- **Como corrigir**: `.eq("status", <esperado>)` (compare-and-set) ou validar
  matriz de transições server-side.
- **Esforço**: baixo

**2.5 — PDF de laudo renderizado síncrono no request** 🟠
- **Onde**: `apps/web/src/app/laudos/[id]/pdf/route.tsx:25-34`
- **O quê / risco**: `QRCode.toDataURL` + `renderToBuffer` (@react-pdf) síncronos
  no GET público, sem cache de PDF gerado. Pico de acesso → timeout/pressão de
  memória na serverless.
- **Como corrigir**: gerar uma vez e cachear em storage por laudo; servir o
  objeto. No mínimo, cache mais agressivo.
- **Esforço**: médio

**2.6 — `markSubscriptionPaid` read-modify-write sem lock** 🟠
- **Onde**: `apps/web/src/app/admin/(panel)/assinaturas/_actions.ts:72-136`
- **O quê / risco**: SELECT do período + cálculo em JS + UPDATE. Dois "marcar
  pago" concorrentes leem a mesma base e uma extensão se perde (dado financeiro).
- **Como corrigir**: calcular no próprio UPDATE atômico
  (`greatest(current_period_end, now()) + interval`).
- **Esforço**: baixo

**2.7 — `createEntrega`/`gerarEntregaDoContrato`: `nextSeq` por SELECT-then-INSERT** 🟠
- **Onde**: `apps/web/src/app/painel/corretora/entregas/_actions.ts:70-97,149-167`
- **O quê / risco**: `nextSeq = max(sequencia)+1` via SELECT e depois INSERT. Race
  → unique `(contrato_id, sequencia)` (`migrations/20260517000000_entregas.sql:57`)
  barra com 23505 (não corrompe), mas a 2ª falha com erro genérico. `insert` +
  `notify` não-atômicos.
- **Como corrigir**: sequência atômica (sequence/`insert...select max+1` em RPC)
  + retry no 23505.
- **Esforço**: médio

**2.8 — `audit_log` sempre fora da transação da mutação** 🟡
- **Onde**: vários `_actions.ts` (ex.: `_actions.ts:331`; `assinaturas/_actions.ts:55,122,154`)
- **O quê / risco**: audit é `.insert()` separado, erro ignorado → mutação pode
  ficar sem trilha. Compliance financeiro.
- **Como corrigir**: incluir audit na mesma RPC/transação, ou trigger de
  auditoria no banco.
- **Esforço**: médio

**2.9 — Sem retry/backoff nos fetch de cotações externas** 🟡
- **Onde**: `supabase/functions/sync-cotacoes/_lib/adapters.ts` (ICE/PTAX/CEPEA/scrape)
- **O quê / risco**: têm timeout (`fetchWithTimeout`, 8s — ✔), mas falha
  transitória → fonte pulada até o próximo cron. Robusta tem fallback de mirror;
  as demais não têm retry.
- **Como corrigir**: 2-3 tentativas com backoff para 5xx/erro de rede.
- **Esforço**: baixo

**2.10 — `auth/callback` e `auth/confirm` ecoam `error.message` cru na URL** 🟠
- **Onde**: `apps/web/src/app/auth/callback/route.ts:28-29`; `auth/confirm/route.ts:26-27`
- **O quê / risco**: mensagem crua do Supabase exposta na query string → facilita
  enumeração/diagnóstico. (`confirmar-email/_actions.ts:54` já faz o certo com
  mensagem genérica.)
- **Como corrigir**: mensagens genéricas fixas.
- **Esforço**: baixo

**Limpos:** webhook de pagamento **não se aplica** (não há provedor integrado;
cobrança interna marcada manual); `send-dispatch` é idempotente
(`index.ts:120-122`); aceite de proposta do **produtor** é protegido pela policy
`using (status='enviada')` reavaliada por linha no UPDATE
(`migrations/20260531000000_propostas_produtor_responde.sql:32-52`);
`friendlyPostgresError` não vaza stack ao cliente (`lib/postgres-error.ts:13-64`);
`subscriptions` upsert é seguro (unique em `corretora_id`).

---

## Área 3 — Compliance / Legal

### Achados

**3.1 — Espelho de contrato sem hash/QR/rota de verificação (imita DANFE)** 🔴
- **Onde**: `apps/web/src/app/painel/corretora/contratos/[id]/espelho/page.tsx:219-227,549-552`
- **O quê / risco**: documento de maior valor jurídico, **sem QR, sem URL pública
  de verificação, sem SHA-256**. "Chave de acesso" = `contrato.id.replace(/-/g,
  "")` (só o UUID), "Protocolo de autorização" = texto livre → sugerem validação
  inexistente. Não há rota pública de verificação de contrato (só de laudo).
- **Como corrigir**: rota pública de verificação (análoga a `get_laudo_publico`,
  só campos não-sensíveis) + SHA-256 do conteúdo canônico + QR/hash no rodapé;
  renomear os campos enganosos.
- **Esforço**: alto

**3.2 — Política afirma "anonimização" que não ocorre + sem ação de exclusão no app** 🔴/🟠
- **Onde**: `apps/web/src/app/politica-privacidade/page.tsx:130,158` vs.
  `supabase/migrations/20260602000000_lgpd_consents_softdelete.sql:16-17`,
  `20260605000000_lgpd_hide_soft_deleted.sql:31-110`
- **O quê / risco**: soft-delete só marca `deleted_at` e esconde via RLS; PII
  (nome/CPF/CNPJ/telefone) permanece em texto pleno e visível a admin. Não há
  server action que sequer **marque** `deleted_at` (depende de SQL manual).
  `produtor_contatos` é hard-deleted (`produtores/_actions.ts:126-130`),
  inconsistente. Texto público dizendo "anonimizado" é **falso hoje**.
- **Como corrigir**: (curto prazo, 🔴 baixo) alinhar o texto da política; (médio
  prazo) rotina de anonimização real + ação de exclusão no app.
- **Esforço**: baixo (texto) / alto (anonimização)

**3.3 — Sem exportação/portabilidade de dados do titular** 🟠
- **Onde**: não encontrado (nenhuma rota/ação de export)
- **O quê / risco**: a política promete "acessar todos os dados que temos sobre
  você" (`politica-privacidade/page.tsx:118`), sem mecanismo self-service
  (art. 18 LGPD). Aceitável no piloto **se** houver processo manual documentado.
- **Como corrigir**: rota autenticada que reúne profiles + produtores/corretoras
  + consents + contratos/leads do titular em JSON/CSV.
- **Esforço**: médio

**3.4 — Laudo COB PDF sem SHA-256 (tem QR/URL)** 🟠
- **Onde**: `apps/web/src/app/laudos/[id]/pdf/route.tsx:24-30`;
  `apps/web/src/app/laudos/_lib/pdf-template.tsx:426-444`
- **O quê / risco**: QR aponta para `/laudos/{id}` (verificação existe via RPC),
  mas sem hash não se prova não-adulteração do PDF. Enfraquece valor probatório
  do laudo MAPA.
- **Como corrigir**: SHA-256 do payload canônico no rodapé + página de
  verificação recomputa e exibe.
- **Esforço**: médio

**3.5 — Edição/criação/status de contrato não auditada** 🟠
- **Onde**: `apps/web/src/app/painel/corretora/contratos/_actions.ts` (create `:75`,
  updateFields `:175`, updateStatus `:233` — zero `audit_log`)
- **O quê / risco**: contrato (valor jurídico) muda sem rastro de quem/quando.
  O `audit_log` só registra ações de **admin da plataforma**, nunca da
  **corretora** sobre seus dados — e a policy `audit_log_admin_write`
  (`initial_schema.sql:382`) bloqueia escrita por corretora.
- **Como corrigir**: registrar mutações de contrato (histórico por tenant ou
  audit via função `security definer`).
- **Esforço**: médio

**3.6 — Mudança de role / promoção a admin não auditada** 🟠
- **Onde**: promoção via `scripts/promote-admin.mjs` (fora do audit_log); sem
  auditoria de alteração de `profiles.roles` no produto
- **Como corrigir**: auditar toda alteração de `roles`.
- **Esforço**: baixo

**3.7 — `version` da política hardcoded em 2 lugares** 🟡
- **Onde**: `apps/web/src/app/cadastrar/_actions.ts:199` e
  `politica-privacidade/page.tsx:9`
- **O quê / risco**: se a política mudar e só um for atualizado, o consentimento
  registra versão errada.
- **Como corrigir**: constante única importada nos dois.
- **Esforço**: baixo

**3.8 — `audit_log` sem IP/origem** 🟡 · **3.9 — comentário "audit interno" não
confere com código** 🟡 (`api/leads/whatsapp/route.ts:91` — o insert é
fire-and-forget, não há audit). Sem vazamento.

**Limpos:** consentimento no cadastro implementado e imutável
(`cadastrar/_actions.ts:136-221`); cookie banner dispensável (só cookies
essenciais); `audit_log` é **realmente escrito** nas ações de admin
(`_actions.ts:64,107,154,...`); IP sempre hasheado com `LEAD_IP_SALT`
(`route.ts:26-31`); nenhum `console.*` de produção loga CPF/CNPJ/token/senha
(logs verbosos só em `scripts/*.mjs`).

---

## Área 4 — Performance / Operação

### Achados

**4.1 — Sentry/PostHog não instalados (só documentados)** 🔴
- **Onde**: `docs/milsaca/observabilidade-sentry-posthog.md:3`; zero `import
  @sentry`/`posthog.init`/`instrumentation.ts` no código (só `.env.example:45-47`
  comentado e texto da política)
- **Como corrigir**: instalar Sentry (web server+client + 2 edge functions) no
  mínimo antes do go.
- **Esforço**: médio

**4.2 — Timestamps de migration duplicados (risco latente)** 🟠
- **Onde**: 5 pares com mesmo prefixo: `20260528` (lead_origem + whatsapp_leads),
  `20260529` (propostas + regioes_atendimento), `20260530` (fix_app_admins_policy
  + lotes_publicos_view), `20260531` (lat_lng_opcional + propostas_produtor_responde),
  `20260601` (produtor_cria_lead + rate_limits)
- **O quê / risco**: o CLI ordena por nome completo (sufixo desempata de forma
  determinística), então **não há ordem aleatória hoje** e nenhum par tem
  dependência cruzada (verificado). Mas é frágil: se um dia uma depender da
  outra, quem decide a ordem é o sufixo, não a intenção.
- **Como corrigir**: renomear o 2º de cada par para timestamp único (só se ainda
  não aplicado no remoto); senão, lint de CI: `ls migrations | cut -c1-14 | sort
  | uniq -d`.
- **Esforço**: baixo

**4.3 — Backup/retenção não documentado** 🟠
- **Onde**: não encontrado em `docs/` (sem menção a PITR/retenção/restore)
- **Como corrigir**: documentar tier Supabase, PITR, janela de retenção, runbook
  de restore; considerar `pg_dump` externo de redundância.
- **Esforço**: baixo (documentar) / médio (PITR + dump)

**4.4 — Sem logs estruturados / request id** 🟠
- **Onde**: `console.error("[tag]...")` em texto plano (`lib/notify.ts:34,39`,
  edge functions) sem correlation id
- **Como corrigir**: logger JSON + `x-request-id` propagado no middleware/edge.
- **Esforço**: médio

**4.5 — Sem versionamento de API; mobile acoplado ao schema** 🟠
- **Onde**: `apps/mobile/src/lib/queries.ts` (joins por nome de FK
  `leads_corretora_id_fkey`, colunas hardcoded, escrita direta em tabelas)
- **O quê / risco**: web e mobile consomem PostgREST direto; renomear coluna/FK/
  enum quebra app **já publicado** na loja (lag de atualização App Store/Play).
- **Como corrigir**: RPCs/views versionadas (`v1_*`) como contrato estável para o
  que o mobile consome; política expand/contract nas migrations.
- **Esforço**: médio/alto

**4.6 — `delete from cotacoes` destrutivo versionado** 🟡
- **Onde**: `supabase/migrations/20260604000000_cotacoes_tenant.sql:30` (DELETE
  total sem `where`, intencional para test data). Sem reversão (Supabase não tem
  down). Convenção futura: guardar destrutivos atrás de guarda.
- **Esforço**: baixo

**4.7 — `notifications` sem índice em created_at/unread** 🟡
- **Onde**: `supabase/migrations/20260514000000_initial_schema.sql:242` (só
  `user_id`). Irrelevante no piloto; vira problema com milhares/usuário.
- **Como corrigir**: `(user_id, created_at desc)` e/ou parcial `where read_at is null`.
- **Esforço**: baixo

**4.8 — `QUOTES_MODE` é env var (não hot-swappable)** 🟡
- **Onde**: `apps/web/src/lib/quotes-mode.ts:22` — trocar real↔demo exige
  redeploy. Default seguro (`real`). Baixo risco.

**4.9 — Fila tem log interno mas sem alerta proativo** 🟡 ·
**4.10 — seed.sql vazio; sem conta demo fixa documentada** 🟡
(`supabase/seed.sql` só comentários; `seed-remote.mjs` recebe email por argv).

**Limpos:** índices cobrem FKs/filtros quentes (`corretora_id`/`produtor_id`/
`status`/`created_at`) na maioria das tabelas; **sem N+1** no código (fan-outs são
bounded sobre enums com `Promise.all`); **kill switch robusto** via
`platform_settings` (signup gates, lead distribution, `dispatch_worker_url` como
kill switch do worker); edge functions leves (sem deps pesadas → cold start
desprezível); bundle Next saudável (Leaflet via `dynamic(ssr:false)`, @react-pdf
só server-side); drops idempotentes (`drop ... if exists` + recriação).

---

## Apêndice — Itens "não encontrado" (ausências confirmadas)

- Provedor de pagamento/assinatura digital (Asaas/Stripe/ClickSign) — não integrado.
- Webhook de pagamento — não existe (logo idempotência de pagamento não se aplica).
- Buckets/policies de Storage — não provisionados (follow-up ao ativar).
- Rota de exportação/portabilidade de dados (LGPD art. 18).
- Rota pública de verificação de **contrato** (só existe a de laudo).
- Instrumentação Sentry/PostHog no código.
- Logger estruturado / request id.
- Estratégia de backup/PITR documentada.
- Versionamento de API (`/v1`).
- Conta demo fixa documentada para o piloto.
