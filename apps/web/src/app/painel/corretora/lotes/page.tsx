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
import { createClient } from "@milsaca/db/web/server";
import {
  listLotes,
  loadCotacoesRef,
  loadLotesKpis,
  LOTE_STATUS_ORDER,
} from "./_lib/queries";
import type { LoteStatus } from "./_lib/lote-meta";
import { LotesGrid } from "./_components/lotes-grid";

export const metadata = { title: "Lotes de café — Painel da corretora" };

type SearchParams = Promise<{
  status?: string;
  specie?: string;
  safra?: string;
}>;

function isLoteStatus(v: string | undefined): v is LoteStatus {
  return !!v && (LOTE_STATUS_ORDER as readonly string[]).includes(v);
}

function isSpecie(v: string | undefined): v is "arabica" | "conillon" {
  return v === "arabica" || v === "conillon";
}

const NUM = new Intl.NumberFormat("pt-BR");

async function loadCorretoraName(corretoraId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corretoras")
    .select("name")
    .eq("id", corretoraId)
    .maybeSingle<{ name: string | null }>();
  return data?.name ?? "Milsaca";
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

  const [lotes, cotacoes, kpis, corretoraName] = await Promise.all([
    listLotes(profile.corretora_id, { status, specie }),
    loadCotacoesRef(),
    loadLotesKpis(profile.corretora_id),
    loadCorretoraName(profile.corretora_id),
  ]);

  const cotacoesBySpecie = {
    arabica: cotacoes.find((c) => c.specie === "arabica")?.price ?? null,
    conillon: cotacoes.find((c) => c.specie === "conillon")?.price ?? null,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
            Lotes de café
          </h1>
          <p className="mt-1 text-sm text-milsaca-verde-claro">
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
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Sacas disponíveis"
          value={NUM.format(kpis.sacasDisponiveis)}
          icon={Coffee}
          tone="premium"
          hint="Em lotes ativos (60 kg cada)"
        />
        <KpiCard
          label="Lotes ativos"
          value={NUM.format(kpis.ativos)}
          icon={Package}
          tone="premium"
          hint="Aguardando ou prontos pra venda"
        />
        <KpiCard
          label="Classificados"
          value={NUM.format(kpis.classificados)}
          icon={CheckCircle2}
          tone="info"
          hint="Prontos pra compartilhar com compradores"
        />
        <KpiCard
          label="Vendidos no mês"
          value={NUM.format(kpis.vendidosMes)}
          icon={ShoppingBag}
          tone="success"
          hint="Marcados como vendidos a partir do dia 1"
        />
      </section>

      <LotesGrid
        lotes={lotes}
        corretoraName={corretoraName}
        cotacoesBySpecie={cotacoesBySpecie}
        current={{ status, specie, safra }}
      />
    </div>
  );
}
