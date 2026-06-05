import Link from "next/link";
import { Handshake, Package, Users, Clock } from "lucide-react";
import { fmtMoney0, fmtInt } from "@/lib/format";

/**
 * Herói da Central Comercial — a faixa "impossível de ignorar" do dashboard.
 * Fundo cafezal escuro (família da sidebar), número principal em dourado.
 * Responde de cara: "Quanto dinheiro está na mesa?" + atalhos de ação.
 */
export function HeroComercial({
  potencial,
  sacas,
  produtoresAtivos,
  aguardando,
}: {
  potencial: number;
  sacas: number;
  produtoresAtivos: number;
  aguardando: number;
}) {
  return (
    <section
      aria-label="Central comercial"
      className="overflow-hidden rounded-card bg-milsaca-cafezal text-milsaca-cream shadow-elevated ring-1 ring-inset ring-white/10"
    >
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        {/* brilho dourado sutil no canto */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-milsaca-dourado/20 blur-3xl"
        />

        <div className="relative min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-milsaca-dourado">
            Central comercial
          </p>
          <p className="mt-3 text-caption font-medium uppercase tracking-wider text-milsaca-cream/60">
            Potencial de compra
          </p>
          <p className="text-display font-bold leading-none text-milsaca-dourado">
            {fmtMoney0(potencial)}
          </p>
          <p className="mt-2 text-body text-milsaca-cream/85">
            <strong className="font-semibold text-milsaca-cream">
              {fmtInt(sacas)} sacas
            </strong>{" "}
            em negociação
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-body-sm text-milsaca-cream/75">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-milsaca-cream/55" />
              <strong className="font-semibold text-milsaca-cream">
                {fmtInt(produtoresAtivos)}
              </strong>{" "}
              {produtoresAtivos === 1 ? "produtor ativo" : "produtores ativos"}
            </span>
            <span aria-hidden className="text-milsaca-cream/30">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-milsaca-dourado" />
              <strong className="font-semibold text-milsaca-cream">
                {fmtInt(aguardando)}
              </strong>{" "}
              aguardando você
            </span>
          </div>
        </div>

        {/* CTAs — alvos grandes, lado a lado no desktop, empilhados no mobile */}
        <div className="relative flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href="/painel/corretora/leads/novo"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-milsaca-dourado px-4 text-label font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-dourado-claro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-offset-2 focus-visible:ring-offset-milsaca-cafezal"
          >
            <Handshake className="h-4 w-4" />
            Novo lead
          </Link>
          <Link
            href="/painel/corretora/lotes/novo"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-white/25 px-4 text-label font-semibold text-milsaca-cream transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-milsaca-dourado focus-visible:ring-offset-2 focus-visible:ring-offset-milsaca-cafezal"
          >
            <Package className="h-4 w-4" />
            Cadastrar lote
          </Link>
        </div>
      </div>
    </section>
  );
}
