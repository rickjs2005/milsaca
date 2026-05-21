import { FileSignature, FileWarning, Receipt, CheckCircle2 } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Fiscal · Admin Milsaca" };

/**
 * Placeholder honesto pro módulo Fiscal. NFP-e (Nota Fiscal de
 * Produtor eletrônica) é o documento emitido pelo produtor pra
 * cooperativa/corretora. Hoje não tem provider plugado nem
 * configuração de CFOP/CST/CSOSN. Esta tela mostra:
 *   - Quantos contratos foram fechados (potenciais NFP-es)
 *   - Status zerado (sem emissão)
 *   - Roadmap de implementação
 */
export default async function FiscalAdminPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [
    { count: contratosTotal },
    { count: contratosAtivos },
    { data: corretorasComCnpj },
  ] = await Promise.all([
    supabase.from("contratos").select("*", { count: "exact", head: true }),
    supabase
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo"),
    supabase
      .from("corretoras")
      .select("id")
      .not("cnpj", "is", null)
      .limit(500),
  ]);

  const corretorasFiscalReady = (corretorasComCnpj ?? []).length;

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Fiscal"
        description="Emissão de NFP-e e gestão fiscal por corretora. Hoje funciona como auditoria — quando o provider de emissão (FocusNFe, NFe.io, eNotas) for plugado, esta tela cataloga emissões, status SEFAZ e divergências."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Fiscal" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Contratos totais"
          value={contratosTotal ?? 0}
          icon={FileSignature}
          hint="Potenciais NFP-es por gerar."
        />
        <KpiCard
          label="Contratos ativos"
          value={contratosAtivos ?? 0}
          icon={CheckCircle2}
          tone="success"
          hint="Em execução — precisam de NF na entrega."
        />
        <KpiCard
          label="Corretoras com CNPJ"
          value={corretorasFiscalReady}
          icon={Receipt}
          hint="Aptas a emitir documentos fiscais."
        />
        <KpiCard
          label="NFP-es emitidas"
          value={0}
          tone="warning"
          hint="Provider não configurado."
        />
      </div>

      <section className="mb-8 rounded-card border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <FileWarning
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden
          />
          <div>
            <h2 className="text-base font-semibold text-amber-900">
              Provider fiscal não plugado
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Sem provider, contratos avançam (ativo → finalizado) mas
              nenhuma NFP-e é emitida automaticamente. Corretoras emitem
              manualmente no portal da SEFAZ. Ideal: plugar FocusNFe, NFe.io
              ou eNotas pra automatizar — Milsaca recebe XML+PDF, arquiva no
              Storage, expõe download.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-semibold text-milsaca-preto">
          Próximos passos (Fase 6+)
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              1
            </span>
            <div>
              <p className="font-medium">
                Tabela <code>nfe_emissions</code> e <code>fiscal_provider_configs</code>
              </p>
              <p className="text-xs text-slate-500">
                Liga contrato/entrega → emissão. Status (pendente/processando/
                autorizada/rejeitada/cancelada) + XML + chave de acesso 44 dígitos.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              2
            </span>
            <div>
              <p className="font-medium">
                Catálogo de CFOP/CST/CSOSN por operação
              </p>
              <p className="text-xs text-slate-500">
                Compra de café cru pra revenda, venda pra exportador, transferência,
                etc. Cada operação tem código fiscal específico.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              3
            </span>
            <div>
              <p className="font-medium">
                Edge function <code>emit-nfe</code>
              </p>
              <p className="text-xs text-slate-500">
                Recebe contrato_id ou entrega_id, monta payload, chama provider,
                grava XML/chave/PDF no Storage, atualiza nfe_emissions.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              4
            </span>
            <div>
              <p className="font-medium">
                Reconciliação automática SEFAZ ↔ contrato
              </p>
              <p className="text-xs text-slate-500">
                Cron diário lê manifesto de notas SEFAZ (NFs entradas) e cruza
                com contratos esperados. Alerta de divergência.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="rounded-card border border-slate-200 bg-white shadow-card">
        <EmptyState
          icon={Receipt}
          title="Sem emissões fiscais ainda"
          description="Quando o provider for plugado, esta seção vira a tabela de emissões com chave de acesso, status SEFAZ, downloads de XML/PDF e link pra contrato/entrega de origem."
          secondaryCta={{
            label: "Ver contratos",
            href: "/admin/auditoria?entity=contratos",
          }}
        />
      </section>

      <p className="mt-6 text-center text-xs text-slate-400">
        Status atual:{" "}
        <StatusBadge tone="warning" withDot>
          Provider não configurado
        </StatusBadge>
      </p>
    </>
  );
}
