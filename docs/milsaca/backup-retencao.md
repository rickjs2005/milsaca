# Backup, retenção e restore — Milsaca

> Auditoria pré-lançamento, achado 4.3 (backup/retenção não documentado).
> Este doc descreve a estratégia. Os valores de tier/retenção devem ser
> confirmados no dashboard do projeto Supabase antes do go-live.

## 1. Onde os dados vivem

Toda a persistência é **Supabase (Postgres gerenciado)**:

- Tabelas de aplicação em `public` (36 tabelas, todas com RLS).
- `auth.users` (gerenciado pelo Supabase Auth).
- **Storage não está provisionado** ainda (sem buckets) — quando ativar,
  incluir os buckets nesta estratégia.
- Não há outro datastore externo (sem Redis/Upstash — o rate-limit usa a
  própria tabela `rate_limits`).

Consequência: **fazer backup do Postgres do Supabase cobre 100% do estado
da aplicação** hoje.

## 2. Backups automáticos do Supabase

O Supabase faz backup conforme o **tier do projeto**:

| Tier | Backup | Retenção típica | PITR |
| --- | --- | --- | --- |
| Free | — (sem backup gerenciado) | — | não |
| Pro | diário automático | 7 dias | opcional (add-on) |
| Pro + PITR add-on / Team | contínuo (WAL) | 7–28 dias (configurável) | sim |

> **AÇÃO antes do go-live:** confirmar no dashboard
> (Project → Database → Backups) o tier atual e ativar **PITR** se
> estivermos em Pro. Para um SaaS que guarda contratos com valor jurídico
> e PII (LGPD), o mínimo recomendado é **Pro com backup diário**; o
> desejável é **PITR** (recuperação a um ponto no tempo, granularidade de
> segundos).

### PITR (Point-In-Time Recovery)

Quando ligado, permite restaurar o banco a **qualquer instante** dentro da
janela de retenção (não só ao último snapshot diário). Crítico para
cenários como "uma migration destrutiva apagou dados às 14h32" — restaura
para 14h31.

## 3. Redundância externa (recomendada)

Backup gerenciado do Supabase é suficiente para a maioria dos cenários,
mas para um documento de valor jurídico convém uma **cópia fria fora do
Supabase**:

- `pg_dump` periódico (ex.: semanal) rodado por um cron externo
  (GitHub Actions agendado ou cron-job.org chamando um script), gravando
  um `.sql.gz` cifrado num bucket de objeto independente (R2/S3).
- Comando base (usar a connection string de leitura do projeto):

  ```bash
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges \
    | gzip > milsaca-$(date +%F).sql.gz
  ```

- Guardar a chave/URL como secret (nunca no repo). Retenção sugerida: 4
  semanas de dumps semanais.

> Status atual: **✅ AUTOMATIZADO em 2026-06-12** (P0 da auditoria) —
> `.github/workflows/backup.yml`: pg_dump semanal (segunda 03:00 BRT) via
> **session pooler** (a conexão direta `db.<ref>.supabase.co` é só-IPv6 e não
> funciona em runner do GitHub), **criptografado com AES-256** antes do upload
> (o repo é público — artifact sem criptografia vazaria o banco inteiro),
> retenção 28 dias.
>
> **Pendente do dono (uma vez):** criar os 2 secrets no GitHub
> (`SUPABASE_DB_URL` = connection string do **Session Pooler** com a senha;
> `BACKUP_PASSPHRASE` = frase aleatória longa, guardada no gerenciador de
> senhas) e disparar 1× via "Run workflow" pra validar.
> **Descriptografar:** `openssl enc -d -aes-256-cbc -pbkdf2 -in arquivo.dump.enc
> -pass pass:<frase> -out milsaca.dump` e seguir o Caso C com `pg_restore`.

## 4. Runbook de restore

### Caso A — restore via dashboard (snapshot diário ou PITR)

1. Dashboard → **Project → Database → Backups**.
2. Escolher o snapshot (ou, com PITR, o **timestamp** alvo).
3. Confirmar o restore. **ATENÇÃO:** o restore do Supabase normalmente é
   *in-place* (sobrescreve o banco atual) — para inspeção sem perder o
   estado vivo, prefira restaurar num **projeto novo** e comparar.
4. Após restore, validar:
   - `select count(*) from public.contratos;` e demais tabelas críticas.
   - Login de um usuário demo (auth intacto).
   - Cron jobs do `pg_cron` ainda agendados
     (`select jobname, schedule from cron.job;`).

### Caso B — restore de um `pg_dump` externo

1. Provisionar/escolher o projeto alvo (de preferência um **novo** projeto
   para não sobrescrever produção).
2. Restaurar:

   ```bash
   gunzip -c milsaca-AAAA-MM-DD.sql.gz | psql "$TARGET_DB_URL"
   ```

3. Reaplicar migrations que sejam mais recentes que o dump, se houver.
4. Validar como no Caso A.

### Caso C — reverter uma migration destrutiva específica

Não há `down` migration (Supabase não suporta). O caminho é:

1. Identificar o instante imediatamente **antes** da migration ruim.
2. Restore PITR para esse instante (Caso A) — idealmente num projeto de
   staging para extrair só os dados afetados e reinserir em produção, se a
   janela de impacto for pequena.

Ver `docs/milsaca/convencao-migrations.md` (seção "destrutivos atrás de
guarda") para evitar precisar disto.

## 5. Monitoramento de saúde (relacionado)

- A **fila interna** (`system_events`) tem alerta proativo: o cron
  `milsaca-check-queue-failures` (migration
  `20260655000000_system_events_alert_cron.sql`) registra um alerta na
  própria fila quando há muitas falhas recentes.
- **✅ `/api/health` existe desde 2026-06-12** (P0 da auditoria):
  - HTTP **503** = banco fora (alerta de queda no monitor);
  - HTTP 200 com `"status":"degraded"` = app de pé mas **há despachos
    falhando na fila** (`queue_failed_24h > 0`) — é assim que o alerta de
    fila chega num humano.
- **Pendente do dono (uma vez, ~5min):** criar monitor no UptimeRobot (ou
  similar) apontando pra `https://<dominio>/api/health` com DOIS gatilhos:
  (1) HTTP != 200 e (2) **keyword "degraded"** no corpo. Notificação por
  email/Telegram do dono.

## 6. Checklist pré-go-live

- [ ] Confirmar tier Supabase (mínimo Pro).
- [ ] Ativar PITR (ou ao menos backup diário) e anotar a janela de
      retenção real.
- [ ] (Recomendado) automatizar `pg_dump` externo semanal cifrado.
- [ ] Testar um restore num projeto descartável (Caso A) **uma vez** antes
      do go.
- [ ] Configurar uptime externo apontando para web + edge functions.
