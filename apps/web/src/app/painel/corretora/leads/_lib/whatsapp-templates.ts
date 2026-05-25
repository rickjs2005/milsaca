/**
 * Geração de links wa.me com mensagem template contextual.
 *
 * Não dispara nada — só constrói a URL que o corretor abre num click.
 * Sem integração WhatsApp Business API, então a abordagem é manter
 * o corretor com 1 click de distância de uma conversa pré-formatada.
 *
 * Sanitização:
 *   - phone: remove tudo que não for dígito, mantém DDI/DDD se vierem.
 *   - text: pega o template, faz interpolação, encodeURIComponent.
 *
 * Convenção de tom: tratamento por nome (primeiro nome), "você", curto,
 * direto. Sem promessas que o corretor não vá honrar.
 */

import type { LeadListItem, LeadStatus } from "./lead-meta";

const COFFEE_LABEL: Record<string, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Heurística leve: número BR com 10/11 dígitos sem DDI → prefixa 55.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function describeProposta(lead: LeadListItem): string {
  const parts: string[] = [];
  if (lead.coffee_type) {
    parts.push(COFFEE_LABEL[lead.coffee_type] ?? lead.coffee_type);
  }
  if (lead.bag_count != null) parts.push(`${lead.bag_count} sacas`);
  if (lead.proposed_price != null) {
    parts.push(`${BRL.format(lead.proposed_price)}/sc`);
  }
  return parts.join(" · ");
}

const TEMPLATES: Record<LeadStatus, (lead: LeadListItem, corretora: string) => string> = {
  novo: (lead, corretora) => {
    const nome = firstName(lead.produtor_nome);
    return `Olá, ${nome}! Aqui é da ${corretora}. Recebemos seu interesse em café. Você pode confirmar a quantidade de sacas, tipo de café e cidade pra eu seguir com a proposta?`;
  },
  em_negociacao: (lead, corretora) => {
    const nome = firstName(lead.produtor_nome);
    const detalhes = describeProposta(lead);
    const escopo = detalhes ? ` (${detalhes})` : "";
    return `Oi ${nome}, tudo bem? Aqui é da ${corretora}. Passando pra retomar a conversa sobre o café${escopo}. Tem alguma dúvida ou condição que ajude a fechar?`;
  },
  convertido: (lead, corretora) => {
    const nome = firstName(lead.produtor_nome);
    return `${nome}, fechamos! Aqui é da ${corretora}. Vou enviar o contrato em sequência e combinamos a logística da entrega.`;
  },
  perdido: (lead, corretora) => {
    const nome = firstName(lead.produtor_nome);
    return `Oi ${nome}, aqui é da ${corretora}. A negociação anterior não avançou, mas quando tiver café disponível me chame — temos compradores cadastrados.`;
  },
  arquivado: (lead, corretora) => {
    const nome = firstName(lead.produtor_nome);
    return `Oi ${nome}, aqui é da ${corretora}. Estou retomando contatos da minha base. Você ainda tem café pra negociar?`;
  },
};

export type WhatsappLink = {
  /** href pronto pra <a target="_blank">. */
  href: string;
  /** Texto que vai ser pré-preenchido — útil pra preview/tooltip. */
  preview: string;
  /** false quando o lead não tem telefone — desabilita o botão. */
  hasPhone: boolean;
};

/**
 * Gera o link wa.me + texto contextualizado pelo status atual do lead.
 * Quando `hasPhone === false`, ainda devolve `href` que abre wa.me sem
 * número (o WhatsApp pergunta pra qual contato enviar). UI deve mostrar
 * aviso pra esses casos.
 */
export function whatsappLinkFor(
  lead: LeadListItem,
  corretoraName: string,
): WhatsappLink {
  const phone = sanitizePhone(lead.produtor_phone);
  const text = TEMPLATES[lead.status](lead, corretoraName);
  const base = phone
    ? `https://wa.me/${phone}`
    : "https://wa.me/";
  const href = `${base}?text=${encodeURIComponent(text)}`;
  return {
    href,
    preview: text,
    hasPhone: Boolean(phone),
  };
}
