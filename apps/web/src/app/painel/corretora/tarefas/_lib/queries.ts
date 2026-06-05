import { createClient } from "@milsaca/db/web/server";
import type { LeadStatus } from "../../leads/_lib/lead-meta";
import type { ContratoStatus } from "../../contratos/_lib/contrato-meta";
import type { PagamentoStatus } from "../../pagamentos/_lib/pagamento-meta";

/**
 * Queries da Central de tarefas — agregam tudo que exige uma AÇÃO da corretora,
 * agrupado por tipo de ação. Cada grupo filtra por `corretora_id` (defesa em
 * profundidade sobre o RLS) e ordena pelo mais urgente primeiro.
 *
 * `numeric` vem como string do supabase-js → `Number()` no boundary.
 */

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type TarefaLead = {
  id: string;
  produtor_nome: string;
  status: Extract<LeadStatus, "novo" | "em_negociacao">;
  bag_count: number | null;
  coffee_type: string | null;
  updated_at: string;
};

export type TarefaContrato = {
  id: string;
  code: string;
  produtor_nome: string;
  status: Extract<ContratoStatus, "rascunho" | "em_analise">;
  total_value: number | null;
};

export type TarefaPagamento = {
  id: string;
  produtor_nome: string;
  contrato_code: string | null;
  valor_liquido: number;
  status: Extract<PagamentoStatus, "vencido" | "pendente">;
  data_prevista: string | null;
};

export type TarefaEntrega = {
  id: string;
  contrato_code: string;
  produtor_nome: string;
  bag_count: number | null;
};

export type Tarefas = {
  responderProdutor: TarefaLead[];
  assinarContrato: TarefaContrato[];
  cobrarPagamento: TarefaPagamento[];
  conferirEntrega: TarefaEntrega[];
};

const EMPTY: Tarefas = {
  responderProdutor: [],
  assinarContrato: [],
  cobrarPagamento: [],
  conferirEntrega: [],
};

export async function loadTarefas(corretoraId: string): Promise<Tarefas> {
  if (!corretoraId) return EMPTY;
  const supabase = await createClient();

  const [leads, contratos, pagamentos, entregas] = await Promise.all([
    // Leads novo/em_negociacao já são não-terminais: ao gerar contrato o lead
    // vira "convertido" (máquina de estados), então não há contrato aqui.
    supabase
      .from("leads")
      .select(
        "id, status, bag_count, coffee_type, updated_at, produtor:profiles!leads_produtor_id_fkey(full_name)",
      )
      .eq("corretora_id", corretoraId)
      .in("status", ["novo", "em_negociacao"])
      .order("updated_at", { ascending: true })
      .limit(50),
    supabase
      .from("contratos")
      .select(
        "id, code, status, total_value, produtor:profiles!contratos_produtor_id_fkey(full_name)",
      )
      .eq("corretora_id", corretoraId)
      .in("status", ["rascunho", "em_analise"])
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("produtor_pagamentos")
      .select(
        "id, valor_liquido, status, data_prevista, produtor:profiles!produtor_pagamentos_produtor_id_fkey(full_name), contrato:contratos!produtor_pagamentos_contrato_id_fkey(code)",
      )
      .eq("corretora_id", corretoraId)
      .in("status", ["vencido", "pendente"])
      .order("data_prevista", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("entregas")
      .select(
        "id, bag_count, contrato:contratos!entregas_contrato_id_fkey(code), produtor:profiles!entregas_produtor_id_fkey(full_name)",
      )
      .eq("corretora_id", corretoraId)
      .eq("status", "recebida")
      .order("data_prevista", { ascending: true, nullsFirst: false })
      .limit(50),
  ]);

  const responderProdutor: TarefaLead[] = (
    (leads.data ?? []) as Array<{
      id: string;
      status: "novo" | "em_negociacao";
      bag_count: number | string | null;
      coffee_type: string | null;
      updated_at: string;
      produtor: { full_name: string | null } | { full_name: string | null }[] | null;
    }>
  ).map((r) => ({
    id: r.id,
    produtor_nome: pickOne(r.produtor)?.full_name ?? "Produtor sem nome",
    status: r.status,
    bag_count: r.bag_count != null ? Number(r.bag_count) : null,
    coffee_type: r.coffee_type,
    updated_at: r.updated_at,
  }));

  const assinarContrato: TarefaContrato[] = (
    (contratos.data ?? []) as Array<{
      id: string;
      code: string;
      status: "rascunho" | "em_analise";
      total_value: number | string | null;
      produtor: { full_name: string | null } | { full_name: string | null }[] | null;
    }>
  ).map((r) => ({
    id: r.id,
    code: r.code,
    produtor_nome: pickOne(r.produtor)?.full_name ?? "—",
    status: r.status,
    total_value: r.total_value != null ? Number(r.total_value) : null,
  }));

  const cobrarPagamento: TarefaPagamento[] = (
    (pagamentos.data ?? []) as Array<{
      id: string;
      valor_liquido: number | string;
      status: "vencido" | "pendente";
      data_prevista: string | null;
      produtor: { full_name: string | null } | { full_name: string | null }[] | null;
      contrato: { code: string } | { code: string }[] | null;
    }>
  ).map((r) => ({
    id: r.id,
    produtor_nome: pickOne(r.produtor)?.full_name ?? "—",
    contrato_code: pickOne(r.contrato)?.code ?? null,
    valor_liquido: Number(r.valor_liquido),
    status: r.status,
    data_prevista: r.data_prevista,
  }));

  const conferirEntrega: TarefaEntrega[] = (
    (entregas.data ?? []) as Array<{
      id: string;
      bag_count: number | string | null;
      contrato: { code: string } | { code: string }[] | null;
      produtor: { full_name: string | null } | { full_name: string | null }[] | null;
    }>
  ).map((r) => ({
    id: r.id,
    contrato_code: pickOne(r.contrato)?.code ?? "—",
    produtor_nome: pickOne(r.produtor)?.full_name ?? "—",
    bag_count: r.bag_count != null ? Number(r.bag_count) : null,
  }));

  return { responderProdutor, assinarContrato, cobrarPagamento, conferirEntrega };
}
