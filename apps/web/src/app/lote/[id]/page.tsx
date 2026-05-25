import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Coffee,
  ExternalLink,
  MapPin,
  MessageCircle,
  Mountain,
  Package,
  Sparkles,
} from "lucide-react";
import { createClient } from "@milsaca/db/web/server";

/**
 * Página pública de um lote (anon-friendly via view `lotes_publicos`).
 *
 * Fluxo de uso: corretora cadastra/classifica um lote, copia o link
 * `/lote/<id>` e manda no WhatsApp/Telegram pra comprador. Comprador
 * abre sem login e tem todos os dados pra decidir + CTA WhatsApp pra
 * voltar pra corretora.
 *
 * Decisões:
 *   - Recebe `id` UUID (não slug humano) — corretor copia direto do card.
 *   - `notFound()` se status do lote é rascunho/arquivado (não está na view).
 *   - PII do produtor nunca é exposta — só nome e cidade (sem CPF/WhatsApp).
 *   - CTA principal volta pra corretora (não pro produtor).
 */

type Props = {
  params: Promise<{ id: string }>;
};

type LotePublic = {
  id: string;
  codigo: string;
  safra: string | null;
  descricao: string | null;
  specie: "arabica" | "conillon";
  processo: string | null;
  peso_sacas: number | string | null;
  status: string;
  created_at: string;
  corretora_name: string;
  corretora_slug: string;
  corretora_city: string | null;
  corretora_state: string | null;
  corretora_phone: string | null;
  corretora_email: string | null;
  corretora_descricao: string | null;
  corretora_logo_url: string | null;
  corretora_verified: boolean;
  produtor_nome: string | null;
  fazenda_nome: string | null;
  produtor_city: string | null;
  produtor_state: string | null;
  altitude_m: number | string | null;
  certificacoes: string[] | null;
  indicacao_geografica: string | null;
  classificacao_tipo: string | null;
  classificacao_fora_de_tipo: boolean | null;
  classificacao_bebida: string | null;
  classificacao_pontuacao: number | string | null;
  classificacao_peneira: string | null;
  classificacao_bica_corrida: boolean | null;
};

const SPECIE_LABEL: Record<"arabica" | "conillon", string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const PROCESSO_LABEL: Record<string, string> = {
  natural: "Natural",
  cd_desmucilado: "CD desmucilado",
  despolpado: "Despolpado",
  fermentacao_induzida: "Fermentação induzida",
};

const STATUS_LABEL: Record<string, string> = {
  aguardando_classificacao: "Aguardando classificação",
  classificado: "Classificado · disponível",
  fora_de_tipo: "Fora de tipo",
  rebeneficiar: "Rebeneficiar",
  vendido: "Vendido",
};

const STATUS_TONE: Record<string, string> = {
  aguardando_classificacao: "bg-milsaca-dourado/20 text-milsaca-verde",
  classificado: "bg-emerald-100 text-emerald-800",
  fora_de_tipo: "bg-rose-100 text-rose-800",
  rebeneficiar: "bg-amber-100 text-amber-800",
  vendido: "bg-milsaca-verde text-milsaca-cream",
};

const NUM = new Intl.NumberFormat("pt-BR");

function sanitizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes_publicos")
    .select("codigo, specie, peso_sacas, corretora_name")
    .eq("id", id)
    .maybeSingle<{
      codigo: string;
      specie: "arabica" | "conillon";
      peso_sacas: number | string | null;
      corretora_name: string;
    }>();
  if (!data) {
    return { title: "Lote não encontrado — Milsaca" };
  }
  const sacas = data.peso_sacas != null ? Number(data.peso_sacas) : null;
  return {
    title: `Lote ${data.codigo} · ${SPECIE_LABEL[data.specie]} — ${data.corretora_name}`,
    description: `Lote ${data.codigo} de ${SPECIE_LABEL[data.specie]}${sacas ? ` (${sacas} sacas)` : ""} ofertado pela ${data.corretora_name} via Milsaca.`,
  };
}

