# Convenção de migrations — Milsaca

> Auditoria pré-lançamento, achados 4.2 (timestamp único) e 4.6
> (destrutivos atrás de guarda).

As migrations vivem em `supabase/migrations/` e são aplicadas em ordem
**alfabética do nome do arquivo** pelo Supabase CLI. Por isso o prefixo de
14 dígitos (`YYYYMMDDHHMMSS`) define a ordem de execução.

## 1. Timestamp único (4.2)

**Regra:** cada migration tem um prefixo de 14 chars **único**. Nunca
reusar uma data já usada.

### Por quê

Quando duas migrations têm o mesmo prefixo, a ordem entre elas passa a
depender do **sufixo** (o texto depois do `_`), não da intenção. Hoje
nenhum dos pares duplicados tem dependência cruzada, então não há bug —
mas é frágil: no dia em que uma depender da outra, quem decide a ordem é o
nome do arquivo, não o autor.

### Lint no CI

O job `validate` em `.github/workflows/ci.yml` roda:

```bash
ls supabase/migrations/*.sql | cut -c1-14 | sort | uniq -d
```

Se houver um prefixo duplicado **fora da allowlist**, o job **falha**
(`exit 1`).

### Allowlist (pares legados — NÃO renomear)

Estes 5 pares já estavam aplicados no banco remoto **antes** desta
convenção. Renomear arquivos já aplicados causaria reaplicação/divergência
de histórico, então eles ficam numa allowlist e só geram `::warning::`:

| Prefixo (data) | Arquivos |
| --- | --- |
| `20260528000000` | `lead_origem` + `whatsapp_leads` |
| `20260529000000` | `propostas` + `regioes_atendimento` |
| `20260530000000` | `fix_app_admins_policy` + `lotes_publicos_view` |
| `20260531000000` | `lat_lng_opcional` + `propostas_produtor_responde` |
| `20260601000000` | `produtor_cria_lead` + `rate_limits` |

**Decisão (allowlist, não renomear):** escolhemos allowlist em vez de
renomear porque os arquivos já foram aplicados no remoto; renomear
quebraria o histórico do `supabase_migrations.schema_migrations`. Qualquer
**novo** prefixo duplicado é rejeitado pelo CI.

## 2. Idempotência

Toda migration deve poder rodar mais de uma vez sem erro:

- `create table if not exists`, `create index if not exists`
- `create or replace function/view`
- `drop ... if exists` antes de recriar policy/trigger
- `insert ... on conflict (...) do nothing` para seeds/settings
- `do $$ ... if not exists ... $$` para tipos enum

## 3. Destrutivos atrás de guarda (4.6)

O Supabase **não tem `down` migrations**. Comandos destrutivos
(`delete from`, `drop column`, `truncate`, `drop table`) são
irreversíveis em produção. Convenção:

- **Evitar destrutivo em migration versionada.** Se for inevitável (ex.:
  limpar dados de teste), envolver numa **guarda** que só dispara fora de
  produção ou sob uma flag explícita. Exemplo:

  ```sql
  do $$
  begin
    if current_setting('app.allow_destructive', true) = 'on' then
      delete from public.cotacoes;  -- só com a flag ligada
    else
      raise notice 'destrutivo pulado (app.allow_destructive != on)';
    end if;
  end $$;
  ```

- O caso histórico `20260604000000_cotacoes_tenant.sql:30`
  (`delete from cotacoes` sem `where`) é o anti-padrão que motivou esta
  regra. Novas migrations não devem repetir isso sem guarda.
- Mudanças de coluna seguem **expand/contract** (ver abaixo): adicione o
  novo, migre os dados, só remova o antigo numa migration **posterior**,
  depois que nenhum cliente usa mais.

## 4. Expand / contract (versionamento de API — 4.5)

O app **mobile publicado na loja** consome o banco direto (PostgREST) e
tem lag de atualização (App Store/Play). Renomear/remover coluna, FK ou
enum quebra o app já instalado. Por isso:

### Contrato estável via RPCs `v1_*`

Os fluxos mais acoplados do mobile passam por RPCs `v1_*` (SECURITY
DEFINER, shape de retorno estável), criadas em
`20260654000000_mobile_v1_rpcs.sql`:

- `v1_listar_propostas_produtor(p_only_pending)` — propostas dos leads do
  produtor logado.
- `v1_responder_proposta(p_proposta_id, p_resposta)` — aceita/rejeita
  (compare-and-set server-side).
- `v1_criar_oferta_produtor(...)` — cria lead origem=vitrine; monta
  `coffee_type` no banco.

`apps/mobile/src/lib/queries.ts` já usa essas RPCs (cast localizado, sem
mexer em `packages/types/src/database.ts`).

### Follow-up (ainda PostgREST direto no mobile)

Estes fluxos **ainda** leem PostgREST direto e devem migrar pra `v2_*`/
views versionadas quando houver mudança de schema que os afete:

- **Cotações** (`listCotacoes`, `loadProdutorCotacoesMobile`): leem
  `cotacoes`, `market_quotes`, `corretoras_publicas`, `favoritos`. Muitas
  colunas hardcoded — bom candidato a uma view `v1_cotacoes_produtor`.
- **Leads** (`listMinhasNegociacoes`, `listLeadsDaCorretora`) e
  **contratos** (`listMeusContratos`, `listContratosDaCorretora`): joins
  por nome de FK (`leads_corretora_id_fkey`, `contratos_corretora_id_fkey`)
  — renomear a FK quebraria o app.
- **Vitrine de corretoras** (`listCorretorasParaProdutor`,
  `listCorretorasParaOferta`) e **favoritar**
  (`toggleFavoritoCorretora`): escrita/leitura direta em `favoritos` e
  `corretoras_publicas`.

### Regra de expand/contract para colunas

1. **Expand:** adicione a nova coluna/RPC, mantenha a antiga.
2. **Migre:** backfill + apps novos passam a usar o novo.
3. **Contract:** só remova o antigo numa migration posterior, quando
   nenhum cliente (incluindo versões antigas do app na loja) o usa mais.
