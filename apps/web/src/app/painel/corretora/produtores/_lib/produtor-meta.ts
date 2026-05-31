import type { StatusTone } from "@/components/status-badge";

/**
 * META PURA da tela de Produtores da corretora.
 *
 * SÓ tipos, constantes, mapas de label/tone e funções puras. NÃO importa
 * `@milsaca/db/...` nem nada server-only — este arquivo é consumido por
 * client components.
 *
 * Domínio: a lista mistura produtores REAIS (têm conta: profiles+produtores)
 * e CONTATOS-sombra (tabela `produtor_contatos`, cadastrados pela corretora
 * antes do produtor entrar). Um contato vira "vinculado" (claimed) quando o
 * produtor loga com o mesmo email.
 */

/**
 * Item da lista de produtores+contatos. Espelha o que `queries.ts` produz,
 * ESTENDIDO com `valor_movimentado` e `na_plataforma`.
 *
 * NOTA: este tipo é a fonte canônica. `queries.ts` deve importar daqui.
 */
export type ProdutorListItem = {
  kind: "produtor" | "contato";
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  fazenda_nome: string | null;
  city: string | null;
  state: string | null;
  has_account: boolean;
  claimed: boolean;
  qtd_leads: number;
  qtd_contratos: number;
  /** Soma de contratos.total_value do produtor (R$ bruto movimentado). 0 pra contatos-sombra. */
  valor_movimentado: number;
  last_activity: string | null;
  /** Derivado: produtor real OU contato já vinculado. Usado em filtro/KPI "na plataforma". */
  na_plataforma: boolean;
};

/**
 * Status de EXIBIÇÃO do produtor na lista.
 *
 * ATENÇÃO: NÃO inverter a semântica agora. A inversão dos labels para
 * "Cadastrado (fantasma) / Ativo (na plataforma)" está ADIADA para uma
 * migração de modelo dedicada. Aqui mantemos os labels atuais e apenas
 * adicionamos cor/tone.
 */
export type ProdutorStatus = "cadastrado" | "vinculado" | "pendente";

export const PRODUTOR_STATUS_LABEL: Record<ProdutorStatus, string> = {
  cadastrado: "Cadastrado",
  vinculado: "Vinculado",
  pendente: "Pendente",
};

export const PRODUTOR_STATUS_TONE: Record<ProdutorStatus, StatusTone> = {
  cadastrado: "success",
  vinculado: "info",
  pendente: "warning",
};

/**
 * Deriva o status de exibição:
 * - produtor real (kind==="produtor") → "cadastrado"
 * - contato já vinculado (kind==="contato" && claimed) → "vinculado"
 * - contato-sombra ainda sem conta → "pendente"
 */
export function produtorStatus(
  p: Pick<ProdutorListItem, "kind" | "claimed">,
): ProdutorStatus {
  if (p.kind === "produtor") return "cadastrado";
  return p.claimed ? "vinculado" : "pendente";
}

/**
 * Link de detalhe. Contatos-sombra têm página própria; produtor real ainda
 * não tem página de detalhe (retorna null).
 */
export function detalheHref(
  p: Pick<ProdutorListItem, "kind" | "id">,
): string | null {
  if (p.kind === "contato") {
    return `/painel/corretora/produtores/contatos/${p.id}`;
  }
  return null;
}

export type ProdutorSortKey = "negocios" | "recente" | "nome";

export const PRODUTOR_SORT_LABEL: Record<ProdutorSortKey, string> = {
  negocios: "Mais negócios",
  recente: "Mais recente",
  nome: "Nome (A-Z)",
};

export const TIPO_FILTERS: {
  value: "" | "plataforma" | "contato";
  label: string;
}[] = [
  { value: "", label: "Todos" },
  { value: "plataforma", label: "Na plataforma" },
  { value: "contato", label: "Contato" },
];

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatBRL(value: number): string {
  return BRL_FORMATTER.format(value);
}

export type ProdutoresKpis = {
  total: number;
  naPlataforma: number;
  movimentado: number;
  totalContratos: number;
  ticketMedio: number;
};

/**
 * KPIs derivados PUROS da lista já carregada — evita query extra, já que a
 * página carrega todos os items.
 */
export function computeProdutoresKpis(
  items: ProdutorListItem[],
): ProdutoresKpis {
  let naPlataforma = 0;
  let movimentado = 0;
  let totalContratos = 0;

  for (const item of items) {
    if (item.na_plataforma) naPlataforma += 1;
    movimentado += item.valor_movimentado;
    totalContratos += item.qtd_contratos;
  }

  return {
    total: items.length,
    naPlataforma,
    movimentado,
    totalContratos,
    ticketMedio: totalContratos > 0 ? movimentado / totalContratos : 0,
  };
}
