import Link from "next/link";
import {
  FileText,
  MessageCircle,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import {
  listMeusContratos,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_COLOR,
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
  const sp = await searchParams;
  const status = isContratoStatus(sp.status) ? sp.status : undefined;

  const contratos = await listMeusContratos(user.id, { status });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-milsaca-verde">
          Contratos
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Operações fechadas com suas corretoras parceiras.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Status:</span>
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
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {contratos.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <FileText className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum contrato{status ? " com esse status" : ""}.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Quando uma corretora abrir um contrato com você, ele aparece
              aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Código</th>
                  <th className="px-5 py-3 text-left">Corretora</th>
                  <th className="px-5 py-3 text-left">Café</th>
                  <th className="px-5 py-3 text-right">Sacas</th>
                  <th className="px-5 py-3 text-right">Valor total</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Assinado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {contratos.map((c) => {
                  const waUrl = buildWhatsAppInviteUrl({
                    phone: c.corretora_phone,
                    message: `Oi! Sobre o contrato ${c.code}${c.coffee_type ? ` de ${c.coffee_type}` : ""}${c.bag_count ? ` (${c.bag_count} sacas)` : ""}. Podemos conversar?`,
                  });
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-milsaca-cream-escuro/30"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/painel/produtor/contratos/${c.id}`}
                          className="font-medium text-milsaca-verde hover:underline"
                        >
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        {c.corretora_nome}
                        {c.corretora_city && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-milsaca-verde-claro">
                            <MapPin className="h-2.5 w-2.5" />
                            {c.corretora_city}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-milsaca-verde">
                        {c.coffee_type ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-milsaca-verde">
                        {c.bag_count != null
                          ? c.bag_count.toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-milsaca-verde">
                        {c.total_value != null
                          ? formatBRL(c.total_value)
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          className={`${CONTRATO_STATUS_COLOR[c.status]} hover:${CONTRATO_STATUS_COLOR[c.status]}`}
                        >
                          {CONTRATO_STATUS_LABEL[c.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-milsaca-verde-claro">
                        {c.signed_at ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
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
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
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
        <p className="text-xs text-milsaca-verde-claro">
          O download do PDF com QR público vai chegar em breve — fica em uma
          das próximas atualizações.
        </p>
      )}
    </div>
  );
}
