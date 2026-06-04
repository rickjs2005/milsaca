import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck2, QrCode, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ResponsiveTable } from "@/components/responsive-table";
import { UnidadeToggle } from "@/components/produtor/UnidadeToggle/UnidadeToggle";
import { getProfile } from "@/lib/auth";
import {
  loadMeusCafes,
  type MeuCafeRow,
  type ClassificacaoResumo,
} from "./_lib/queries";

export const metadata = { title: "Meu Café — Milsaca" };

const BRL0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  rascunho: { label: "Registrado", tone: "neutral" },
  aguardando_classificacao: { label: "Aguardando", tone: "warning" },
  classificado: { label: "Classificado", tone: "success" },
  fora_de_tipo: { label: "Fora de tipo", tone: "danger" },
  rebeneficiar: { label: "Rebeneficiar", tone: "warning" },
  vendido: { label: "Vendido", tone: "neutral" },
};

function specieLabel(s: string): string {
  if (s === "arabica") return "Arábica";
  if (s === "conillon" || s === "conilon") return "Conilón";
  return s;
}

function statusInfo(s: string) {
  return STATUS[s] ?? { label: s, tone: "neutral" as StatusTone };
}

export default async function MeuCafePage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const rows = await loadMeusCafes(profile.id);

  const columns = [
    { key: "cafe", label: "Café" },
    { key: "peso", label: "Quantidade" },
    { key: "status", label: "Status" },
    { key: "class", label: "Classificação (por corretora)" },
    { key: "valor", label: "Valor estimado", align: "right" as const },
    { key: "acoes", label: "", align: "right" as const },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Meu Café</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Sua planilha de lotes: quantidade, classificação de cada corretora e
            valor estimado pela cotação CEPEA de hoje.
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0">
          <Link href="/painel/produtor/cafe/novo">Registrar café</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="p-card">
            <EmptyState
              icon={FileCheck2}
              title="Você ainda não tem café registrado"
              description="Registre seu café pra ele entrar na sua planilha. Quando uma corretora classificar, o resultado aparece aqui pra você comparar."
            />
            <div className="mt-4 flex justify-center">
              <Button asChild variant="primary" size="sm">
                <Link href="/painel/produtor/cafe/novo">Registrar meu café</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveTable<MeuCafeRow>
          columns={columns}
          rows={rows}
          keyFor={(r) => r.id}
          renderRow={(r) => {
            const st = statusInfo(r.status);
            return (
              <>
                <td className="px-5 py-3 align-top">
                  <p className="font-mono text-caption text-milsaca-dourado-texto">
                    {r.codigo}
                  </p>
                  <p className="mt-0.5 font-medium text-milsaca-cafezal">
                    {specieLabel(r.specie)}
                    {r.processo ? ` · ${r.processo}` : ""}
                    {r.safra ? ` · ${r.safra}` : ""}
                  </p>
                </td>
                <td className="px-5 py-3 align-top">
                  <UnidadeToggle
                    valorKg={r.pesoKg}
                    pesoPorBagKg={r.pesoPorBagKg ?? undefined}
                  />
                </td>
                <td className="px-5 py-3 align-top">
                  <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                </td>
                <td className="px-5 py-3 align-top">
                  <Classificacoes lista={r.classificacoes} />
                </td>
                <td className="px-5 py-3 text-right align-top">
                  {r.valorEstimado != null ? (
                    <>
                      <p className="font-semibold text-milsaca-cafezal">
                        {BRL0.format(r.valorEstimado)}
                      </p>
                      <p className="text-caption text-neutral-500">
                        {r.precoSaca != null
                          ? `${BRL2.format(r.precoSaca)}/saca`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right align-top">
                  <AcoesLaudo lista={r.classificacoes} />
                </td>
              </>
            );
          }}
          renderCard={(r) => {
            const st = statusInfo(r.status);
            return (
              <Card>
                <CardContent className="space-y-3 p-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-caption text-milsaca-dourado-texto">
                        {r.codigo}
                      </p>
                      <p className="mt-0.5 text-body-sm font-medium text-milsaca-cafezal">
                        {specieLabel(r.specie)}
                        {r.processo ? ` · ${r.processo}` : ""}
                        {r.safra ? ` · ${r.safra}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </div>

                  <UnidadeToggle
                    valorKg={r.pesoKg}
                    pesoPorBagKg={r.pesoPorBagKg ?? undefined}
                  />

                  <div className="rounded-md bg-milsaca-cream/60 px-3 py-2">
                    <p className="text-caption text-neutral-500">
                      Valor estimado{" "}
                      {r.precoSaca != null
                        ? `· ${BRL2.format(r.precoSaca)}/saca`
                        : ""}
                    </p>
                    <p className="text-body font-bold text-milsaca-cafezal">
                      {r.valorEstimado != null
                        ? BRL0.format(r.valorEstimado)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-caption font-medium text-neutral-500">
                      Classificação por corretora
                    </p>
                    <Classificacoes lista={r.classificacoes} />
                  </div>

                  <AcoesLaudo lista={r.classificacoes} />
                </CardContent>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}

// Lista comparativa: o que cada corretora deu pro café (bebida/tipo).
function Classificacoes({ lista }: { lista: ClassificacaoResumo[] }) {
  if (lista.length === 0) {
    return (
      <span className="text-caption text-neutral-500">
        Aguardando classificação
      </span>
    );
  }
  return (
    <ul className="space-y-1">
      {lista.map((c) => (
        <li key={c.id} className="text-caption">
          <span className="font-medium text-milsaca-cafezal">
            {c.fora_de_tipo
              ? "Fora de tipo"
              : `${c.bebida ?? "—"}${c.tipo ? ` · Tipo ${c.tipo}` : ""}`}
          </span>
          <span className="text-neutral-500">
            {" "}
            — {c.corretora_nome ?? "corretora"}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Links pro laudo público / PDF (um por classificação).
function AcoesLaudo({ lista }: { lista: ClassificacaoResumo[] }) {
  if (lista.length === 0) return <span className="text-neutral-300">—</span>;
  const ultima = lista[0]!;
  return (
    <div className="flex justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/laudos/${ultima.id}`} target="_blank">
          <QrCode className="mr-1 h-3.5 w-3.5" />
          Laudo
        </Link>
      </Button>
      <Button asChild variant="primary" size="sm">
        <Link href={`/laudos/${ultima.id}/pdf`} target="_blank">
          <Download className="mr-1 h-3.5 w-3.5" />
          PDF
        </Link>
      </Button>
    </div>
  );
}
