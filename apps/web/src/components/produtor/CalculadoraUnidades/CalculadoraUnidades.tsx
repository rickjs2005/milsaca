"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Unidade,
  bagsParaKg,
  sacasParaKg,
  kgParaSacas,
  formatarSacas,
  formatarKg,
  formatarBags,
} from "@/lib/unidades";
import { calcStyles as s } from "./CalculadoraUnidades.styles";

const PESO_BAG_PADRAO = 600;

const OPCOES: { unidade: Unidade; label: string }[] = [
  { unidade: "bag", label: "Bags" },
  { unidade: "saca", label: "Sacas" },
  { unidade: "kg", label: "Kg" },
];

/**
 * Calculadora de unidades de café: digita em bag/saca/kg e vê as três
 * equivalências na hora. Pura — toda conversão vem de @/lib/unidades.
 */
export function CalculadoraUnidades() {
  const [unidade, setUnidade] = useState<Unidade>("bag");
  const [valor, setValor] = useState("");
  const [pesoBag, setPesoBag] = useState(String(PESO_BAG_PADRAO));

  const n = (v: string) => {
    const x = Number(v.replace(",", "."));
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };

  const pesoBagKg = n(pesoBag) || PESO_BAG_PADRAO;
  const kg =
    unidade === "bag"
      ? bagsParaKg(n(valor), pesoBagKg)
      : unidade === "saca"
        ? sacasParaKg(n(valor))
        : n(valor);
  const tem = kg > 0;

  return (
    <div className={s.root}>
      <div
        role="radiogroup"
        aria-label="Unidade de entrada"
        className={s.group}
      >
        {OPCOES.map((o) => (
          <button
            key={o.unidade}
            type="button"
            role="radio"
            aria-checked={unidade === o.unidade}
            onClick={() => setUnidade(o.unidade)}
            className={cn(
              s.seg,
              unidade === o.unidade ? s.segActive : s.segInactive,
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={s.fields}>
        <label className={s.field}>
          <span className={s.fieldLabel}>
            {unidade === "bag"
              ? "Qtd de bags"
              : unidade === "saca"
                ? "Nº de sacas"
                : "Peso em kg"}
          </span>
          <input
            className={s.input}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0"
          />
        </label>
        {unidade === "bag" ? (
          <label className={s.field}>
            <span className={s.fieldLabel}>Peso por bag (kg)</span>
            <input
              className={s.input}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={pesoBag}
              onChange={(e) => setPesoBag(e.target.value)}
              placeholder="600"
            />
          </label>
        ) : null}
      </div>

      <div className={s.out}>
        <div className={s.outCell}>
          <p className={s.outLabel}>Sacas</p>
          <p className={s.outValue}>
            {tem ? formatarSacas(kgParaSacas(kg)) : "—"}
          </p>
        </div>
        <div className={s.outCell}>
          <p className={s.outLabel}>Bags ({pesoBagKg}kg)</p>
          <p className={s.outValue}>
            {tem ? formatarBags(kg, pesoBagKg) : "—"}
          </p>
        </div>
        <div className={s.outCell}>
          <p className={s.outLabel}>Kg</p>
          <p className={s.outValue}>{tem ? formatarKg(kg) : "—"}</p>
        </div>
      </div>
    </div>
  );
}
