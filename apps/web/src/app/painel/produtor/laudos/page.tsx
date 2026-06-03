import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileCheck2,
  QrCode,
  Download,
  Coffee,
  Filter,
  Droplets,
  Star,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { loadComprometidoPorLote } from "../_lib/estoque";

export const metadata = { title: "Meu Café — Milsaca" };

const BRL_SACA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const BRL_TOTAL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Row = {
  id: string;
  lote_id: string;
  tipo: string | null;
  fora_de_tipo: boolean;
  bebida: string | null;
  peneira_dominante: string | null;
  pva: number | string | null;
  created_at: string;
  lote:
    | { codigo: string; specie: string; processo: string | null; safra: string | null; peso_sacas: number | string | null }
    | { codigo: string; specie: string; processo: string | null; safra: string | null; peso_sacas: number | string | null }[]
    | null;
  corretora: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function specieLabel(s: string | undefined): string {
  if (s === "arabica") return "Arábica";
  if (s === "conillon") return "Conillón";
  return "—";
}

// Tradução simples do laudo pro produtor: "isso é bom ou ruim?".
// COB IN 8/2003: tipo menor = melhor (menos defeitos).
function veredito(
  tipo: string | null,
  foraDeTipo: boolean,
): { label: string; tone: StatusTone; icon: LucideIcon } {
  if (foraDeTipo) {
    return {
      label: "Fora de tipo — rebenefício recomendado",
      tone: "danger",
      icon: CheckCircle2,
    };
  }
  const n = tipo ? parseInt(tipo, 10) : NaN;
  if (!Number.isNaN(n) && n <= 3) {
    return { label: "Café de qualidade superior", tone: "premium", icon: Star };
  }
  if (!Number.isNaN(n) && n <= 6) {
    return {
      label: "Boa para comercialização",
      tone: "success",
      icon: CheckCircle2,
    };
  }
  return { label: "Comercializável", tone: "neutral", icon: CheckCircle2 };
}

export default async function MinhasSacasPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const [laudosRes, cotRes] = await Promise.all([
    supabase
      .from("classificacoes_cob")
      .select(
        `id, lote_id, tipo, fora_de_tipo, bebida, peneira_dominante, pva, created_at,
         lote:lotes!classificacoes_cob_lote_id_fkey(codigo, specie, processo, safra, peso_sacas),
         corretora:corretoras!classificacoes_cob_corretora_id_fkey(name)`,
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("cotacoes")
      .select("specie, price, reference_date")
      .order("reference_date", { ascending: false })
      .limit(50),
  ]);

  // RLS filtra pra produtor só ver os próprios laudos (via lote.produtor_id)
  const rows = (laudosRes.data ?? []) as Row[];

  // Sacas já comprometidas por lote (contratos não-cancelados) → quanto sobra.
  const comprometido = await loadComprometidoPorLote(
    rows.map((r) => r.lote_id),
  );

  // Última cotação por espécie → conecta laudo com dinheiro.
  const precoPorSpecie = new Map<string, number>();
  for (const c of (cotRes.data ?? []) as Array<{
    specie: string;
    price: number;
  }>) {
    if (!precoPorSpecie.has(c.specie)) precoPorSpecie.set(c.specie, Number(c.price));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Meu Café</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Seus lotes com classificação de qualidade e o valor estimado hoje.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileCheck2}
              title="Você ainda não tem lotes classificados"
              description="Quando a corretora classificar um dos seus lotes, ele aparece aqui — com a classificação, PDF e QR público pra você compartilhar."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const lote = pickOne(r.lote);
            const cor = pickOne(r.corretora);
            const pva = r.pva != null ? Number(r.pva) : null;
            const peso = lote?.peso_sacas != null ? Number(lote.peso_sacas) : null;
            const com = comprometido[r.lote_id] ?? 0;
            const totalSacas = peso ?? 0;
            const preco = lote ? (precoPorSpecie.get(lote.specie) ?? null) : null;
            const vd = veredito(r.tipo, r.fora_de_tipo);
            const VdIcon = vd.icon;

            return (
              <Card key={r.id} interactive>
                <CardContent className="space-y-4 p-card">
                  {/* Topo: lote + Tipo em destaque */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-caption text-milsaca-dourado-texto">
                        {lote?.codigo ?? "—"}
                      </p>
                      <p className="mt-0.5 text-body-sm font-medium text-milsaca-cafezal">
                        {specieLabel(lote?.specie)}
                        {lote?.processo ? ` · ${lote.processo}` : ""}
                        {lote?.safra ? ` · ${lote.safra}` : ""}
                      </p>
                      {totalSacas > 0 ? (
                        <p className="mt-0.5 text-caption text-neutral-600">
                          {com > 0
                            ? `${com} de ${totalSacas} sacas vendidas · ${Math.max(0, totalSacas - com)} disponíveis`
                            : `${totalSacas} sacas disponíveis`}
                        </p>
                      ) : null}
                    </div>
                    {r.fora_de_tipo ? (
                      <StatusBadge tone="danger">Fora de tipo</StatusBadge>
                    ) : (
                      <span className="shrink-0 rounded-pill bg-milsaca-cafezal px-3 py-1 text-body-sm font-bold text-milsaca-cream">
                        Tipo {r.tipo ?? "—"}
                      </span>
                    )}
                  </div>

                  {/* Veredito simples: bom ou ruim? */}
                  <StatusBadge tone={vd.tone}>
                    <VdIcon className="h-3.5 w-3.5" />
                    {vd.label}
                  </StatusBadge>

                  {/* Atributos com ícones, legíveis */}
                  <div className="grid grid-cols-3 gap-2">
                    <Atributo icon={Coffee} label="Bebida" value={r.bebida ?? "—"} />
                    <Atributo
                      icon={Filter}
                      label="Peneira"
                      value={r.peneira_dominante ?? "—"}
                    />
                    <Atributo
                      icon={Droplets}
                      label="PVA"
                      value={pva != null ? `${pva.toFixed(1)}%` : "—"}
                    />
                  </div>

                  {/* Conecta laudo → dinheiro */}
                  {preco != null ? (
                    <div className="rounded-md bg-milsaca-cream/70 px-3 py-2.5">
                      <p className="text-caption text-neutral-500">
                        Valor estimado hoje
                      </p>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-h3 font-bold text-milsaca-cafezal">
                          {BRL_SACA.format(preco)}
                          <span className="text-caption font-normal text-neutral-500">
                            /saca
                          </span>
                        </p>
                        {totalSacas > 0 ? (
                          <p className="text-body-sm font-semibold text-milsaca-cafezal">
                            {Math.max(0, totalSacas - com) > 0
                              ? `${BRL_TOTAL.format(Math.max(0, totalSacas - com) * preco)} disponível`
                              : "Vendido"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <p className="text-caption text-neutral-500">
                    Classificado por {cor?.name ?? "—"} em {fmtDate(r.created_at)}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/laudos/${r.id}`} target="_blank">
                        <QrCode className="mr-1.5 h-3.5 w-3.5" />
                        Link público
                      </Link>
                    </Button>
                    <Button asChild variant="primary" size="sm" className="flex-1">
                      <Link href={`/laudos/${r.id}/pdf`} target="_blank">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Baixar PDF
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Atributo({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-neutral-100 bg-white px-2.5 py-2 text-center">
      <Icon className={cn("mx-auto h-4 w-4 text-milsaca-dourado")} />
      <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="text-body-sm font-semibold text-milsaca-cafezal">{value}</p>
    </div>
  );
}
