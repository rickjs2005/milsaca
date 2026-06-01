import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@milsaca/db/web/server";
import { createHash } from "node:crypto";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";
import { logger, safeError } from "@/lib/logger";

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
 * Monta a mensagem default que chega na corretora.
 *
 * Quando o produtor está logado e tem perfil preenchido, inclui nome,
 * fazenda, cidade e tipo de café — corretora consegue responder com
 * contexto sem perguntar o básico. Sem produtor, mensagem genérica.
 */
function buildDefaultMessage(
  corretoraNome: string,
  ctx: {
    primeiroNome: string | null;
    fazenda: string | null;
    cidade: string | null;
    uf: string | null;
    specieLabel: string | null;
  },
): string {
  if (!ctx.primeiroNome && !ctx.fazenda && !ctx.cidade && !ctx.specieLabel) {
    return `Oi! Vi a ${corretoraNome} no Milsaca e gostaria de conversar sobre cotações de café.`;
  }

  const linhas: string[] = [];
  linhas.push(`Olá, ${corretoraNome}! Vim pelo Milsaca.`);
  linhas.push("");

  if (ctx.primeiroNome) {
    const fazendaSuffix = ctx.fazenda ? `, da ${ctx.fazenda}` : "";
    linhas.push(`Sou ${ctx.primeiroNome}${fazendaSuffix}.`);
  } else if (ctx.fazenda) {
    linhas.push(`Falo da ${ctx.fazenda}.`);
  }

  if (ctx.cidade || ctx.uf) {
    const local = [ctx.cidade, ctx.uf].filter(Boolean).join("/");
    linhas.push(`Estou em ${local}.`);
  }

  if (ctx.specieLabel) {
    linhas.push(`Produzo café ${ctx.specieLabel}.`);
  }

  linhas.push("");
  linhas.push("Gostaria de conversar sobre cotações.");

  return linhas.join("\n");
}

/**
 * Registra um lead de WhatsApp e retorna a URL pra abrir o app.
 *
 * NÃO armazena IP cru. NÃO captura conversa subsequente.
 * Falha-silenciosa em erros não-críticos: sempre retorna { wa_url }
 * pra não travar a UX. O insert em whatsapp_leads é fire-and-forget —
 * se falhar, devolvemos { logged: false } e seguimos (não há trilha de
 * audit interno aqui).
 */
export async function POST(req: NextRequest) {
  const reqId = req.headers.get("x-request-id") ?? undefined;
  const log = logger.child({ reqId });

  // Rate limit por IP: 30 cliques/min. Generoso pra não atrapalhar uso
  // legítimo (produtor pode clicar várias corretoras seguidas) mas
  // corta scraping/spam.
  const rl = await checkRateLimit(ipKey(req, "wa-leads"), 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

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

  // Identifica o produtor logado (pode ser null pra rota anon) pra
  // enriquecer a mensagem com nome, fazenda, cidade e tipo de café.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const SPECIE_LABEL: Record<string, string> = {
    arabica: "Arábica",
    conillon: "Conillón",
    ambos: "Arábica + Conillón",
  };

  let produtorContext: {
    primeiroNome: string | null;
    fazenda: string | null;
    cidade: string | null;
    uf: string | null;
    specieLabel: string | null;
  } = {
    primeiroNome: null,
    fazenda: null,
    cidade: null,
    uf: null,
    specieLabel: null,
  };

  if (user) {
    const [{ data: profile }, { data: produtor }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("produtores")
        .select("fazenda_nome, city, state, specie")
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);
    const fullName = profile?.full_name ?? null;
    const primeiroNome = fullName ? fullName.split(" ")[0] : null;
    produtorContext = {
      primeiroNome: primeiroNome ?? null,
      fazenda: produtor?.fazenda_nome ?? null,
      cidade: produtor?.city ?? null,
      uf: produtor?.state ?? null,
      specieLabel: produtor?.specie
        ? (SPECIE_LABEL[produtor.specie] ?? produtor.specie)
        : null,
    };
  }

  const defaultMessage = buildDefaultMessage(
    corretora.name ?? "a corretora",
    produtorContext,
  );
  const text = (body.message ?? defaultMessage).slice(0, 1000);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;

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

  if (insertError) {
    log.warn("wa_lead_insert_falhou", { err: safeError(insertError) });
  }

  return NextResponse.json({
    wa_url: waUrl,
    logged: !insertError,
  });
}
