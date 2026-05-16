import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import {
  listContratos,
  CONTRATO_STATUS_LABEL,
  CONTRATO_STATUS_COLOR,
  CONTRATO_STATUS_ORDER,
  type ContratoStatus,
} from "./_lib/queries";

export const metadata = { title: "Contratos — Painel da corretora" };

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

export default async function ContratosCorretoraPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isContratoStatus(sp.status) ? sp.status : undefined;

  const contratos = await listContratos(profile.corretora_id, { status });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Contratos
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Operações fechadas. Crie a partir de um lead convertido ou direto.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/contratos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo contrato
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Status:</span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/corretora/contratos?${params.toString()}`
            : "/painel/corretora/contratos";
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
              Crie o primeiro a partir de um lead convertido.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/contratos/novo">Novo contrato</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Código</th>
                  <th className="px-5 py-3 text-left">Produtor</th>
                  <th className="px-5 py-3 text-left">Café</th>
                  <th className="px-5 py-3 text-right">Sacas</th>
                  <th className="px-5 py-3 text-right">Valor total</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Assinado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {contratos.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-milsaca-cream-escuro/30"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/contratos/${c.id}`}
                        className="font-medium text-milsaca-verde hover:underline"
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-milsaca-verde">
                      {c.produtor_nome}
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
                      {c.total_value != null ? formatBRL(c.total_value) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={`${CONTRATO_STATUS_COLOR[c.status]} hover:${CONTRATO_STATUS_COLOR[c.status]}`}
                      >
                        {CONTRATO_STATUS_LABEL[c.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-milsaca-verde-claro">
                      {c.signed_at ? formatDate(c.signed_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
