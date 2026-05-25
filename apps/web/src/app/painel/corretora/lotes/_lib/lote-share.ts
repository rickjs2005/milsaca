/**
 * Compartilhamento de lote via WhatsApp — gera link wa.me com texto
 * descritivo. Sem dispara nada; o corretor abre num click e edita se
 * quiser antes de enviar.
 *
 * Sem destinatário fixo: o link abre wa.me/? (sem número), assim o
 * corretor escolhe contatos do WhatsApp ou cola no grupo de compradores.
 */

import { SPECIE_LABEL, PROCESSO_LABEL, type LoteRow } from "./lote-meta";

const BRL_FULL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** URL pública absoluta do lote — apontável pra qualquer um sem login. */
export function publicLoteUrl(loteId: string): string {
  return `${SITE_URL}/lote/${loteId}`;
}

export type LoteShareLink = {
  href: string;
  preview: string;
};

/**
 * Monta o texto e devolve o link wa.me sem número (corretor escolhe pra
 * quem mandar). Se houver `cotacaoRef`, inclui no texto pra ajudar o
 * comprador a comparar. Inclui link público do lote na última linha pra
 * o destinatário abrir e ver todos os detalhes.
 */
export function shareLoteOnWhatsapp(
  lote: LoteRow,
  corretoraName: string,
  cotacaoRef: number | null,
): LoteShareLink {
  const lines: string[] = [];
  lines.push(`*Lote ${lote.codigo} — ${corretoraName}*`);
  lines.push("");
  lines.push(`☕ ${SPECIE_LABEL[lote.specie]}${lote.processo ? ` · ${PROCESSO_LABEL[lote.processo] ?? lote.processo}` : ""}`);
  if (lote.peso_sacas) {
    lines.push(`📦 ${lote.peso_sacas} sacas (60 kg)`);
  }
  if (lote.safra) {
    lines.push(`🌱 Safra ${lote.safra}`);
  }
  if (lote.ultimo_tipo) {
    lines.push(
      lote.ultimo_fora_de_tipo
        ? `🔎 Classificação: Fora de tipo`
        : `🔎 Classificação: Tipo ${lote.ultimo_tipo}`,
    );
  }
  if (lote.produtor_nome && lote.produtor_nome !== "Sem produtor") {
    const local = [lote.city, lote.state].filter(Boolean).join("/");
    lines.push(
      `👤 Produtor: ${lote.produtor_nome}${local ? ` · ${local}` : ""}`,
    );
  }
  if (cotacaoRef != null) {
    lines.push("");
    lines.push(
      `📈 Cotação de referência da praça: ${BRL_FULL.format(cotacaoRef)}/sc`,
    );
  }
  lines.push("");
  lines.push("Detalhes completos:");
  lines.push(publicLoteUrl(lote.id));
  lines.push("");
  lines.push("Interessado? Me chama aqui pra fechar.");

  const text = lines.join("\n");
  return {
    href: `https://wa.me/?text=${encodeURIComponent(text)}`,
    preview: text,
  };
}
