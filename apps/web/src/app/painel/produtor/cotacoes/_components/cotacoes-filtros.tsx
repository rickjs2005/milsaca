"use client";

import { useRouter } from "next/navigation";
import { Coffee, MapPin } from "lucide-react";

type Praca = { slug: string; name: string; state: string };

export function CotacoesFiltros({
  specie,
  praca,
  pracas,
}: {
  specie?: string;
  praca?: string;
  pracas: Praca[];
}) {
  const router = useRouter();

  function navigate(nextSpecie: string, nextPraca: string) {
    const params = new URLSearchParams();
    if (nextSpecie) params.set("specie", nextSpecie);
    if (nextPraca) params.set("praca", nextPraca);
    const qs = params.toString();
    router.push(
      qs
        ? `/painel/produtor/cotacoes?${qs}`
        : "/painel/produtor/cotacoes",
    );
  }

  const selectClass =
    "h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-body-sm text-milsaca-cafezal transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex min-w-[150px] flex-1 flex-col gap-1">
        <span className="inline-flex items-center gap-1 text-caption font-medium text-neutral-500">
          <Coffee className="h-3.5 w-3.5 text-milsaca-dourado" />
          Tipo de café
        </span>
        <select
          className={selectClass}
          value={specie ?? ""}
          onChange={(e) => navigate(e.target.value, praca ?? "")}
        >
          <option value="">Todos</option>
          <option value="arabica">Arábica</option>
          <option value="conillon">Conillón</option>
        </select>
      </label>

      {pracas.length > 0 ? (
        <label className="flex min-w-[150px] flex-1 flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-caption font-medium text-neutral-500">
            <MapPin className="h-3.5 w-3.5 text-milsaca-dourado" />
            Região
          </span>
          <select
            className={selectClass}
            value={praca ?? ""}
            onChange={(e) => navigate(specie ?? "", e.target.value)}
          >
            <option value="">Todas</option>
            {pracas.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}/{p.state}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