export default async function LotePublicoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lotes_publicos")
    .select("*")
    .eq("id", id)
    .maybeSingle<LotePublic>();

  if (!data) notFound();
  const l = data;

  const local = [l.produtor_city, l.produtor_state].filter(Boolean).join("/");
  const corretoraLocal = [l.corretora_city, l.corretora_state]
    .filter(Boolean)
    .join("/");
  const sacas = l.peso_sacas != null ? Number(l.peso_sacas) : null;
  const altitude = l.altitude_m != null ? Number(l.altitude_m) : null;
  const pontuacao =
    l.classificacao_pontuacao != null
      ? Number(l.classificacao_pontuacao)
      : null;

  const phoneDigits = sanitizePhone(l.corretora_phone);
  const waText = encodeURIComponent(
    `Olá! Vi o lote ${l.codigo} (${SPECIE_LABEL[l.specie]}${sacas ? `, ${sacas} sacas` : ""}) da ${l.corretora_name} no Milsaca. Quero conversar.`,
  );
  const waHref = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <main className="min-h-screen bg-milsaca-cream">
      {/* ============= HERO ============= */}
      <header className="bg-milsaca-cafezal px-6 py-12 text-milsaca-cream sm:px-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-milsaca-dourado">
              Lote
            </span>
            <span className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
              {l.codigo}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_TONE[l.status] ?? "bg-slate-100 text-slate-700"}`}
            >
              {STATUS_LABEL[l.status] ?? l.status}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-milsaca-cream sm:text-3xl">
            {SPECIE_LABEL[l.specie]}
            {l.processo
              ? ` · ${PROCESSO_LABEL[l.processo] ?? l.processo}`
              : ""}
            {sacas ? ` · ${NUM.format(sacas)} sacas` : ""}
          </h1>
          {l.descricao ? (
            <p className="text-sm leading-relaxed text-milsaca-cream/80 sm:text-base">
              {l.descricao}
            </p>
          ) : null}
        </div>
      </header>

      {/* ============= CTA principal ============= */}
      <section className="mx-auto -mt-8 max-w-3xl px-6 sm:px-0">
        <div className="rounded-card border border-milsaca-cream-escuro bg-white p-6 shadow-card-hover sm:p-8">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-milsaca-verde-claro">
                Ofertado pela
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-base font-semibold text-milsaca-verde">
                {l.corretora_name}
                {l.corretora_verified ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] font-medium text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40"
                    title="Corretora verificada pela Milsaca"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Verificada
                  </span>
                ) : null}
              </p>
              {corretoraLocal ? (
                <p className="text-xs text-milsaca-verde-claro">
                  {corretoraLocal}
                </p>
              ) : null}
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#25D366] px-5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ============= Grid de info ============= */}
      <section className="mx-auto mt-8 max-w-3xl space-y-4 px-6 pb-16 sm:px-0">
        {/* Classificação vigente */}
        {l.classificacao_tipo || l.classificacao_fora_de_tipo ? (
          <article className="rounded-card border border-milsaca-cream-escuro bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-milsaca-dourado" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
                Classificação
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <KvField
                label="Tipo"
                value={
                  l.classificacao_fora_de_tipo
                    ? "Fora de tipo"
                    : `Tipo ${l.classificacao_tipo ?? "?"}`
                }
                tone={l.classificacao_fora_de_tipo ? "danger" : "ok"}
              />
              {pontuacao != null ? (
                <KvField
                  label="Pontuação"
                  value={`${pontuacao > 0 ? "+" : ""}${pontuacao}`}
                />
              ) : null}
              {l.classificacao_bebida ? (
                <KvField label="Bebida" value={l.classificacao_bebida} />
              ) : null}
              <KvField
                label="Peneira"
                value={
                  l.classificacao_bica_corrida
                    ? "Bica corrida"
                    : (l.classificacao_peneira ?? "—")
                }
              />
            </div>
          </article>
        ) : null}

        {/* Origem do café */}
        <article className="rounded-card border border-milsaca-cream-escuro bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Coffee className="h-4 w-4 text-milsaca-cafezal" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-milsaca-verde-claro">
              Origem do café
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {l.produtor_nome ? (
              <KvField label="Produtor" value={l.produtor_nome} />
            ) : null}
            {l.fazenda_nome ? (
              <KvField label="Fazenda" value={l.fazenda_nome} />
            ) : null}
            {local ? (
              <KvField
                label="Região"
                value={local}
                icon={<MapPin className="h-3 w-3" />}
              />
            ) : null}
            {altitude != null ? (
              <KvField
                label="Altitude"
                value={`${NUM.format(altitude)} m`}
                icon={<Mountain className="h-3 w-3" />}
              />
            ) : null}
            {l.safra ? (
              <KvField
                label="Safra"
                value={l.safra}
                icon={<Calendar className="h-3 w-3" />}
              />
            ) : null}
            {sacas ? (
              <KvField
                label="Quantidade"
                value={`${NUM.format(sacas)} sacas (60 kg)`}
                icon={<Package className="h-3 w-3" />}
              />
            ) : null}
            {l.indicacao_geografica ? (
              <KvField
                label="Indicação geográfica"
                value={l.indicacao_geografica}
              />
            ) : null}
          </div>
          {l.certificacoes && l.certificacoes.length > 0 ? (
            <div className="mt-4 border-t border-milsaca-cream-escuro pt-4">
              <p className="text-[10px] uppercase tracking-wider text-milsaca-verde-claro/70">
                Certificações
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {l.certificacoes.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-milsaca-dourado/15 px-2.5 py-1 text-[11px] font-medium text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        {/* Corretora — link pra página pública */}
        <article className="rounded-card border border-milsaca-cream-escuro bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start gap-4">
            {l.corretora_logo_url ? (
              <Image
                src={l.corretora_logo_url}
                alt={`Logo ${l.corretora_name}`}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 shrink-0 rounded-lg border border-milsaca-cream-escuro bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-milsaca-dourado/20 text-2xl font-bold text-milsaca-dourado">
                {l.corretora_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-base font-semibold text-milsaca-verde">
                {l.corretora_name}
              </p>
              {corretoraLocal ? (
                <p className="text-xs text-milsaca-verde-claro">
                  {corretoraLocal}
                </p>
              ) : null}
              {l.corretora_descricao ? (
                <p className="line-clamp-2 text-xs text-milsaca-verde-claro/85">
                  {l.corretora_descricao}
                </p>
              ) : null}
            </div>
            <Link
              href={`/c/${l.corretora_slug}`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-milsaca-cafezal px-3 text-xs font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream"
            >
              Ver corretora
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </article>

        <p className="text-center text-[11px] text-milsaca-verde-claro/70">
          Lote ofertado via Milsaca · sistema de corretagem de café
        </p>
      </section>
    </main>
  );
}

function KvField({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "ok" | "danger";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-milsaca-verde-claro/70">
        {label}
      </p>
      <p
        className={`mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium ${
          tone === "danger"
            ? "text-rose-700"
            : tone === "ok"
              ? "text-emerald-700"
              : "text-milsaca-verde"
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
