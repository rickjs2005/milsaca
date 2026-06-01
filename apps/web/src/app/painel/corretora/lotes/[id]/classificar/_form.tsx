"use client";

import { useMemo, useReducer, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Coffee } from "lucide-react";
import {
  calcularLaudo,
  type DefeitosCrus,
  type OpcoesCalculo,
} from "@milsaca/cob";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveClassificacao } from "./_actions";

const PENEIRAS_PADRAO = [
  "19",
  "18",
  "17",
  "16",
  "15",
  "14",
  "13 moca",
  "13",
  "12 moca",
  "11 moca",
  "10 moca",
  "10",
  "fundo",
] as const;

const BEBIDAS_ARABICA = [
  ["estritamente_mole", "Estritamente Mole"],
  ["mole", "Mole"],
  ["apenas_mole", "Apenas Mole"],
  ["duro", "Duro"],
  ["riado", "Riado"],
  ["rio", "Rio"],
  ["rio_zona", "Rio Zona"],
] as const;

const BEBIDAS_CONILLON = [
  ["excelente", "Excelente"],
  ["boa", "Boa"],
  ["regular", "Regular"],
  ["anormal", "Anormal"],
] as const;

const CLASSES = [
  ["verde_azulado", "Verde-azulado"],
  ["verde_cana", "Verde-cana"],
  ["verde", "Verde"],
  ["amarelada", "Amarelada"],
  ["amarela", "Amarela"],
  ["marrom", "Marrom"],
  ["esbranquicada", "Esbranquiçada"],
  ["chumbado", "Chumbado"],
  ["discrepante", "Discrepante"],
] as const;

const ASPECTOS = [
  ["bom", "Bom"],
  ["regular", "Regular"],
  ["mau", "Mau"],
] as const;

type Props = {
  loteId: string;
  specie: "arabica" | "conillon";
};

type DefeitoForm = {
  pretos: string;
  ardidos: string;
  preto_verdes: string;
  conchas: string;
  verdes: string;
  quebrados: string;
  brocados: string;
  mal_granados: string;
  esmagados: string;
  miolo_concha: string;
};

const DEFEITOS_INICIAIS: DefeitoForm = {
  pretos: "0",
  ardidos: "0",
  preto_verdes: "0",
  conchas: "0",
  verdes: "0",
  quebrados: "0",
  brocados: "0",
  mal_granados: "0",
  esmagados: "0",
  miolo_concha: "0",
};

function n(v: string): number {
  const x = parseInt(v, 10);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

// ===== Estado único do laudo (useReducer) =====
type LaudoForm = {
  defeitos: DefeitoForm;
  brocadosPorDefeito: 2 | 3 | 4 | 5;
  bebida: string;
  classe: string;
  aspecto: string;
  torra: string;
  peneiras: Record<string, string>;
  umidade: string;
  impurezasPct: string;
  pvaPretos: string;
  pvaVerdes: string;
  pvaArdidos: string;
  observacoes: string;
};

function peneirasIniciais(): Record<string, string> {
  const x: Record<string, string> = {};
  for (const p of PENEIRAS_PADRAO) x[p] = "";
  return x;
}

const LAUDO_INICIAL: LaudoForm = {
  defeitos: DEFEITOS_INICIAIS,
  brocadosPorDefeito: 3,
  bebida: "",
  classe: "",
  aspecto: "",
  torra: "",
  peneiras: peneirasIniciais(),
  umidade: "",
  impurezasPct: "",
  pvaPretos: "",
  pvaVerdes: "",
  pvaArdidos: "",
  observacoes: "",
};

type LaudoAction =
  // Action genérica de campo (type-safe via generics)
  | { [K in keyof LaudoForm]: { type: "set"; field: K; value: LaudoForm[K] } }[keyof LaudoForm]
  // Update composto de um defeito intrínseco
  | { type: "setDefeito"; key: keyof DefeitoForm; value: string }
  // Update composto de uma peneira
  | { type: "setPeneira"; key: string; value: string };

function laudoReducer(state: LaudoForm, action: LaudoAction): LaudoForm {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value };
    case "setDefeito":
      return {
        ...state,
        defeitos: {
          ...state.defeitos,
          [action.key]: action.value.replace(/[^0-9]/g, ""),
        },
      };
    case "setPeneira":
      return {
        ...state,
        peneiras: { ...state.peneiras, [action.key]: action.value },
      };
    default:
      return state;
  }
}

