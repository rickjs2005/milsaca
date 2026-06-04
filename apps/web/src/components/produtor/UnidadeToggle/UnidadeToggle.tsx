"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Unidade,
  formatarSacas,
  formatarKg,
  formatarBags,
  kgParaSacas,
} from "@/lib/unidades";
import { toggleStyles as s } from "./UnidadeToggle.styles";

type Opcao = { unidade: Unidade; label: string };

const OPCOES: Opcao[] = [
  { unidade: "saca", label: "Sacas" },
  { unidade: "bag", label: "Bags" },
  { unidade: "kg", label: "Kg" },
];

/**
 * Mostra uma quantidade de café (sempre derivada de kg, a verdade) e deixa
 * alternar a unidade de EXIBIÇÃO entre Sacas | Bags | Kg. Padrão = sacas.
 *
 * Toda conversão/formatação vem de @/lib/unidades — zero matemática aqui.
 * "Bags" fica desabilitado quando não há peso por bag (não dá pra inferir).
 */
export function UnidadeToggle({
  valorKg,
  pesoPorBagKg,
  defaultUnidade = "saca",
  className,
}: {
  valorKg: number;
  pesoPorBagKg?: number;
  defaultUnidade?: Unidade;
  className?: string;
}) {
  const [unidade, setUnidade] = useState<Unidade>(defaultUnidade);
  const temBag = !!pesoPorBagKg && pesoPorBagKg > 0;

  // Se cair em "bag" sem peso válido, exibe em sacas (fallback seguro).
  const ativa: Unidade = unidade === "bag" && !temBag ? "saca" : unidade;

  const texto =
    ativa === "kg"
      ? formatarKg(valorKg)
      : ativa === "bag"
        ? formatarBags(valorKg, pesoPorBagKg as number)
        : formatarSacas(kgParaSacas(valorKg));

  return (
    <div className={cn(s.root, className)}>
      <div
        role="radiogroup"
        aria-label="Unidade de exibição"
        className={s.group}
      >
        {OPCOES.map((o) => {
          const desabilitada = o.unidade === "bag" && !temBag;
          const ativo = ativa === o.unidade;
          return (
            <button
              key={o.unidade}
              type="button"
              role="radio"
              aria-checked={ativo}
              disabled={desabilitada}
              title={
                desabilitada ? "Informe o peso por bag para ver em bags" : undefined
              }
              onClick={() => setUnidade(o.unidade)}
              className={cn(
                s.btnBase,
                ativo ? s.btnActive : s.btnInactive,
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className={s.value}>{texto}</p>
    </div>
  );
}
