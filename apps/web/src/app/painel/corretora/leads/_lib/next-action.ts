/**
 * "Próxima ação recomendada" pra um lead — função pura.
 *
 * Schema atual de `leads` não tem urgência nem origem (briefing pediu),
 * então derivamos urgência implicitamente a partir de (status + idade
 * desde último update). O texto da ação é orientado ao corretor, não
 * ao produtor.
 *
 * Convenção de tom:
 *   - quente: precisa ação hoje
 *   - morno: precisa ação esta semana
 *   - frio: pode esperar / sem ação obrigatória
 */

import type { LeadListItem, LeadStatus } from "./lead-meta";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Urgencia = "quente" | "morno" | "frio";

export type NextAction = {
  /** Texto curto pro card (1 frase). */
  label: string;
  /** Tom visual: vermelho/dourado/cinza. */
  urgencia: Urgencia;
};

/** Idade do lead em dias desde o último update. */
function ageInDays(lead: LeadListItem): number {
  return (Date.now() - new Date(lead.updated_at).getTime()) / DAY_MS;
}

const ACTIONS: Record<LeadStatus, (lead: LeadListItem) => NextAction> = {
  novo: (lead) => {
    const age = ageInDays(lead);
    if (age >= 1) {
      return {
        label: "Lead esfriando — contatar com urgência",
        urgencia: "quente",
      };
    }
    return {
      label: "Fazer primeiro contato",
      urgencia: "morno",
    };
  },
  em_negociacao: (lead) => {
    const age = ageInDays(lead);
    if (age >= 3) {
      return {
        label: "Sem update há dias — fazer follow-up",
        urgencia: "quente",
      };
    }
    return {
      label: "Aguardando resposta do produtor",
      urgencia: "morno",
    };
  },
  convertido: () => ({
    label: "Converter em contrato",
    urgencia: "morno",
  }),
  perdido: () => ({
    label: "Arquivar ou reabrir conforme contexto",
    urgencia: "frio",
  }),
  arquivado: () => ({
    label: "Sem ação obrigatória",
    urgencia: "frio",
  }),
};

export function nextActionFor(lead: LeadListItem): NextAction {
  return ACTIONS[lead.status](lead);
}

/**
 * Ação PRIMÁRIA do card (1 clique), centralizada e alinhada ao estágio:
 *   - novo            → avança pra em_negociacao
 *   - em_negociacao   → avança pra convertido
 *   - convertido      → gera contrato (regra: só aparece em deal_won)
 *   - perdido/arquiv. → sem ação primária
 * `advance` usa server action (form); `link` é navegação.
 */
export type PrimaryAction =
  | { type: "advance"; label: string; toStatus: LeadStatus }
  | { type: "link"; label: string; href: string }
  | null;

export function primaryLeadAction(lead: LeadListItem): PrimaryAction {
  switch (lead.status) {
    case "novo":
      return {
        type: "advance",
        label: "Marcar em negociação",
        toStatus: "em_negociacao",
      };
    case "em_negociacao":
      return {
        type: "advance",
        label: "Marcar convertido",
        toStatus: "convertido",
      };
    case "convertido":
      return {
        type: "link",
        label: "Gerar contrato",
        href: `/painel/corretora/contratos/novo?lead=${lead.id}`,
      };
    default:
      return null;
  }
}

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

export const URGENCIA_FILTER_ORDER: Urgencia[] = ["quente", "morno", "frio"];
