// Meta PURA dos leads-WhatsApp (sem acesso a dados) — pode ser importada tanto
// pelo Server Component quanto pelo client view. Mantida separada de queries.ts
// (que importa @milsaca/db/web/server, server-only) pra não arrastar o client
// supabase server pro bundle do navegador.

import type { StatusTone } from "@/components/status-badge";

export const WHATSAPP_LEADS_PAGE_SIZE = 30;

/** Origens de lead-WhatsApp + rótulo pt-BR e tone semântico do badge. */
export const SOURCE_META: Record<string, { label: string; tone: StatusTone }> = {
  catalogo_corretoras: { label: "Catálogo", tone: "success" },
  perfil_corretora: { label: "Perfil", tone: "info" },
  home_publica: { label: "Home", tone: "warning" },
  outro: { label: "Outro", tone: "neutral" },
};

/** Opções de filtro de origem (inclui "Todas"). */
export const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "catalogo_corretoras", label: "Catálogo" },
  { value: "perfil_corretora", label: "Perfil" },
  { value: "home_publica", label: "Home" },
  { value: "outro", label: "Outro" },
];

export type WhatsAppLeadItem = {
  id: string;
  source: string;
  message: string | null;
  user_agent: string | null;
  created_at: string;
  produtor_id: string | null;
  produtor_nome: string | null;
  produtor_phone: string | null;
};

export type WhatsAppLeadsFilter = {
  source?: string | null;
};
