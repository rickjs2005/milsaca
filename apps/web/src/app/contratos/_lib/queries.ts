import { unstable_cache } from "next/cache";
import { createPublicClient } from "@milsaca/db/web/public";

type ContratoPublicoCorretora = {
  name: string;
  city: string | null;
  state: string | null;
};

type ContratoPublicoParte = {
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
  // Cache via unstable_cache com client sem cookie (Opção A): dados 100%
  // públicos/mascarados pela RPC, independem do usuário. TTL menor que o
  // laudo (300s) porque o STATUS do contrato muda ao longo do ciclo
  // (rascunho → ativo → finalizado/cancelado) e queremos refletir isso em
  // tempo razoável. Tag `contrato-<id>` permite invalidação pontual.
  const fetchContrato = unstable_cache(
    async (contratoId: string): Promise<ContratoPublico | null> => {
      const supabase = createPublicClient();
      const { data, error } = await supabase.rpc("get_contrato_publico", {
        p_id: contratoId,
      });
      if (error || !data) return null;
      return data as unknown as ContratoPublico;
    },
    ["contrato-publico"],
    { revalidate: 300, tags: [`contrato-${id}`] },
  );
  return fetchContrato(id);
}