export function ClassificarForm({ loteId, specie }: Props) {
  const bebidaOpts = specie === "arabica" ? BEBIDAS_ARABICA : BEBIDAS_CONILLON;

  const [form, dispatch] = useReducer(laudoReducer, LAUDO_INICIAL);
  const {
    defeitos,
    brocadosPorDefeito,
    bebida,
    classe,
    aspecto,
    torra,
    peneiras,
    umidade,
    impurezasPct,
    pvaPretos,
    pvaVerdes,
    pvaArdidos,
    observacoes,
  } = form;

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ===== Preview live =====
  const resultado = useMemo(() => {
    const crus: DefeitosCrus = {
      intrinsecos: {
        pretos: n(defeitos.pretos),
        ardidos: n(defeitos.ardidos),
        preto_verdes: n(defeitos.preto_verdes),
        conchas: n(defeitos.conchas),
        verdes: n(defeitos.verdes),
        quebrados: n(defeitos.quebrados),
        brocados: n(defeitos.brocados),
        mal_granados: n(defeitos.mal_granados),
        esmagados: n(defeitos.esmagados) || undefined,
        miolo_concha: n(defeitos.miolo_concha) || undefined,
      },
    };
    const opts: OpcoesCalculo = { brocadosPorDefeito };
    return calcularLaudo(crus, opts);
  }, [defeitos, brocadosPorDefeito]);

  // ===== Peneiras: dominante e bica corrida =====
  const peneirasPreview = useMemo(() => {
    const entries = Object.entries(peneiras)
      .map(([p, v]) => [p, parseFloat(v.replace(",", "."))] as const)
      .filter(([, v]) => Number.isFinite(v) && v > 0);
    const total = entries.reduce((acc, [, v]) => acc + (v as number), 0);
    const com4OuMais = entries.filter(([, v]) => (v as number) >= 10).length;
    const dominante = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    return {
      entries,
      total,
      bica_corrida: com4OuMais >= 4,
      dominante: dominante ? String(dominante[0]) : null,
    };
  }, [peneiras]);

  function setDefeito(key: keyof DefeitoForm, value: string) {
    dispatch({ type: "setDefeito", key, value });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const peneirasArr = peneirasPreview.entries.map(([p, v]) => ({
        peneira: p,
        percentual: Number(v),
      }));

      const pvaTemDados =
        n(pvaPretos) > 0 || n(pvaVerdes) > 0 || n(pvaArdidos) > 0;

      const res = await saveClassificacao({
        loteId,
        defeitosCrus: {
          intrinsecos: {
            pretos: n(defeitos.pretos),
            ardidos: n(defeitos.ardidos),
            preto_verdes: n(defeitos.preto_verdes),
            conchas: n(defeitos.conchas),
            verdes: n(defeitos.verdes),
            quebrados: n(defeitos.quebrados),
            brocados: n(defeitos.brocados),
            mal_granados: n(defeitos.mal_granados),
            esmagados: n(defeitos.esmagados) || undefined,
            miolo_concha: n(defeitos.miolo_concha) || undefined,
          },
        },
        brocadosPorDefeito,
        bebida: bebida || null,
        classe: classe || null,
        aspecto: (aspecto as "bom" | "regular" | "mau") || null,
        torra: torra || null,
        peneiras: peneirasArr,
        peneiraDominante: peneirasPreview.dominante,
        bicaCorrida: peneirasPreview.bica_corrida,
        umidade: umidade
          ? Number(umidade.replace(",", "."))
          : null,
        impurezasPct: impurezasPct
          ? Number(impurezasPct.replace(",", "."))
          : null,
        pva100g: pvaTemDados
          ? {
              pretos: n(pvaPretos),
              verdes: n(pvaVerdes),
              ardidos: n(pvaArdidos),
            }
          : null,
        observacoes: observacoes || null,
      });
      if (res && !res.ok) setError(res.error ?? "Erro ao salvar");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* ===== Defeitos intrínsecos ===== */}
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Defeitos intrínsecos</CardTitle>
            <CardDescription>
              Contagem em 300 g. Aplique a regra de prevalência:{" "}
              <span className="font-medium">
                preto &gt; ardido &gt; preto-verde &gt; concha &gt; mal granado
                &gt; verde &gt; quebrado
              </span>{" "}
              — conte cada grão UMA vez pelo defeito mais grave.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DefField
              label="Pretos"
              value={defeitos.pretos}
              onChange={(v) => setDefeito("pretos", v)}
              hint="1 grão = 1 defeito"
            />
            <DefField
              label="Ardidos"
              value={defeitos.ardidos}
              onChange={(v) => setDefeito("ardidos", v)}
              hint="2 grãos = 1 defeito"
            />
            <DefField
              label="Preto-verdes"
              value={defeitos.preto_verdes}
              onChange={(v) => setDefeito("preto_verdes", v)}
              hint="2 grãos = 1 defeito"
            />
            <DefField
              label="Conchas"
              value={defeitos.conchas}
              onChange={(v) => setDefeito("conchas", v)}
              hint="3 grãos = 1 defeito"
            />
            <DefField
              label="Verdes"
              value={defeitos.verdes}
              onChange={(v) => setDefeito("verdes", v)}
              hint="5 grãos = 1 defeito"
            />
            <DefField
              label="Quebrados"
              value={defeitos.quebrados}
              onChange={(v) => setDefeito("quebrados", v)}
              hint="5 grãos = 1 defeito"
            />
            <DefField
              label="Mal granados"
              value={defeitos.mal_granados}
              onChange={(v) => setDefeito("mal_granados", v)}
              hint="5 grãos = 1 defeito"
            />
            <div className="space-y-1">
              <Label className="text-xs">
                Brocados (mediana {brocadosPorDefeito} = 1 defeito)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={defeitos.brocados}
                  onChange={(e) => setDefeito("brocados", e.target.value)}
                  className="flex-1"
                />
                <select
                  value={brocadosPorDefeito}
                  onChange={(e) =>
                    dispatch({
                      type: "set",
                      field: "brocadosPorDefeito",
                      value: Number(e.target.value) as 2 | 3 | 4 | 5,
                    })
                  }
                  className="rounded-md border border-input bg-background px-2 text-sm"
                  title="Quantos brocados equivalem a 1 defeito"
                >
                  <option value={2}>÷ 2</option>
                  <option value={3}>÷ 3</option>
                  <option value={4}>÷ 4</option>
                  <option value={5}>÷ 5</option>
                </select>
              </div>
            </div>
            <DefField
              label="Esmagados (op.)"
              value={defeitos.esmagados}
              onChange={(v) => setDefeito("esmagados", v)}
              hint="5 grãos = 1"
            />
            <DefField
              label="Miolo de concha (op.)"
              value={defeitos.miolo_concha}
              onChange={(v) => setDefeito("miolo_concha", v)}
              hint="5 grãos = 1"
            />
          </CardContent>
        </Card>

        {/* ===== Dimensões ===== */}
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Dimensões COB</CardTitle>
            <CardDescription>Bebida, cor, aspecto e torra.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Bebida"
              value={bebida}
              onChange={(v) => dispatch({ type: "set", field: "bebida", value: v })}
              options={bebidaOpts as readonly (readonly [string, string])[]}
            />
            <SelectField
              label="Classe (cor)"
              value={classe}
              onChange={(v) => dispatch({ type: "set", field: "classe", value: v })}
              options={CLASSES}
            />
            <SelectField
              label="Aspecto"
              value={aspecto}
              onChange={(v) => dispatch({ type: "set", field: "aspecto", value: v })}
              options={ASPECTOS}
            />
            <div className="space-y-1">
              <Label htmlFor="torra" className="text-xs">
                Torra (prova)
              </Label>
              <Input
                id="torra"
                value={torra}
                onChange={(e) =>
                  dispatch({ type: "set", field: "torra", value: e.target.value })
                }
                placeholder="ex.: Boa / Fina"
              />
            </div>
          </CardContent>
        </Card>

        {/* ===== Peneiras ===== */}
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Peneiras</CardTitle>
            <CardDescription>
              % retido por peneira sobre 100 g livre de defeitos. Bica corrida
              é marcada quando ≥ 4 peneiras têm ≥ 10%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {PENEIRAS_PADRAO.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-milsaca-verde-claro">
                    {p}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={peneiras[p] ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "setPeneira",
                        key: p,
                        value: e.target.value,
                      })
                    }
                    placeholder="—"
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-milsaca-verde-claro">
              Soma:{" "}
              <span className="font-medium text-milsaca-verde">
                {peneirasPreview.total.toFixed(1)}%
              </span>{" "}
              · dominante:{" "}
              <span className="font-medium text-milsaca-verde">
                {peneirasPreview.dominante ?? "—"}
              </span>{" "}
              ·{" "}
              <span
                className={
                  peneirasPreview.bica_corrida
                    ? "font-medium text-milsaca-verde"
                    : "text-milsaca-verde-claro"
                }
              >
                {peneirasPreview.bica_corrida
                  ? "Bica Corrida"
                  : "Não é bica corrida"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* ===== Umidade / PVA / impurezas ===== */}
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">
              Umidade · PVA · impurezas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Umidade (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={umidade}
                onChange={(e) =>
                  dispatch({ type: "set", field: "umidade", value: e.target.value })
                }
                placeholder="11,2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Impurezas (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={impurezasPct}
                onChange={(e) =>
                  dispatch({
                    type: "set",
                    field: "impurezasPct",
                    value: e.target.value,
                  })
                }
                placeholder="0,5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">
                PVA em 100 g (Preto · Verde · Ardido)
              </Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pvaPretos}
                  onChange={(e) =>
                    dispatch({
                      type: "set",
                      field: "pvaPretos",
                      value: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  placeholder="Pretos"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pvaVerdes}
                  onChange={(e) =>
                    dispatch({
                      type: "set",
                      field: "pvaVerdes",
                      value: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  placeholder="Verdes"
                />
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pvaArdidos}
                  onChange={(e) =>
                    dispatch({
                      type: "set",
                      field: "pvaArdidos",
                      value: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                  placeholder="Ardidos"
                />
              </div>
              <p className="mt-1 text-xs text-milsaca-verde-claro">
                Deixe em branco se não foi medido.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ===== Observações ===== */}
        <Card className="border-milsaca-cream-escuro">
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={observacoes}
              onChange={(e) =>
                dispatch({
                  type: "set",
                  field: "observacoes",
                  value: e.target.value,
                })
              }
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex.: amostra cega #4, prova feita por 3 árbitros."
            />
          </CardContent>
        </Card>

        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="py-3 text-sm text-rose-800">
              {error}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
          >
            {pending ? "Salvando..." : "Salvar classificação"}
          </Button>
        </div>
      </div>

      {/* ===== Preview lateral (sticky) ===== */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card
          className={
            resultado.fora_de_tipo
              ? "border-rose-200 bg-rose-50"
              : "border-milsaca-cream-escuro"
          }
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              {resultado.fora_de_tipo ? (
                <AlertTriangle className="h-5 w-5 text-rose-700" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              )}
              <CardTitle className="text-base">
                {resultado.fora_de_tipo
                  ? "Fora de tipo"
                  : `Tipo ${resultado.tipo ?? "?"}`}
              </CardTitle>
            </div>
            <CardDescription>
              Preview em tempo real (IN 8/2003)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Preview
              label="Total de defeitos"
              value={String(resultado.total_defeitos)}
            />
            {!resultado.fora_de_tipo && resultado.pontuacao !== null && (
              <Preview
                label="Pontuação"
                value={
                  resultado.pontuacao > 0
                    ? `+${resultado.pontuacao}`
                    : String(resultado.pontuacao)
                }
              />
            )}
            <Preview
              label="Excluindo leves"
              value={String(resultado.breakdown.total_excluindo_leves)}
            />
            {resultado.fora_de_tipo && (
              <div className="space-y-1 rounded-md bg-rose-100 p-3 text-xs text-rose-800">
                <p className="font-medium">Motivos:</p>
                <ul className="list-disc pl-4">
                  {resultado.fora_de_tipo_motivos.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-milsaca-cream-escuro pt-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-milsaca-verde-claro">
                Breakdown
              </p>
              <BreakdownList items={resultado.breakdown.intrinsecos} />
            </div>
            <div className="flex items-center gap-2 border-t border-milsaca-cream-escuro pt-3 text-xs text-milsaca-verde-claro">
              <Coffee className="h-3 w-3" />
              <span>
                schema v{resultado.schema_version}
                {" · "}brocados ÷ {brocadosPorDefeito}
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function DefField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[10px] text-milsaca-verde-claro">{hint}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-milsaca-verde-claro">{label}</span>
      <span className="font-medium text-milsaca-verde">{value}</span>
    </div>
  );
}

function BreakdownList({ items }: { items: Record<string, number> }) {
  const entries = Object.entries(items).filter(([, v]) => v > 0);
  if (entries.length === 0) {
    return (
      <p className="text-xs text-milsaca-verde-claro">Sem defeitos contados.</p>
    );
  }
  return (
    <ul className="space-y-1 text-xs">
      {entries.map(([k, v]) => (
        <li key={k} className="flex justify-between">
          <span className="text-milsaca-verde-claro">{k}</span>
          <span className="font-medium text-milsaca-verde">{v}</span>
        </li>
      ))}
    </ul>
  );
}
