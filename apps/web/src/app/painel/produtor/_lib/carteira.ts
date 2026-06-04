import { createClient } from "@milsaca/db/web/server";

// Saldo da "carteira" do produtor = repasses que ele recebe das corretoras.
export type Carteira = {
  aReceber: number; // pendente
  recebido: number; // pago
  vencido: number; // pendente em atraso
};

/**
 * Soma os repasses (produtor_pagamentos) por status. RLS já restringe ao
 * próprio produtor. valor_liquido é numeric → supabase-js devolve string.
 */
export async function loadCarteira(produtorId: string): Promise<Carteira> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtor_pagamentos")
    .select("valor_liquido, status")
    .eq("produtor_id", produtorId);

  const out: Carteira = { aReceber: 0, recebido: 0, vencido: 0 };
  for (const r of (data ?? []) as Array<{
    valor_liquido: number | string | null;
    status: string;
  }>) {
    const v = r.valor_liquido != null ? Number(r.valor_liquido) : 0;
    if (r.status === "pago") out.recebido += v;
    else if (r.status === "pendente") out.aReceber += v;
    else if (r.status === "vencido") out.vencido += v;
  }
  return out;
}
