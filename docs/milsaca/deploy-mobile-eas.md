# Deploy do Milsaca Mobile via EAS Build

> Guia operacional pra distribuir o app Milsaca (Expo SDK 54) via
> EAS Build pro TestFlight (iOS) e Play Console Internal (Android).
>
> **Pré-requisitos**: assets binários em `apps/mobile/assets/` (vide
> `BRIEF.md` lá) + contas dos passos abaixo.

## 1. Contas necessárias

| Conta | Custo | Pra que serve | Como criar |
|---|---|---|---|
| **Expo** | Grátis | Vincula projeto + builds remotos | `npx eas-cli login` ou expo.dev/signup |
| **Apple Developer** | US$ 99/ano | Distribuir no TestFlight + App Store | developer.apple.com/programs |
| **Google Play Console** | US$ 25 one-time | Distribuir interno + Play Store | play.google.com/console |

> Sem **Apple Developer**, dá pra rodar `build:preview` (perfil `internal`) que entrega APK direto via link Expo (sem store) e ainda assim demonstrar pra investidor.

## 2. Setup inicial (uma única vez)

### 2.1 Login no EAS CLI

```bash
cd apps/mobile
npx eas-cli login
```

### 2.2 Inicializar projeto

```bash
cd apps/mobile
npx eas-cli init
```

Isso gera um **project ID** e modifica `app.json` adicionando-o em
`extra.eas.projectId`. **Já deixei placeholder lá** (`"PREENCHER_APOS_EAS_INIT"`) — o comando substitui automaticamente.

### 2.3 Configurar credenciais Apple (somente iOS)

```bash
cd apps/mobile
npx eas-cli credentials
# Escolha: iOS → All builds → Set up build credentials
# EAS gerencia certificado, provisioning profile e push key automaticamente
```

### 2.4 Configurar credenciais Android (somente Android)

EAS gera keystore automaticamente no primeiro build. Para Play Console,
após o primeiro build de produção, exporte o `service-account.json`
do Google Cloud e configure em `eas.json` → `submit.production.android.serviceAccountKeyPath`.

## 3. Builds

### 3.1 Build preview (interno, sem store)

```bash
pnpm --filter @milsaca/mobile build:preview
# ou só Android:
pnpm --filter @milsaca/mobile build:preview:android
```

EAS faz build na nuvem (~10-20min). No fim, mostra **link de download**
do `.apk` (Android) ou `.ipa` (iOS — requer device registrado em Apple
Developer).

**Pra demonstrar pra investidor**: APK preview é o caminho mais rápido.
Compartilha o link, baixa direto no celular, instala via "fontes
desconhecidas" (Android) ou TestFlight (iOS).

### 3.2 Build produção (pra stores)

```bash
pnpm --filter @milsaca/mobile build:production
```

Auto-incrementa `versionCode` / `buildNumber`. Gera `.aab` (Android App
Bundle) e `.ipa`. Aguarde build verde.

### 3.3 Submeter

```bash
# Android (Play Console internal track)
pnpm --filter @milsaca/mobile submit:android

# iOS (TestFlight)
pnpm --filter @milsaca/mobile submit:ios
```

Primeiro submit precisa criar listing manualmente na console (nome,
descrição, screenshots, política de privacidade). Após isso, submits
seguintes vão diretos pra mesma listagem.

## 4. Atualizações OTA (futuro)

EAS Update permite hotfix em JS sem novo build. Configurar:

```bash
cd apps/mobile
npx eas-cli update:configure
```

Não está ativado nesta etapa.

## 5. Checklist pré-build

- [ ] Assets em `apps/mobile/assets/` (`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`)
- [ ] `app.json` aponta pros 4 assets corretamente (já configurado)
- [ ] `extra.eas.projectId` preenchido (via `eas init`)
- [ ] `version` no `app.json` está correto
- [ ] `.env.local` mobile tem `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` apontando pra produção
- [ ] `pnpm -F @milsaca/mobile lint` passa
- [ ] `pnpm -F @milsaca/mobile type-check` passa
- [ ] `pnpm -F @milsaca/mobile dev` abre no Expo Go sem erro

## 6. Variáveis de ambiente em produção

Diferente da Vercel, **as envs do mobile entram no bundle**. Configure:

### Opção A — Build secrets via EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://kulanbcyrfawlhrpqxtz.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..."
```

### Opção B — `.env.production` no projeto mobile

Não recomendado pra produção (lê do disco no momento do build), mas
serve pra dev.

> **Nunca** colocar `SUPABASE_SECRET_KEY` no mobile. Mobile só usa
> chave publishable.

## 7. Deep links

`scheme: milsaca` já configurado. URL `milsaca://entrar` abre o app
direto na tela de login (quando instalado). Pra Supabase mandar reset
de senha pelo mobile:

1. Supabase Dashboard → Auth → URL Configuration → Redirect URLs
2. Adicionar `milsaca://redefinir-senha`
3. Mobile precisa lidar com isso no `useEffect` do app root (não
   implementado ainda — fica como backlog)

## 8. Troubleshooting

| Sintoma | Causa | Fix |
|---|---|---|
| `Project ID is required` | Faltou `eas init` | Rodar `eas init` em `apps/mobile/` |
| Build falha "Asset not found" | Falta arquivo em `apps/mobile/assets/` | Vide `BRIEF.md` |
| Build iOS falha credentials | Apple Developer não pago ou device não registrado | `eas credentials` interativo |
| App abre branco | Bundle JS quebrou — sem auth | Verificar EXPO_PUBLIC_* via `eas secret:list` |
| `--frozen-lockfile` falha no build remoto | EAS roda na raiz do monorepo automaticamente | Confirmar `eas.json` sem hacks de path |

## 9. Próximos passos pós-EAS

1. **Push notifications** — Expo Push API + tabela `push_tokens` (Etapa 10)
2. **Sentry mobile** — `sentry-expo` (Etapa 10)
3. **Mixpanel/PostHog mobile** — analytics (Etapa 10)
4. **App Tracking Transparency (ATT)** prompt iOS — quando integrar analytics
5. **Localização nativa** — pedir permissão GPS (Etapa futura, quando filtrar por proximidade)
