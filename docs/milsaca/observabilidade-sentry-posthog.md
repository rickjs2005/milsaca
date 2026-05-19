# Observabilidade — Sentry + PostHog

> Guia operacional pra ativar observabilidade quando provisionar as
> contas. Esta etapa **NÃO instalou** as libs porque ambas requerem
> conta externa + DSN/token específico.

## 1. Stack recomendada

| Função | Ferramenta | Custo | Por quê |
|---|---|---|---|
| Errors / performance | **Sentry** | Free 5k errors/mês | Padrão de mercado, integra Next + Expo |
| Product analytics | **PostHog** | Free 1M events/mês | Self-hostable, LGPD-friendly, session replay opcional |
| Uptime monitoring | **BetterStack** (ou **UptimeRobot**) | Free | Ping a cada 3-5min |

Alternativas se quiser **um só backend**: Logtail (Logs) + Plausible (Web Analytics) — mais simples, mas perde correlação.

## 2. Sentry (errors + performance)

### 2.1 Conta

1. Criar projeto em https://sentry.io (free tier)
2. Criar **2 projetos**: `milsaca-web` (Next.js) e `milsaca-mobile` (React Native)
3. Anotar **DSN** de cada um

### 2.2 Web (Next 16)

```bash
cd apps/web
pnpm add @sentry/nextjs
```

Criar `apps/web/sentry.client.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Não enviar erros em dev
    if (process.env.NODE_ENV !== "production") return null;
    return event;
  },
});
```

Análogo pra `sentry.server.config.ts` e `sentry.edge.config.ts`.

Atualizar `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
// ...
export default withSentryConfig(config, {
  silent: true,
  org: "milsaca",
  project: "milsaca-web",
});
```

Envs novas (Vercel):
- `NEXT_PUBLIC_SENTRY_DSN` (público, OK no client)
- `SENTRY_AUTH_TOKEN` (build-time, sourcemaps upload)

### 2.3 Mobile (Expo SDK 54)

```bash
cd apps/mobile
pnpm add @sentry/react-native sentry-expo
```

`app.json` ganha plugin:

```json
"plugins": [
  "expo-router",
  "expo-font",
  "expo-secure-store",
  "sentry-expo"
]
```

Inicializar em `apps/mobile/app/_layout.tsx`:

```ts
import * as Sentry from "sentry-expo";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: false,
});
```

Envs (`.env.local` mobile + EAS secrets):
- `EXPO_PUBLIC_SENTRY_DSN`

### 2.4 CSP

Atualizar `connect-src` em `next.config.ts`:

```
https://*.sentry.io
```

### 2.5 Filtrar PII

Por LGPD, configurar `Sentry.init` com:

```ts
sendDefaultPii: false,
beforeSend(event) {
  if (event.user?.email) {
    event.user.email = `***@${event.user.email.split("@")[1]}`;
  }
  return event;
}
```

## 3. PostHog (product analytics)

### 3.1 Conta

1. Criar conta em https://posthog.com (US-region) ou self-host
2. Criar projeto **milsaca-web** (instance única, cobre mobile também)
3. Anotar **Project API key**

### 3.2 Web

```bash
cd apps/web
pnpm add posthog-js posthog-node
```

Provider em `apps/web/src/components/posthog-provider.tsx` (client):

```tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // controle manual
      autocapture: false,
    });
  }, []);
  return (
    <>
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
      {children}
    </>
  );
}

function PageView() {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (!pathname) return;
    posthog.capture("$pageview", {
      pathname,
      search: params.toString() || undefined,
    });
  }, [pathname, params]);
  return null;
}
```

Wrap no `app/layout.tsx`.

### 3.3 Identify após login

No `entrar/_actions.ts`, após auth OK e antes do redirect:

```ts
// posthog.identify cliente-side via cookie ou usar posthog-node aqui
```

(Tipicamente é melhor fazer client-side num `useEffect` consumindo session — fora do escopo deste doc.)

### 3.4 Eventos a capturar

| Evento | Quem dispara | Props relevantes |
|---|---|---|
| `signup` | /cadastrar | role, has_corretora_dados |
| `signin` | /entrar | role, is_admin |
| `whatsapp_click` | catalogo | corretora_id, source, has_lat_lng |
| `lead_created` | corretora cria lead | corretora_id |
| `contrato_created` | corretora | corretora_id, total_value |
| `subscription_paid` | admin marca paga | corretora_id, plan_id, period |
| `corretora_approved` | admin aprova | corretora_id, dias_desde_signup |

### 3.5 Envs (Vercel)

- `NEXT_PUBLIC_POSTHOG_KEY` (público)
- `NEXT_PUBLIC_POSTHOG_HOST` (padrão `https://us.i.posthog.com`)

### 3.6 LGPD

PostHog tem **opt-out por sessão** nativo:

```ts
posthog.opt_out_capturing();
```

Adicionar tela `/configuracoes/privacidade` quando criar.

### 3.7 CSP

Atualizar `connect-src`:

```
https://us.i.posthog.com
https://us-assets.i.posthog.com
```

## 4. Uptime (BetterStack ou UptimeRobot)

### 4.1 Heartbeat URL

Pra monitorar a edge function `sync-cotacoes`, criar um endpoint
HEAD `/api/health` que retorna 200 se Supabase responde:

```ts
// apps/web/src/app/api/health/route.ts
import { createClient } from "@milsaca/db/web/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("corretoras_publicas")
    .select("id")
    .limit(1)
    .maybeSingle();
  return NextResponse.json(
    { ok: !error, ts: new Date().toISOString() },
    { status: error ? 503 : 200 },
  );
}
```

### 4.2 Checks recomendados

| Check | URL | Intervalo |
|---|---|---|
| Home | `https://milsaca.app/` | 5min |
| Health API | `https://milsaca.app/api/health` | 3min |
| Login page | `https://milsaca.app/entrar` | 10min |
| Cron sync-cotacoes | `https://<supabase>.functions.supabase.co/sync-cotacoes` | (Supabase tem dashboard próprio) |

### 4.3 Alertas

- 1ª falha → notificação Slack/Discord
- 2 falhas consecutivas → email + SMS

## 5. Roadmap de eventos pelo funil

Quando PostHog estiver ativo:

```
Funnel: Produtor → Conversão
─────────────────────────────────────────────
1. signup (role=produtor)
2. onboarding_completed
3. catalogo_viewed
4. whatsapp_click
5. lead_created (corretora cria)
6. contrato_created
7. entrega_recebida
```

Plotar drop-off entre etapas no PostHog Insights.

## 6. Custos estimados (até 10k corretoras pilotos)

| Serviço | Free tier | Excede em... |
|---|---|---|
| Sentry | 5k errors/mês | >100 erros/dia em prod = upgrade ($26/mês) |
| PostHog | 1M events/mês | Improvável até 10k usuários ativos |
| BetterStack | 10 monitors free | Improvável |

**Total estimado mensal pra MVP**: ~$0 nos primeiros 6 meses.

## 7. Quando ativar

| Marco | Sentry | PostHog | Uptime |
|---|---|---|---|
| Deploy Vercel ✅ | **agora** | **agora** | depois |
| 5 corretoras piloto | ✅ | ✅ | **ativar** |
| Cobrança ativa | ✅ | ✅ | ✅ |
| 50+ corretoras | ✅ (paid) | ✅ | ✅ |
