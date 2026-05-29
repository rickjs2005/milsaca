import { createHash } from "node:crypto";
import { createClient } from "@milsaca/db/web/server";
import type { CoffeeProcesso, CoffeeSpecie } from "@milsaca/types";
import type { DefeitosCrus } from "@milsaca/cob";

export type LaudoPublicoLote = {
  codigo: string;
  specie: CoffeeSpecie;
  processo: CoffeeProcesso | null;
  safra: string | null;
  peso_sacas: number | null;
};

export type LaudoPublicoCorretora = {
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  email: string | null;
  verified: boolean;
};

export type LaudoPublico = {
  id: string;
  created_at: string;
  tipo: string | null;
  classe: string | null;
  bebida: string | null;
  aspecto: string | null;
  torra: string | null;
  umidade: number | null;
  pva: number | null;
  impurezas_pct: number | null;
  total_defeitos: number;
  pontuacao: number | null;
  fora_de_tipo: boolean;
  fora_de_tipo_motivos: string[] | null;
  bica_corrida: boolean;
  peneira_dominante: string | null;
  peneiras: Array<{ peneira: string; percentual: number }> | null;
  defeitos_crus: DefeitosCrus | null;
  brocados_por_defeito: number;
  schema_version: number;
  observacoes: string | null;
  lote: LaudoPublicoLote;
  corretora: LaudoPublicoCorretora;
};

export async function getLaudoPublico(id: string): Promise<LaudoPublico | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_laudo_publico", {
    p_id: id,
  });
  if (error || !data) return null;
  return data as unknown as LaudoPublico;
}

/**
 * SHA-256 (hex) do payload canônico do laudo. Campos ordenados de forma
 * estável (chaves fixas + ordenação dos defeitos/peneiras) pra que o
 * mesmo laudo emitido produza sempre o mesmo hash — prova de
 * não-adulteração do PDF/laudo (achado 3.4). Como o laudo é imutável
 * após emitido, o hash é estável e pode ser exibido na página e no PDF.
 */
export function laudoContentHash(laudo: LaudoPublico): string {
  const defeitos = laudo.defeitos_crus
    ? Object.entries(laudo.defeitos_crus)
        .filter(([, v]) => typeof v === "number" && (v as number) > 0)
        .sort((a, b) => a[0].localeCompare(b[0]))
    : [];
  const peneiras = (laudo.peneiras ?? [])
    .slice()
    .sort((a, b) => a.peneira.localeCompare(b.peneira))
    .map((p) => [p.peneira, p.percentual]);

  const canonical = JSON.stringify([
    ["id", laudo.id],
    ["created_at", laudo.created_at],
    ["tipo", laudo.tipo],
    ["classe", laudo.classe],
    ["bebida", laudo.bebida],
    ["aspecto", laudo.aspecto],
    ["torra", laudo.torra],
    ["umidade", laudo.umidade],
    ["pva", laudo.pva],
    ["impurezas_pct", laudo.impurezas_pct],
    ["total_defeitos", laudo.total_defeitos],
    ["pontuacao", laudo.pontuacao],
    ["fora_de_tipo", laudo.fora_de_tipo],
    ["fora_de_tipo_motivos", laudo.fora_de_tipo_motivos],
    ["bica_corrida", laudo.bica_corrida],
    ["peneira_dominante", laudo.peneira_dominante],
    ["peneiras", peneiras],
    ["defeitos_crus", defeitos],
    ["brocados_por_defeito", laudo.brocados_por_defeito],
    ["schema_version", laudo.schema_version],
    ["lote_codigo", laudo.lote.codigo],
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
