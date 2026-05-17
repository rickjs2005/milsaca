import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";

export type RegimeTributario =
  Database["public"]["Enums"]["regime_tributario"];

export const REGIME_LABEL: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
  isento: "Isento",
};

export type CompradorRow = {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  tipo: string | null;
  ativo: boolean;
  created_at: string;
};

export async function listCompradores(
  corretoraId: string,
): Promise<CompradorRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compradores")
    .select("id, name, trade_name, cnpj, city, state, tipo, ativo, created_at")
    .eq("corretora_id", corretoraId)
    .order("ativo", { ascending: false })
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []) as CompradorRow[];
}

export type CompradorDetail = CompradorRow & {
  inscricao_estadual: string | null;
  regime_tributario: RegimeTributario | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  observacoes: string | null;
};

export async function getComprador(
  corretoraId: string,
  id: string,
): Promise<CompradorDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compradores")
    .select(
      `id, name, trade_name, cnpj, inscricao_estadual, regime_tributario,
       contact_name, contact_email, contact_phone, city, state, tipo,
       ativo, observacoes, created_at`,
    )
    .eq("corretora_id", corretoraId)
    .eq("id", id)
    .maybeSingle();
  return (data as CompradorDetail | null) ?? null;
}

export type CompradorOption = { id: string; name: string };

export async function listCompradoresOptions(
  corretoraId: string,
): Promise<CompradorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compradores")
    .select("id, name")
    .eq("corretora_id", corretoraId)
    .eq("ativo", true)
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []) as CompradorOption[];
}
