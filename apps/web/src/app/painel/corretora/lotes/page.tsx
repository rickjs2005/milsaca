import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Coffee,
  Package,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { getProfile } from "@/lib/auth";
import { getCorretoraName } from "../_lib/corretora";
import {
  listLotes,
  loadCotacoesRef,
  loadLotesKpis,
  LOTES_PAGE_SIZE,
  LOTE_STATUS_ORDER,
} from "./_lib/queries";
import type { LoteStatus } from "./_lib/lote-meta";
import { LotesGrid } from "./_components/lotes-grid";
import { fmtMoney0, fmtInt } from "@/lib/format";

export const metadata = { title: "Lotes de café — Painel da corretora" };

type SearchParams = Promise<{
  status?: string;
  specie?: string;
  safra?: string;
  tipo?: string;
  peneira?: string;
  regiao?: string;
  page?: string;
}>;

function isLoteStatus(v: string | undefined): v is LoteStatus {
  return !!v && (LOTE_STATUS_ORDER as readonly string[]).includes(v);
}

function isSpecie(v: string | undefined): v is "arabica" | "conillon" {
  return v === "arabica" || v === "conillon";
}

export default async function LotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }

  const sp = await searchParams;
  const status = isLoteStatus(sp.status) ? sp.status : undefined;
  const specie = isSpecie(sp.specie) ? sp.specie : undefined;
  const safra = typeof sp.safra === "string" && sp.safra ? sp.safra : undefined;
  const tipo = typeof sp.tipo === "string" && sp.tipo ? sp.tipo : undefined;
  const peneira =
    typeof sp.peneira === "string" && sp.peneira ? sp.peneira : undefined;
  const regiao =
    typeof sp.regiao === "string" && sp.regiao ? sp.regiao : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows: lotes, count }, cotacoes, kpis, corretoraName] =
    await Promise.all([
      listLotes(profile.corretora_id, { status, specie }, page),
      loadCotacoesRef(),
      loadLotesKpis(profile.corretora_id),
      getCorretoraName(profile.corretora_id),
    ]);
  const totalPages = Math.max(1, Math.ceil(count / LOTES_PAGE_SIZE));

  const cotacoesBySpecie = {
    arabica: cotacoes.find((c) => c.specie === "arabica")?.price ?? null,
    conillon: cotacoes.find((c) => c.specie === "conillon")?.price ?? null,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Lotes de café</h1>
          <p className="mt-1 text-body-sm text-neutral-600">
            Vitrine comercial — compartilhe lotes, acompanhe o ciclo de
            classificação e mova pra vendido com 1 click.
          </p>
        </div>
        <Link
          href="/painel/corretora/lotes/novo"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-milsaca-cafezal px-4 text-sm font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          <Plus className="h-4 w-4" />
          Cadastrar lote
        </Link>
      </header>

      <section
        aria-label="Indicadores de lotes"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Sacas disponíveis"
          value={fmtInt(kpis.sacasDisponiveis)}
          icon={Coffee}
          tone="premium"
          hint="Em lotes ativos (60 kg cada)"
        />
        <KpiCard
          label="Lotes ativos"
          value={fmtInt(kpis.ativos)}
          icon={Package}
          tone="premium"
          hint="Aguardando ou prontos pra venda"
        />
        <KpiCard
          label="Classificados"
          value={fmtInt(kpis.classificados)}
          icon={CheckCircle2}
          tone="info"
          hint="Prontos pra compartilhar com compradores"
        />
        <KpiCard
          label="Vendidos no mês"
          value={fmtMoney0(kpis.valorVendidos)}
          icon={ShoppingBag}
          tone="success"
          hint={`${kpis.vendidosMes} lote${kpis.vendidosMes === 1 ? "" : "s"} · volume estimado`}
        />
      </section>

      <LotesGrid
        lotes={lotes}
        corretoraName={corretoraName}
        cotacoesBySpecie={cotacoesBySpecie}
        current={{ status, specie, safra, tipo, peneira, regiao }}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
