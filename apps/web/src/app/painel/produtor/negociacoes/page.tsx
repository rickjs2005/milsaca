import Link from "next/link";
import { Handshake, MessageCircle, Coffee, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { coffeeLabel } from "@/lib/coffee";
import { requireUser, getProfile } from "@/lib/auth";
import {
  listMinhasNegociacoes,
  LEAD_STATUS_LABEL,
  type LeadStatus,
  type NegociacaoListItem,
} from "./_lib/queries";
import { buildWhatsAppInviteUrl } from "../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Negociações — Painel do produtor" };

type SearchParams = Promise<{ status?: string }>;

const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "premium",
  em_negociacao: "info",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};

const BRL0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function isLeadStatus(v: string | undefined): v is LeadStatus {
  return (
    v === "novo" ||
    v === "em_negociacao" ||
    v === "convertido" ||
    v === "perdido"
  );
}

function totalOf(it: NegociacaoListItem): number | null {
  return it.proposed_price != null && it.bag_count != null
    ? it.proposed_price * it.bag_count
    : null;
}

function shortMessage(item: NegociacaoListItem, nome: string | null) {
  const intro = nome ? `Oi! Aqui é ${nome}, da Milsaca.` : "Oi! Aqui é da Milsaca.";
  let proposta = "Sobre a proposta";
  if (item.coffee_type) proposta += ` de ${coffeeLabel(item.coffee_type)}`;
  if (item.bag_count) proposta += ` (${item.bag_count} sacas)`;
  if (item.proposed_price != null) {
    proposta += ` a R$ ${item.proposed_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/sc`;
  }
  proposta += " — tudo certo?";
  return `${intro}\n${proposta}\nPodemos conversar pra acertar os detalhes?`;
}

export default async function NegociacoesProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/painel/produtor/negociacoes");
  const profile = await getProfile();
  const nome = profile?.full_name?.trim() || null;
  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : undefined;

  // Carrega TODAS pra montar resumo/contagens; filtra em memória pra exibir.
  const todas = await listMinhasNegociacoes(user.id);
  const itens = status ? todas.filter((t) => t.status === status) : todas;

  const countBy = (s: LeadStatus) =>
    todas.filter((t) => t.status === s).length;
  const counts = {
    novo: countBy("novo"),
    em_negociacao: countBy("em_negociacao"),
    convertido: countBy("convertido"),
    perdido: countBy("perdido"),
  };
  const ativas = counts.novo + counts.em_negociacao;
  const valorEmNeg = todas
    .filter((t) => t.status === "novo" || t.status === "em_negociacao")
    .reduce((s, t) => s + (totalOf(t) ?? 0), 0);

  const FILTERS: { value: "" | LeadStatus; label: string; count: number }[] = [
    { value: "", label: "Todas", count: todas.length },
    { value: "novo", label: "Novas", count: counts.novo },
    { value: "em_negociacao", label: "Em negociação", count: counts.em_negociacao },
    { value: "convertido", label: "Convertidas", count: counts.convertido },
    { value: "perdido", label: "Recusadas", count: counts.perdido },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Negociações</h1>
        <p className="text-body-sm text-neutral-600">
          Suas propostas: quem ofereceu, quanto você recebe e fale no WhatsApp.
        </p>
      </header>

      {/* Resumo no topo — contexto imediato */}
      <div className="grid grid-cols-3 gap-3">
        <ResumoStat
          valor={`${ativas}`}
          label={ativas === 1 ? "proposta ativa" : "propostas ativas"}
        />
        <ResumoStat
          valor={BRL0.format(valorEmNeg)}
          label="em negociação"
          premium
        />
        <ResumoStat
          valor={`${counts.convertido}`}
          label={counts.convertido === 1 ? "venda concluída" : "vendas concluídas"}
        />
      </div>

      {/* Filtros como badges com contagem */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/produtor/negociacoes?${params.toString()}`
            : "/painel/produtor/negociacoes";
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "bg-milsaca-cafezal text-milsaca-cream"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-milsaca-dourado hover:text-milsaca-cafezal",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-caption font-bold",
                  active
                    ? "bg-white/20 text-milsaca-cream"
                    : "bg-milsaca-cream text-milsaca-cafezal",
                )}
              >
                {f.count}
              </span>
            </Link>
          );
        })}
      </div>

      {itens.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
              <Handshake className="h-6 w-6" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              Nenhuma negociação{status ? " com esse status" : ""}.
            </p>
            <p className="text-caption text-neutral-600">
              Quando uma corretora abrir uma proposta com você, ela aparece aqui.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/painel/produtor/corretoras">
                Ver corretoras parceiras
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {itens.map((it) => (
            <NegociacaoCard key={it.id} it={it} nome={nome} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumoStat({
  valor,
  label,
  premium,
}: {
  valor: string;
  label: string;
  premium?: boolean;
}) {
  return (
    <Card tone={premium ? "premium" : "muted"}>
      <CardContent className="p-3 text-center sm:p-card sm:text-left">
        <p
          className={cn(
            "font-bold leading-tight text-milsaca-cafezal",
            premium ? "text-h3" : "text-h2",
          )}
        >
          {valor}
        </p>
        <p className="mt-0.5 text-caption text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function NegociacaoCard({
  it,
  nome,
}: {
  it: NegociacaoListItem;
  nome: string | null;
}) {
  const total = totalOf(it);
  const waUrl = buildWhatsAppInviteUrl({
    phone: it.corretora_phone,
    message: shortMessage(it, nome),
  });

  return (
    <Card interactive>
      <CardContent className="space-y-3 p-card">
        {/* Corretora = âncora; status secundário */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/painel/produtor/negociacoes/${it.id}`}
            className="inline-flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal">
              <Coffee className="h-4 w-4" />
            </span>
            <span className="truncate text-h3 font-semibold text-milsaca-cafezal hover:underline">
              {it.corretora_nome}
            </span>
          </Link>
          <StatusBadge tone={LEAD_STATUS_TONE[it.status]} withDot>
            {LEAD_STATUS_LABEL[it.status]}
          </StatusBadge>
        </div>

        <p className="text-caption text-neutral-500">
          {it.corretora_city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {it.corretora_city} ·{" "}
            </span>
          ) : null}
          Recebida {timeAgo(it.created_at)}
        </p>

        {/* Dinheiro domina o card */}
        <div>
          <p className="text-display leading-none text-milsaca-cafezal">
            {total != null ? BRL0.format(total) : "—"}
          </p>
          <p className="mt-1.5 text-body-sm text-neutral-600">
            {it.bag_count != null
              ? `${it.bag_count.toLocaleString("pt-BR")} sacas`
              : "—"}
            {it.proposed_price != null
              ? ` · ${BRL0.format(it.proposed_price)}/saca`
              : ""}
            {it.coffee_type ? ` · ${coffeeLabel(it.coffee_type)}` : ""}
          </p>
        </div>

        {it.notes ? (
          <p className="rounded-md bg-milsaca-cream/60 px-3 py-2 text-body-sm italic text-neutral-600">
            &quot;{it.notes}&quot;
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/painel/produtor/negociacoes/${it.id}`}>
              Ver detalhes
            </Link>
          </Button>
          {waUrl ? (
            <Button asChild size="sm" variant="success" className="flex-1">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
