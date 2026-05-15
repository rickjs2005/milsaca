import { createClient } from "@milsaca/db/web/server";
import type { Lote } from "@milsaca/types";

export type LoteRow = Pick<
  Lote,
  | "id"
  | "codigo"
  | "specie"
  | "processo"
  | "safra"
  | "peso_sacas"
  | "status"
  | "created_at"
> & {
  produtor: string;
  ultimo_tipo: string | null;
  ultimo_fora_de_tipo: boolean;
};

export async function listLotes(): Promise<LoteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lotes")
    .select(
      `id, codigo, specie, processo, safra, peso_sacas, status, created_at,
       produtor:profiles!lotes_produtor_id_fkey(full_name),
       classificacoes_cob(tipo, fora_de_tipo, created_at, anulada)`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listLotes:", error.message);
    return [];
  }

  type Raw = {
    id: string;
    codigo: string;
    specie: "arabica" | "conillon";
    processo: string | null;
    safra: string | null;
    peso_sacas: number | null;
    status: Lote["status"];
    created_at: string;
    produtor: { full_name: string | null } | { full_name: string | null }[] | null;
    classificacoes_cob: Array<{
      tipo: string | null;
      fora_de_tipo: boolean;
      created_at: string;
      anulada: boolean;
    }> | null;
  };

  const rows = (data ?? []) as Raw[];
  return rows.map((r) => {
    const produtor = Array.isArray(r.produtor)
      ? r.produtor[0]?.full_name
      : r.produtor?.full_name;
    const vigente = (r.classificacoes_cob ?? [])
      .filter((c) => !c.anulada)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: r.id,
      codigo: r.codigo,
      specie: r.specie,
      processo: r.processo as Lote["processo"],
      safra: r.safra,
      peso_sacas: r.peso_sacas,
      status: r.status,
      created_at: r.created_at,
      produtor: produtor ?? "Sem produtor",
      ultimo_tipo: vigente?.tipo ?? null,
      ultimo_fora_de_tipo: vigente?.fora_de_tipo ?? false,
    };
  });
}

export type ProdutorOption = {
  id: string;
  nome: string;
};

export async function listProdutores(): Promise<ProdutorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, roles")
    .order("full_name", { ascending: true });

  type Raw = {
    id: string;
    full_name: string | null;
    roles: string[] | null;
  };

  const rows = (data ?? []) as Raw[];
  return rows
    .filter((r) => (r.roles ?? []).includes("produtor"))
    .map((r) => ({ id: r.id, nome: r.full_name ?? "Sem nome" }));
}
