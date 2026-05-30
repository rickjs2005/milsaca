import Link from "next/link";
import {
  Handshake,
  MessageCircle,
  MapPin,
  Phone,
  CalendarClock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import {
  listMinhasNegociacoes,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  type LeadStatus,
} from "./_lib/queries";
import { buildWhatsAppInviteUrl } from "../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Negociações — Painel do produtor" };

type SearchParams = Promise<{ status?: string }>;

// status → tonalidade semântica (tokens de fundação). Espelha o detalhe.
const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo: "premium",
  em_negociacao: "info",
  convertido: "success",
  perdido: "danger",
  arquivado: "neutral",
};

const FILTERS: { value: "" | LeadStatus; label: string }[] = [
  { value: "", label: "Todas" },
  ...LEAD_STATUS_ORDER.filter((s) => s !== "arquivado").map((s) => ({
    value: s,
    label: LEAD_STATUS_LABEL[s],
  })),
];

function isLeadStatus(v: string | undefined): v is LeadStatus {
  return !!v && (LEAD_STATUS_ORDER as readonly string[]).includes(v);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shortMessage(item: {
  corretora_nome: string;
  coffee_type: string | null;
  bag_count: number | null;
  proposed_price: number | null;
}) {
  const parts = [
    `Oi! Sobre a proposta da ${item.corretora_nome}`,
  ];
  if (item.coffee_type) parts[0] += ` para ${item.coffee_type}`;
  if (item.bag_count) parts[0] += ` (${item.bag_count} sacas)`;
  if (item.proposed_price != null) {
    parts.push(
      `Valor: R$ ${item.proposed_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / saca.`,
    );
  }
  parts.push("Podemos conversar?");
  return parts.join("\n\n");
}

export default async function NegociacoesProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/painel/produtor/negociacoes");
  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : undefined;

  const itens = await listMinhasNegociacoes(user.id, { status });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Negociações</h1>
        <p className="text-body-sm text-neutral-600">
          Propostas das corretoras parceiras. Veja o histórico, fale por
          WhatsApp e acompanhe o avanço de cada conversa.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-neutral-600">Status:</span>
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
              className={
                active
                  ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
              }
            >
              {f.label}
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
              Quando uma corretora abrir uma proposta com você, ela aparece
              aqui.
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
          {itens.map((it) => {
            const waUrl = buildWhatsAppInviteUrl({
              phone: it.corretora_phone,
              message: shortMessage(it),
            });
            return (
              <Card key={it.id} interactive>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-milsaca-cafezal">
                        <Link
                          href={`/painel/produtor/negociacoes/${it.id}`}
                          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {it.corretora_nome}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3">
                        {it.corretora_city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {it.corretora_city}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDateShort(it.updated_at)}
                        </span>
                      </CardDescription>
                    </div>
                    <StatusBadge tone={LEAD_STATUS_TONE[it.status]} withDot>
                      {LEAD_STATUS_LABEL[it.status]}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-caption uppercase tracking-wider text-neutral-500">
                        Café
                      </p>
                      <p className="text-body-sm font-medium text-milsaca-cafezal">
                        {it.coffee_type ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption uppercase tracking-wider text-neutral-500">
                        Sacas
                      </p>
                      <p className="text-body-sm font-medium text-milsaca-cafezal">
                        {it.bag_count != null
                          ? it.bag_count.toLocaleString("pt-BR")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption uppercase tracking-wider text-neutral-500">
                        Por saca
                      </p>
                      <p className="text-body-sm font-medium text-milsaca-cafezal">
                        {it.proposed_price != null
                          ? formatBRL(it.proposed_price)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {it.proposed_price != null && it.bag_count != null && (
                    <div className="rounded-md bg-milsaca-cream px-3 py-2 text-body-sm">
                      <span className="text-neutral-600">Valor total:</span>{" "}
                      <span className="font-semibold text-milsaca-cafezal">
                        {formatBRL(it.proposed_price * it.bag_count)}
                      </span>
                    </div>
                  )}

                  {it.notes && (
                    <p className="text-body-sm italic text-neutral-600">
                      &quot;{it.notes}&quot;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {it.corretora_phone && (
                      <span className="inline-flex items-center gap-1 text-caption text-neutral-600">
                        <Phone className="h-3 w-3" />
                        {it.corretora_phone}
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/painel/produtor/negociacoes/${it.id}`}>
                          Ver detalhes
                        </Link>
                      </Button>
                      {waUrl && (
                        <Button asChild size="sm" variant="success">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
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
