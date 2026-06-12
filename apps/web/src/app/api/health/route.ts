import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Health check público (P0 da auditoria 2026-06-12).
 *
 * Pra um monitor externo (UptimeRobot etc.):
 *   - HTTP 503 + status "down"      → banco inacessível (alerta de queda)
 *   - HTTP 200 + status "degraded"  → app de pé MAS há despachos/eventos
 *     falhando na fila (configurar alerta por PALAVRA-CHAVE "degraded" —
 *     é assim que o aviso de fila chega num humano, já que o cron
 *     check_queue_failures só grava em system_events)
 *   - HTTP 200 + status "ok"        → tudo certo
 *
 * Não expõe dado nenhum além de contadores agregados.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let db = false;
  let queueFailed24h: number | null = null;

  const admin = createAdminClient();
  if (admin) {
    const [ping, fila] = await Promise.all([
      admin.from("platform_settings").select("key", { head: true, count: "exact" }).limit(1),
      admin
        .from("system_events")
        .select("id", { head: true, count: "exact" })
        .eq("status", "failed")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);
    db = !ping.error;
    if (!fila.error) queueFailed24h = fila.count ?? 0;
  } else {
    // sem SUPABASE_SECRET_KEY (ex.: dev local) — degrada pro ping anônimo
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        {
          cache: "no-store",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
          },
        },
      );
      db = res.ok;
    } catch {
      db = false;
    }
  }

  const status = !db ? "down" : queueFailed24h && queueFailed24h > 0 ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      db,
      queue_failed_24h: queueFailed24h,
      latency_ms: Date.now() - startedAt,
      ts: new Date().toISOString(),
    },
    {
      status: status === "down" ? 503 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
