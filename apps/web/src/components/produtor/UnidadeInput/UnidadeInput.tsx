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
} from "@/lib/unidades";
import { inputStyles as s } from "./UnidadeInput.styles";

const PESO_BAG_PADRAO = 600;

const OPCOES: { unidade: Unidade; label: string }[] = [
  { unidade: "bag", label: "Bags" },
  { unidade: "saca", label: "Sacas" },
  { unidade: "kg", label: "Kg" },
];

/**
 * Entrada de quantidade de café em bag / saca / kg, com preview ao vivo das
 * conversões. Renderiza os campos nomeados que o server action lê
 * (`unidade_entrada` + `qtd_bags`/`peso_por_bag` | `qtd_sacas` | `qtd_kg`).
 * O kg (verdade) é recalculado no SERVIDOR a partir desses campos via
 * @/lib/unidades — aqui o cálculo é só pro preview. Default = sacas.
 */
export function UnidadeInput({ className }: { className?: string }) {
  const [unidade, setUnidade] = useState<Unidade>("saca");
  const [bags, setBags] = useState("");
  const [pesoBag, setPesoBag] = useState(String(PESO_BAG_PADRAO));
  const [sacas, setSacas] = useState("");
  const [kg, setKg] = useState("");

  const n = (v: string) => {
    const x = Number(v.replace(",", "."));
    return Number.isFinite(x) && x >= 0 ? x : 0;
  };

  const kgAtual =
    unidade === "bag"
      ? bagsParaKg(n(bags), n(pesoBag))
      : unidade === "saca"
        ? sacasParaKg(n(sacas))
        : n(kg);

  const temValor = kgAtual > 0;

  return (
    <div className={cn(s.root, className)}>
      <input type="hidden" name="unidade_entrada" value={unidade} />

      <div>
        <span className={s.label}>Como você quer informar a quantidade?</span>
        <div
          role="radiogroup"
          aria-label="Unidade de entrada"
          className={cn(s.group, "mt-1.5")}
        >
          {OPCOES.map((o) => (
            <button
              key={o.unidade}
              type="button"
              role="radio"
              aria-checked={unidade === o.unidade}
              onClick={() => setUnidade(o.unidade)}
              className={cn(
                s.segBase,
                unidade === o.unidade ? s.segActive : s.segInactive,
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.fields}>
        {unidade === "bag" && (
          <>
            <label className={s.field}>
              <span className={s.fieldLabel}>Qtd de bags</span>
              <input
                className={s.input}
                name="qtd_bags"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={bags}
                onChange={(e) => setBags(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>Peso por bag (kg)</span>
              <input
                className={s.input}
                name="peso_por_bag"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={pesoBag}
                onChange={(e) => setPesoBag(e.target.value)}
                placeholder="600"
              />
            </label>
          </>
        )}

        {unidade === "saca" && (
          <label className={s.field}>
            <span className={s.fieldLabel}>Nº de sacas (60 kg)</span>
            <input
              className={s.input}
              name="qtd_sacas"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={sacas}
              onChange={(e) => setSacas(e.target.value)}
              placeholder="0"
            />
          </label>
        )}

        {unidade === "kg" && (
          <label className={s.field}>
            <span className={s.fieldLabel}>Peso total (kg)</span>
            <input
              className={s.input}
              name="qtd_kg"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
      </div>

      <div className={s.preview}>
        <span className={s.previewLabel}>Equivale a</span>
        <div className={s.previewRow}>
          <span className={s.previewSaca}>
            {temValor ? formatarSacas(kgParaSacas(kgAtual)) : "—"}
          </span>
          <span className={s.previewSec}>
            {temValor ? formatarKg(kgAtual) : "preencha a quantidade acima"}
          </span>
        </div>
      </div>
    </div>
  );
}
