import Link from "next/link";
import {
  FileText,
  MessageCircle,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { requireUser, getProfile } from "@/lib/auth";
import { coffeeLabel } from "@/lib/coffee";
import {
  listMeusContratos,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_TONE,
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
} from "./_lib/queries";
import { buildWhatsAppInviteUrl } from "../../corretora/produtores/_lib/whatsapp";

export const metadata = { title: "Contratos — Painel do produtor" };

type SearchParams = Promise<{ status?: string }>;

const FILTERS: { value: "" | ContratoStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...CONTRATO_STATUS_ORDER.map((s) => ({
    value: s,
    label: CONTRATO_STATUS_LABEL[s],
  })),
];

function isContratoStatus(v: string | undefined): v is ContratoStatus {
  return !!v && (CONTRATO_STATUS_ORDER as readonly string[]).includes(v);
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function ContratosProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/painel/produtor/contratos");
  const profile = await getProfile();
  const nome = profile?.full_name?.trim() || null;
  const sp = await searchParams;
  const status = isContratoStatus(sp.status) ? sp.status : undefined;

  const contratos = await listMeusContratos(user.id, { status });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Contratos</h1>
        <p className="mt-1 text-body-sm text-neutral-600">
          Operações fechadas com suas corretoras parceiras.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
          Status
        </span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/produtor/contratos?${params.toString()}`
            : "/painel/produtor/contratos";
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={
                active
                  ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption font-medium text-neutral-600 transition-colors hover:border-milsaca-dourado/50 hover:text-milsaca-cafezal"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {contratos.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileText}
              title={`Nenhum contrato${status ? " com esse status" : ""}`}
              description="Quando uma corretora abrir um contrato com você, ele aparece aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-body-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-caption font-medium uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Código</th>
                  <th className="px-5 py-3 text-left font-medium">Corretora</th>
                  <th className="px-5 py-3 text-left font-medium">Café</th>
                  <th className="px-5 py-3 text-right font-medium">Sacas</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Valor total
                  </th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Assinado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {contratos.map((c) => {
                  const intro = nome
                    ? `Oi! Aqui é ${nome}.`
                    : "Oi! Aqui é da Milsaca.";
                  const detalhe = [
                    c.coffee_type ? coffeeLabel(c.coffee_type) : null,
                    c.bag_count ? `${c.bag_count} sacas` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const sobre = detalhe
                    ? `É sobre o contrato ${c.code} (${detalhe}).`
                    : `É sobre o contrato ${c.code}.`;
                  const waUrl = buildWhatsAppInviteUrl({
                    phone: c.corretora_phone,
                    message: `${intro}\n${sobre}\nQueria alinhar a entrega — quando puder, me chama!`,
                  });
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/painel/produtor/contratos/${c.id}`}
                          className="font-medium text-milsaca-cafezal hover:underline"
                        >
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-milsaca-cafezal">
                        {c.corretora_nome}
                        {c.corretora_city && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-caption text-neutral-500">
                            <MapPin className="h-2.5 w-2.5" />
                            {c.corretora_city}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        {coffeeLabel(c.coffee_type) ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                        {c.bag_count != null
                          ? c.bag_count.toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-milsaca-cafezal">
                        {c.total_value != null
                          ? formatBRL(c.total_value)
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={CONTRATO_STATUS_TONE[c.status]}>
                          {CONTRATO_STATUS_LABEL[c.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3 text-caption text-neutral-600">
                        {c.signed_at ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <CheckCircle2 className="h-3 w-3 text-success-600" />
                            {formatDate(c.signed_at)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-caption font-medium text-success-700 hover:underline"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {contratos.length > 0 && (
        <p className="text-caption text-neutral-500">
          O download do PDF com QR público vai chegar em breve — fica em uma
          das próximas atualizações.
        </p>
      )}
    </div>
  );
}
