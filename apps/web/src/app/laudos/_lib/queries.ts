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
