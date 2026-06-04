import { createClient } from "@milsaca/db/web/server";

// Uma classificação que ALGUMA corretora deu pro café (comparação de amostras):
// "Corretora A deu Mole/Tipo 2; Corretora B deu Rio/Tipo 6".
export type ClassificacaoResumo = {
  id: string;
  corretora_nome: string | null;
  tipo: string | null;
  bebida: string | null;
  fora_de_tipo: boolean;
  created_at: string;
};

// Uma linha da "planilha" do produtor = um lote dele (qualquer status).
export type MeuCafeRow = {
  id: string;
  codigo: string;
  specie: string;
  processo: string | null;
  safra: string | null;
  status: string;
  pesoKg: number;
  pesoSacas: number;
  pesoPorBagKg: number | null;
  corretoraNome: string | null;
  classificacoes: ClassificacaoResumo[];
  precoSaca: number | null;
  valorEstimado: number | null;
};

function pickName(v: { name: string } | { name: string }[] | null): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]?.name ?? null : v.name;
}

/**
 * Carrega a "planilha" de cafés do produtor: todos os lotes não-arquivados,
 * com as classificações que cada corretora deu (comparação) e o valor estimado
 * pela cotação CEPEA da espécie. RLS já restringe aos lotes do próprio produtor.
 */
export async function loadMeusCafes(produtorId: string): Promise<MeuCafeRow[]> {
  const supabase = await createClient();

  const [lotesRes, marketRes] = await Promise.all([
    supabase
      .from("lotes")
      .select(
        "id, codigo, specie, processo, safra, status, peso_kg, peso_sacas, peso_por_volume_kg, unidade_entrada, created_at, corretoras(name)",
      )
      .eq("produtor_id", produtorId)
      .neq("status", "arquivado")
      .order("created_at", { ascending: false }),
    supabase
      .from("market_quotes")
      .select("symbol, price_brl_cents")
      .in("symbol", ["arabica_bica_corrida_esalq", "conilon_es_esalq"]),
  ]);

  type LoteRaw = {
    id: string;
    codigo: string;
    specie: string;
    processo: string | null;
    safra: string | null;
    status: string;
    peso_kg: number | string | null;
    peso_sacas: number | string | null;
    peso_por_volume_kg: number | string | null;
    unidade_entrada: string | null;
    corretoras: { name: string } | { name: string }[] | null;
  };
  const lotes = (lotesRes.data ?? []) as LoteRaw[];
  const loteIds = lotes.map((l) => l.id);

  // Preço CEPEA por espécie (R$/saca).
  const precoBySpecie: Record<string, number> = {};
  for (const m of (marketRes.data ?? []) as Array<{
    symbol: string;
    price_brl_cents: number | null;
  }>) {
    if (m.price_brl_cents == null) continue;
    // chaveado pela grafia do enum coffee_specie do LOTE (arabica / conillon).
    if (m.symbol === "arabica_bica_corrida_esalq")
      precoBySpecie.arabica = m.price_brl_cents / 100;
    if (m.symbol === "conilon_es_esalq")
      precoBySpecie.conillon = m.price_brl_cents / 100;
  }

  // Classificações dos lotes (pode haver várias por lote, de corretoras diferentes).
  const porLote = new Map<string, ClassificacaoResumo[]>();
  if (loteIds.length > 0) {
    const { data: classData } = await supabase
      .from("classificacoes_cob")
      .select(
        "id, lote_id, tipo, bebida, fora_de_tipo, anulada, created_at, corretoras(name)",
      )
      .in("lote_id", loteIds)
      .eq("anulada", false)
      .order("created_at", { ascending: false });

    for (const c of (classData ?? []) as Array<{
      id: string;
      lote_id: string;
      tipo: string | null;
      bebida: string | null;
      fora_de_tipo: boolean;
      created_at: string;
      corretoras: { name: string } | { name: string }[] | null;
    }>) {
      const arr = porLote.get(c.lote_id) ?? [];
      arr.push({
        id: c.id,
        corretora_nome: pickName(c.corretoras),
        tipo: c.tipo,
        bebida: c.bebida,
        fora_de_tipo: c.fora_de_tipo,
        created_at: c.created_at,
      });
      porLote.set(c.lote_id, arr);
    }
  }

  return lotes.map((l): MeuCafeRow => {
    const pesoSacas = l.peso_sacas != null ? Number(l.peso_sacas) : 0;
    const precoSaca = precoBySpecie[l.specie] ?? null;
    return {
      id: l.id,
      codigo: l.codigo,
      specie: l.specie,
      processo: l.processo,
      safra: l.safra,
      status: l.status,
      pesoKg: l.peso_kg != null ? Number(l.peso_kg) : 0,
      pesoSacas,
      pesoPorBagKg:
        l.unidade_entrada === "bag" && l.peso_por_volume_kg != null
          ? Number(l.peso_por_volume_kg)
          : null,
      corretoraNome: pickName(l.corretoras),
      classificacoes: porLote.get(l.id) ?? [],
      precoSaca,
      valorEstimado:
        precoSaca != null ? Math.round(pesoSacas * precoSaca) : null,
    };
  });
}
