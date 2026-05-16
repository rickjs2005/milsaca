import Link from "next/link";
import { Plus, Inbox, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import {
  listLeads,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_COLOR,
  LEAD_STATUS_ORDER,
  type LeadStatus,
} from "./_lib/queries";

export const metadata = { title: "Leads — Painel da corretora" };

type SearchParams = Promise<{ status?: string }>;

const FILTERS: { value: "" | LeadStatus; label: string }[] = [
  { value: "", label: "Todos" },
  ...LEAD_STATUS_ORDER.map((s) => ({
    value: s,
    label: LEAD_STATUS_LABEL[s],
  })),
];

function isLeadStatus(v: string | undefined): v is LeadStatus {
  return (
    !!v && (LEAD_STATUS_ORDER as readonly string[]).includes(v)
  );
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
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : undefined;

  const leads = await listLeads(profile.corretora_id, { status });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Leads
          </h1>
          <p className="text-sm text-milsaca-verde-claro">
            Pipeline de propostas e contatos. Avance status, deixe comentários
            na timeline e converta em contrato.
          </p>
        </div>
        <Button
          asChild
          className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          <Link href="/painel/corretora/leads/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo lead
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Status:</span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          const href = params.toString()
            ? `/painel/corretora/leads?${params.toString()}`
            : "/painel/corretora/leads";
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

      {leads.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              Nenhum lead{status ? " com esse status" : ""}.
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Crie o primeiro pra começar o pipeline.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/painel/corretora/leads/novo">Novo lead</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-milsaca-cream-escuro">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-milsaca-cream-escuro/40 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                <tr>
                  <th className="px-5 py-3 text-left">Produtor</th>
                  <th className="px-5 py-3 text-left">Café</th>
                  <th className="px-5 py-3 text-right">Sacas</th>
                  <th className="px-5 py-3 text-right">Valor proposto</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-milsaca-cream-escuro">
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-milsaca-cream-escuro/30"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/painel/corretora/leads/${l.id}`}
                        className="font-medium text-milsaca-verde hover:underline"
                      >
                        {l.produtor_nome}
                      </Link>
                      <div className="mt-0.5 text-xs text-milsaca-verde-claro">
                        {l.produtor_kind === "contato" ? (
                          <span className="rounded bg-milsaca-dourado/20 px-1.5 py-0.5 text-[10px] text-milsaca-verde">
                            contato
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                            produtor
                          </span>
                        )}
                        {l.produtor_phone && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {l.produtor_phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-milsaca-verde">
                      {l.coffee_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-milsaca-verde">
                      {l.bag_count != null
                        ? l.bag_count.toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-milsaca-verde">
                      {l.proposed_price != null
                        ? formatBRL(l.proposed_price)
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={`${LEAD_STATUS_COLOR[l.status]} hover:${LEAD_STATUS_COLOR[l.status]}`}
                      >
                        {LEAD_STATUS_LABEL[l.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-milsaca-verde-claro">
                      {formatDateShort(l.updated_at)}
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
