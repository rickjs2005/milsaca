import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { getProfile } from "@/lib/auth";
import { deadlineStatus } from "@/lib/deadline";
import { getComprador, getCompradorHistorico } from "../_lib/queries";
import {
  OFERTA_STATUS_LABEL,
  OFERTA_STATUS_TONE,
  type OfertaStatus,
} from "../../ofertas/_lib/oferta-meta";
import { CompradorFormFields } from "../_form";
import { toggleCompradorAtivo, updateComprador } from "../_actions";

export const metadata = { title: "Comprador — Milsaca" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const NUM = new Intl.NumberFormat("pt-BR");

const CONTRATO_TONE: Record<string, StatusTone> = {
  rascunho: "neutral",
  ativo: "success",
  finalizado: "premium",
  cancelado: "danger",
};
const CONTRATO_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function fmtDate(iso: string) {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default async function CompradorDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const sp = await searchParams;
  const [c, hist] = await Promise.all([
    getComprador(profile.corretora_id, id),
    getCompradorHistorico(profile.corretora_id, id),
  ]);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/painel/corretora/compradores"
          className="inline-flex items-center gap-1 text-body-sm text-neutral-600 transition-colors hover:text-milsaca-cafezal"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Compradores
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-neutral-600">
            {c.ativo ? (
              <StatusBadge tone="success">Ativo</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Inativo</StatusBadge>
            )}
            {c.tipo ? <span className="capitalize">· {c.tipo}</span> : null}
            {c.city ? (
              <span>
                · {c.city}
                {c.state ? `/${c.state}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <form action={toggleCompradorAtivo} className="inline">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="ativo" value={c.ativo ? "false" : "true"} />
          <Button type="submit" variant="outline">
            {c.ativo ? "Desativar" : "Ativar"}
          </Button>
        </form>
      </header>

      {sp.saved ? (
        <div className="flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-2 text-body-sm text-success-700">
          <CheckCircle2 className="h-4 w-4" />
          Atualizado.
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-md border border-danger-100 bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
          {sp.error}
        </div>
      ) : null}

      {/* Stats do relacionamento */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Total comprado"
          value={BRL.format(hist.stats.totalComprado)}
          premium
        />
        <MiniStat
          label="Comissão gerada"
          value={BRL.format(hist.stats.comissaoGerada)}
        />
        <MiniStat label="Contratos" value={NUM.format(hist.stats.contratos)} />
        <MiniStat
          label="Ofertas abertas"
          value={NUM.format(hist.stats.ofertasAbertas)}
        />
      </section>

      {/* Contratos com este comprador */}
      <section className="space-y-2">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Contratos
        </h2>
        {hist.contratos.length === 0 ? (
          <EmptyLine text="Nenhum contrato com este comprador ainda." />
        ) : (
          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {hist.contratos.map((ct) => (
                <Link
                  key={ct.id}
                  href={`/painel/corretora/contratos/${ct.id}`}
                  className="flex items-center justify-between gap-3 px-card py-3 transition-colors hover:bg-milsaca-cream first:rounded-t-card last:rounded-b-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 font-mono text-body-sm font-medium text-milsaca-cafezal">
                      <FileText className="h-3.5 w-3.5 text-neutral-400" />
                      {ct.code}
                    </p>
                    <p className="mt-0.5 text-caption text-neutral-500">
                      {fmtDate(ct.created_at)}
                      {ct.comissao_total != null
                        ? ` · comissão ${BRL.format(ct.comissao_total)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-body-sm font-semibold tabular-nums text-milsaca-cafezal">
                      {ct.total_value != null ? BRL.format(ct.total_value) : "—"}
                    </span>
                    <StatusBadge tone={CONTRATO_TONE[ct.status] ?? "neutral"}>
                      {CONTRATO_LABEL[ct.status] ?? ct.status}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ofertas a este comprador */}
      <section className="space-y-2">
        <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Ofertas
        </h2>
        {hist.ofertas.length === 0 ? (
          <EmptyLine text="Nenhuma oferta a este comprador ainda." />
        ) : (
          <Card>
            <CardContent className="divide-y divide-neutral-200 p-0">
              {hist.ofertas.map((o) => {
                const d = deadlineStatus(o.validade_ate);
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 px-card py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-body-sm font-medium text-milsaca-cafezal">
                        {o.lote_codigo ?? "—"}
                      </p>
                      <p className="mt-0.5 text-caption text-neutral-500">
                        {o.bag_count != null ? `${o.bag_count} sc · ` : ""}
                        {BRL.format(o.preco_saca)}/sc
                        {o.validade_ate ? ` · ${d.label}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-body-sm font-semibold tabular-nums text-milsaca-cafezal">
                        {o.total != null ? BRL.format(o.total) : "—"}
                      </span>
                      <StatusBadge
                        tone={OFERTA_STATUS_TONE[o.status as OfertaStatus] ?? "neutral"}
                      >
                        {OFERTA_STATUS_LABEL[o.status as OfertaStatus] ?? o.status}
                      </StatusBadge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Dados (edição) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-h3">Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateComprador} className="space-y-4">
            <input type="hidden" name="id" value={c.id} />
            <CompradorFormFields defaults={c} />
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  premium,
}: {
  label: string;
  value: string;
  premium?: boolean;
}) {
  return (
    <Card tone={premium ? "premium" : "default"}>
      <CardContent className="p-3 sm:p-card">
        <p className="text-caption font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-h3 leading-none tabular-nums text-milsaca-cafezal">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <Card tone="muted" className="border-dashed">
      <CardContent className="flex items-center gap-2 px-card py-4 text-caption text-neutral-500">
        <Store className="h-4 w-4 text-neutral-400" />
        {text}
      </CardContent>
    </Card>
  );
}
