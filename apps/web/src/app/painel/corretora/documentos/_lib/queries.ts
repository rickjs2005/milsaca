// Queries de leitura da gestão documental (painel da corretora).
// RLS resolve a visibilidade: docs do tenant + docs subidos por produtores
// relacionados (lead/contrato). Aqui só filtramos deleted_at e juntamos
// labels dos vínculos em lote (batch, sem N+1).

import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";
import type {
  DocumentoCategoria,
  DocumentoOwnerKind,
} from "@/lib/documentos";

export type DocumentoRow =
  Database["public"]["Tables"]["documentos"]["Row"];

export type DocumentoComVinculo = DocumentoRow & {
  /** Label humano do vínculo (código do lote/contrato, nome do produtor). */
  vinculo_label: string;
};

export type DocumentosFiltro = {
  categoria?: DocumentoCategoria;
  ownerKind?: DocumentoOwnerKind;
};

async function labelsDeVinculo(
  docs: DocumentoRow[],
): Promise<Map<string, string>> {
  const supabase = await createClient();
  const labels = new Map<string, string>();

  const idsPor = (kind: DocumentoOwnerKind) => [
    ...new Set(
      docs.filter((d) => d.owner_kind === kind).map((d) => d.owner_id),
    ),
  ];

  const loteIds = idsPor("lote");
  if (loteIds.length > 0) {
    const { data } = await supabase
      .from("lotes")
      .select("id, codigo")
      .in("id", loteIds);
    for (const l of data ?? []) {
      labels.set(`lote:${l.id}`, `Lote ${l.codigo ?? l.id.slice(0, 8)}`);
    }
  }

  const contratoIds = idsPor("contrato");
  if (contratoIds.length > 0) {
    const { data } = await supabase
      .from("contratos")
      .select("id, code")
      .in("id", contratoIds);
    for (const c of data ?? []) {
      labels.set(
        `contrato:${c.id}`,
        `Contrato ${c.code ?? c.id.slice(0, 8)}`,
      );
    }
  }

  const produtorIds = idsPor("produtor");
  if (produtorIds.length > 0) {
    const { data } = await supabase
      .from("produtores")
      .select("id, fazenda_nome, profiles!produtores_profile_id_fkey(full_name)")
      .in("id", produtorIds);
    for (const p of data ?? []) {
      const profile = p.profiles as { full_name: string | null } | null;
      labels.set(
        `produtor:${p.id}`,
        profile?.full_name ?? p.fazenda_nome ?? "Produtor",
      );
    }
  }

  return labels;
}

export async function listDocumentos(
  filtro: DocumentosFiltro = {},
): Promise<DocumentoComVinculo[]> {
  const supabase = await createClient();
  let query = supabase
    .from("documentos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtro.categoria) query = query.eq("categoria", filtro.categoria);
  if (filtro.ownerKind) query = query.eq("owner_kind", filtro.ownerKind);

  const { data } = await query;
  const docs = (data ?? []) as DocumentoRow[];
  const labels = await labelsDeVinculo(docs);
  return docs.map((d) => ({
    ...d,
    vinculo_label:
      d.owner_kind === "corretora"
        ? "Corretora"
        : (labels.get(`${d.owner_kind}:${d.owner_id}`) ??
          `${d.owner_kind} ${d.owner_id.slice(0, 8)}`),
  }));
}

/** Documentos de UM vínculo (pra seção embutida em lote/contrato). */
export async function listDocumentosDoOwner(
  ownerKind: DocumentoOwnerKind,
  ownerId: string,
): Promise<DocumentoRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos")
    .select("*")
    .eq("owner_kind", ownerKind)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as DocumentoRow[];
}

/** Signed URL curtinha (5 min) — mesmo padrão do bucket comprovantes. */
export async function getDocumentoSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(storagePath, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}

export type VinculoOption = { id: string; label: string };

/** Opções dos selects do form de upload (lotes/contratos/produtores do tenant). */
export async function listVinculoOptions(): Promise<{
  lotes: VinculoOption[];
  contratos: VinculoOption[];
  produtores: VinculoOption[];
}> {
  const supabase = await createClient();
  const [lotesRes, contratosRes, produtoresRes] = await Promise.all([
    supabase
      .from("lotes")
      .select("id, codigo")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("contratos")
      .select("id, code")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("produtores")
      .select("id, fazenda_nome, profiles!produtores_profile_id_fkey(full_name)")
      .limit(500),
  ]);

  return {
    lotes: (lotesRes.data ?? []).map((l) => ({
      id: l.id,
      label: `Lote ${l.codigo ?? l.id.slice(0, 8)}`,
    })),
    contratos: (contratosRes.data ?? []).map((c) => ({
      id: c.id,
      label: `Contrato ${c.code ?? c.id.slice(0, 8)}`,
    })),
    produtores: (produtoresRes.data ?? []).map((p) => {
      const profile = p.profiles as { full_name: string | null } | null;
      return {
        id: p.id,
        label: profile?.full_name ?? p.fazenda_nome ?? p.id.slice(0, 8),
      };
    }),
  };
}
