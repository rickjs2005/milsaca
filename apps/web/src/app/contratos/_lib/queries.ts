import { createClient } from "@milsaca/db/web/server";

export type ContratoPublicoCorretora = {
  name: string;
  city: string | null;
  state: string | null;
};

export type ContratoPublicoParte = {
  nome: string;
  doc: string | null;
  city: string | null;
  state: string | null;
};

export type ContratoPublico = {
  id: string;
  code: string;
  status: string;
  signed_at: string | null;
  content_hash: string | null;
  corretora: ContratoPublicoCorretora;
  produtor: ContratoPublicoParte;
  comprador: ContratoPublicoParte | null;
};

/**
 * Verificação pública de contrato via RPC get_contrato_publico (anon).
 * A RPC projeta só campos seguros/mascarados — sem valor/comissão/PII
 * completa.
 */
export async function getContratoPublico(
  id: string,
): Promise<ContratoPublico | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contrato_publico", {
    p_id: id,
  });
  if (error || !data) return null;
  return data as unknown as ContratoPublico;
}
