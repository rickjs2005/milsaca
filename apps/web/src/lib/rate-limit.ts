import { createClient } from "@milsaca/db/web/server";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Rate limit via Supabase RPC `check_and_increment_rate`.
 *
 * Não usa Upstash/Redis pra evitar custo/setup extra; o backing store
 * é a tabela `rate_limits` na mesma instância Supabase.
 *
 * Cada chamada incrementa o contador da janela atual. Se hits > limit,
 * retorna `{ allowed: false, retryAfterSeconds }`.
 */
export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_and_increment_rate", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  // Failure aberta: se a RPC falhar, deixa passar (DoS contra o próprio
  // banco não pode derrubar o app). Log interno em dev.
  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[rate-limit] RPC failed, allowing:", error);
    }
    return { allowed: true, hits: 0, retryAfterSeconds: 0 };
  }

  const d = data as {
    allowed?: boolean;
    hits?: number;
    retry_after_seconds?: number;
  };
  return {
    allowed: d.allowed ?? true,
    hits: d.hits ?? 0,
    retryAfterSeconds: d.retry_after_seconds ?? 0,
  };
}

/**
 * Hash do IP com salt do ambiente. Sem salt configurado, retorna o
 * primeiro octeto pra ter granularidade mínima sem PII.
 */
function hashIp(ip: string | null): string {
  if (!ip) return "no-ip";
  const salt = process.env.LEAD_IP_SALT;
  if (salt) {
    return createHash("sha256")
      .update(`${salt}|${ip}`)
      .digest("hex")
      .slice(0, 16);
  }
  // Fallback: usa só os 2 primeiros octetos (granularidade /16) pra
  // não armazenar IP cru no key.
  return ip.split(".").slice(0, 2).join(".") || "no-ip";
}

export function extractIp(req: NextRequest | Request): string | null {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip");
}

export function ipKey(req: NextRequest | Request, prefix: string): string {
  return `${prefix}:${hashIp(extractIp(req))}`;
}

export function identityKey(prefix: string, identity: string): string {
  // normaliza pra evitar bypass (Joao@x.com vs joao@x.com)
  return `${prefix}:${identity.trim().toLowerCase()}`;
}
