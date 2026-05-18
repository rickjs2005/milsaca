import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@milsaca/db/web/server";
import { createHash } from "node:crypto";

type RequestBody = {
  corretora_id?: string;
  source?: "catalogo_corretoras" | "perfil_corretora" | "home_publica" | "outro";
  message?: string;
};

const VALID_SOURCES = new Set([
  "catalogo_corretoras",
  "perfil_corretora",
  "home_publica",
  "outro",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hash do IP com salt fixo do ambiente. Não armazenamos IP cru pra
 * minimizar pegada LGPD; o hash permite distinguir cliques unique
 * sem identificar o visitante. Se faltar salt, retorna null (não loga).
 */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.LEAD_IP_SALT;
  if (!salt) return null;
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
}

function extractIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

/**
 * Registra um lead de WhatsApp e retorna a URL pra abrir o app.
 *
 * NÃO armazena IP cru. NÃO captura conversa subsequente.
 * Falha-silenciosa em erros não-críticos: sempre retorna { wa_url }
 * pra não travar a UX. Erros vão pro audit interno.
 */
export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const corretoraId = String(body.corretora_id ?? "").trim();
  if (!UUID_RE.test(corretoraId)) {
    return NextResponse.json({ error: "corretora_id inválido" }, { status: 400 });
  }

  const sourceRaw = body.source ?? "catalogo_corretoras";
  const source = VALID_SOURCES.has(sourceRaw)
    ? sourceRaw
    : "catalogo_corretoras";

  const supabase = await createClient();

  const { data: corretora } = await supabase
    .from("corretoras_publicas")
    .select("id, name, phone, slug")
    .eq("id", corretoraId)
    .maybeSingle();

  if (!corretora || !corretora.phone) {
    return NextResponse.json(
      { error: "corretora sem WhatsApp configurado" },
      { status: 404 },
    );
  }

  // Monta a URL wa.me a partir do phone da corretora
  const digits = String(corretora.phone).replace(/\D/g, "");
  const normalizedPhone =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (normalizedPhone.length < 12) {
    return NextResponse.json(
      { error: "telefone da corretora inválido" },
      { status: 400 },
    );
  }

  const defaultMessage = `Oi! Vi a ${corretora.name} no Milsaca e gostaria de conversar sobre cotações de café.`;
  const text = (body.message ?? defaultMessage).slice(0, 1000);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;

  // Identifica o produtor logado (pode ser null pra rota anon)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ipHash = hashIp(extractIp(req));
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  // Insert é fire-and-forget — se falhar, ainda retornamos wa_url
  const { error: insertError } = await supabase
    .from("whatsapp_leads")
    .insert({
      corretora_id: corretoraId,
      produtor_id: user?.id ?? null,
      source,
      message: text,
      user_agent: ua,
      ip_hash: ipHash,
    });

  return NextResponse.json({
    wa_url: waUrl,
    logged: !insertError,
  });
}
