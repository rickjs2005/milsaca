export type RegiaoCafeeira =
  | "zona_da_mata"
  | "sul_de_minas"
  | "cerrado_mineiro"
  | "matas_de_minas"
  | "caparao"
  | "mogiana"
  | "espirito_santo"
  | "bahia"
  | "rondonia"
  | "outras";

export const REGIOES_CAFEEIRAS: { value: RegiaoCafeeira; label: string }[] = [
  { value: "zona_da_mata", label: "Zona da Mata (MG)" },
  { value: "sul_de_minas", label: "Sul de Minas (MG)" },
  { value: "cerrado_mineiro", label: "Cerrado Mineiro (MG)" },
  { value: "matas_de_minas", label: "Matas de Minas (MG)" },
  { value: "caparao", label: "Caparaó (MG/ES)" },
  { value: "mogiana", label: "Mogiana (SP/MG)" },
  { value: "espirito_santo", label: "Espírito Santo" },
  { value: "bahia", label: "Bahia" },
  { value: "rondonia", label: "Rondônia" },
  { value: "outras", label: "Outras" },
];

export const REGIAO_LABEL: Record<RegiaoCafeeira, string> = Object.fromEntries(
  REGIOES_CAFEEIRAS.map((r) => [r.value, r.label]),
) as Record<RegiaoCafeeira, string>;

const VALID = new Set<string>(REGIOES_CAFEEIRAS.map((r) => r.value));

export function parseRegioesFromForm(formData: FormData): RegiaoCafeeira[] {
  return formData
    .getAll("regioes_atendimento")
    .map((v) => String(v))
    .filter((v): v is RegiaoCafeeira => VALID.has(v));
}
