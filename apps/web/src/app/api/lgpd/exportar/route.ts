import { NextResponse } from "next/server";
import { createClient } from "@milsaca/db/web/server";
import { requireUser } from "@/lib/auth";
import { logger, safeError } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Portabilidade LGPD (art. 18, V/IX) — achado 3.3.
 *
 * GET autenticado que reúne, num único JSON, os dados pessoais do
 * titular logado: profile, dados de produtor/corretora vinculados,
 * consentimentos LGPD, e os negócios em que ele aparece (leads e
 * contratos). Self-service: a RLS já garante que o usuário só lê o que
 * é dele — não usamos service_role aqui.
 *
 * Devolve com Content-Disposition: attachment pra baixar como arquivo.
 */
export async function GET(request: Request) {
  const user = await requireUser("/api/lgpd/exportar");
  const supabase = await createClient();
  const reqId = request.headers.get("x-request-id") ?? undefined;
  const log = logger.child({ reqId });

  // profile do titular
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    log.warn("lgpd_export_query_parcial", {
      part: "profile",
      err: safeError(profileError),
    });
  }

  // produtor (1-1 com profile, se houver)
  const { data: produtor, error: produtorError } = await supabase
    .from("produtores")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (produtorError) {
    log.warn("lgpd_export_query_parcial", {
      part: "produtor",
      err: safeError(produtorError),
    });
  }

  // corretora vinculada (se o titular for corretora)
  let corretora: unknown = null;
  const corretoraId =
    profile && typeof profile === "object" && "corretora_id" in profile
      ? (profile as { corretora_id: string | null }).corretora_id
      : null;
  if (corretoraId) {
    const { data, error: corretoraError } = await supabase
      .from("corretoras")
      .select("*")
      .eq("id", corretoraId)
      .maybeSingle();
    if (corretoraError) {
      log.warn("lgpd_export_query_parcial", {
        part: "corretora",
        err: safeError(corretoraError),
      });
    }
    corretora = data ?? null;
  }

  // consentimentos LGPD do titular
  const { data: consents, error: consentsError } = await supabase
    .from("lgpd_consents")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (consentsError) {
    log.warn("lgpd_export_query_parcial", {
      part: "consentimentos",
      err: safeError(consentsError),
    });
  }

  // leads em que o titular é o produtor
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("produtor_id", user.id)
    .order("created_at", { ascending: false });
  if (leadsError) {
    log.warn("lgpd_export_query_parcial", {
      part: "leads",
      err: safeError(leadsError),
    });
  }

  // contratos em que o titular é o produtor
  const { data: contratos, error: contratosError } = await supabase
    .from("contratos")
    .select("*")
    .eq("produtor_id", user.id)
    .order("created_at", { ascending: false });
  if (contratosError) {
    log.warn("lgpd_export_query_parcial", {
      part: "contratos",
      err: safeError(contratosError),
    });
  }

  const payload = {
    titular: { id: user.id, email: user.email ?? null },
    exportado_em: new Date().toISOString(),
    aviso:
      "Exportação de dados pessoais conforme LGPD (Lei 13.709/2018). " +
      "Inclui os dados a que você tem acesso na plataforma Milsaca.",
    dados: {
      profile: profile ?? null,
      produtor: produtor ?? null,
      corretora,
      consentimentos: consents ?? [],
      leads: leads ?? [],
      contratos: contratos ?? [],
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-milsaca.json"',
      "Cache-Control": "no-store",
    },
  });
}
