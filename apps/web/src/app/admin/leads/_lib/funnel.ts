import { createClient } from "@milsaca/db/web/server";

export type FunnelStats = {
  totalClicks: number;
  uniquePairs: number;
  convertedPairs: number;
  conversionRate: number;
};

/**
 * Calcula taxa de conversão de leads-WhatsApp pra contratos.
 *
 * Cliques únicos = pares distintos (corretora_id, produtor_id) com
 * produtor logado. Conversão = par que tem contrato criado pela mesma
 * corretora pra mesmo produtor APÓS o primeiro click.
 *
 * Volumes baixos → tudo agregado em memória. Quando passar de ~10k
 * leads, migrar pra RPC SQL.
 *
 * Se `corretoraId` for passado, filtra os números pra essa corretora.
 */
export async function loadFunnelStats(
  corretoraId?: string | null,
): Promise<FunnelStats> {
  const supabase = await createClient();

  let leadsQuery = supabase
    .from("whatsapp_leads")
    .select("corretora_id, produtor_id, created_at")
    .not("produtor_id", "is", null);
  if (corretoraId) leadsQuery = leadsQuery.eq("corretora_id", corretoraId);

  let contratosQuery = supabase
    .from("contratos")
    .select("corretora_id, produtor_id, created_at");
  if (corretoraId) contratosQuery = contratosQuery.eq("corretora_id", corretoraId);

  const [{ data: leadsRaw }, { data: contratosRaw }] = await Promise.all([
    leadsQuery,
    contratosQuery,
  ]);

  type LeadRow = {
    corretora_id: string;
    produtor_id: string;
    created_at: string;
  };
  type ContratoRow = {
    corretora_id: string;
    produtor_id: string;
    created_at: string;
  };

  const leads = (leadsRaw ?? []) as unknown as LeadRow[];
  const contratos = (contratosRaw ?? []) as unknown as ContratoRow[];

  // Primeiro click por par (corretora, produtor)
  const firstClickByPair = new Map<string, number>();
  for (const l of leads) {
    const key = `${l.corretora_id}::${l.produtor_id}`;
    const t = new Date(l.created_at).getTime();
    const prev = firstClickByPair.get(key);
    if (prev == null || t < prev) firstClickByPair.set(key, t);
  }

  // Primeiro contrato por par
  const firstContratoByPair = new Map<string, number>();
  for (const c of contratos) {
    const key = `${c.corretora_id}::${c.produtor_id}`;
    const t = new Date(c.created_at).getTime();
    const prev = firstContratoByPair.get(key);
    if (prev == null || t < prev) firstContratoByPair.set(key, t);
  }

  let convertedPairs = 0;
  for (const [key, firstClick] of firstClickByPair) {
    const firstContract = firstContratoByPair.get(key);
    if (firstContract != null && firstContract >= firstClick) {
      convertedPairs += 1;
    }
  }

  const uniquePairs = firstClickByPair.size;

  return {
    totalClicks: leads.length,
    uniquePairs,
    convertedPairs,
    conversionRate: uniquePairs > 0 ? convertedPairs / uniquePairs : 0,
  };
}
