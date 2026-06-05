import { createClient } from "@milsaca/db/web/server";

// Saldo da "carteira" do produtor = repasses que ele recebe das corretoras.
export type Carteira = {
  aReceber: number; // pendente (líquido)
  recebido: number; // pago (líquido)
  vencido: number; // pendente em atraso (líquido)
  /** Valor bruto contratado (não cancelado). */
  bruto: number;
  /** Comissão/descontos retidos pela corretora = bruto − líquido. */
  comissao: number;
};

/**
 * Soma os repasses (produtor_pagamentos) por status. RLS já restringe ao
 * próprio produtor. valor_bruto/valor_liquido são numeric → string em JS.
 *
 * `comissao` (bruto − líquido) é a fatia que a corretora retém — o MESMO
 * número que a corretora vê como "comissão" do outro lado (modelo único).
 */
export async function loadCarteira(produtorId: string): Promise<Carteira> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_pagamentos")
    .select("valor_bruto, valor_liquido, status")
    .eq("produtor_id", produtorId);

  const out: Carteira = {
    aReceber: 0,
    recebido: 0,
    vencido: 0,
    bruto: 0,
    comissao: 0,
  };
  for (const r of (data ?? []) as Array<{
    valor_bruto: number | string | null;
    valor_liquido: number | string | null;
    status: string;
  }>) {
    if (r.status === "cancelado") continue;
    const liq = r.valor_liquido != null ? Number(r.valor_liquido) : 0;
    const bru = r.valor_bruto != null ? Number(r.valor_bruto) : 0;
    out.bruto += bru;
    out.comissao += bru - liq;
    if (r.status === "pago") out.recebido += liq;
    else if (r.status === "pendente") out.aReceber += liq;
    else if (r.status === "vencido") out.vencido += liq;
  }
  return out;
}
