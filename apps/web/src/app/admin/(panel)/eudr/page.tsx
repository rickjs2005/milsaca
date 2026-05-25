import { Leaf, FileWarning, MapPin, Calendar } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "EUDR · Admin Milsaca" };

/**
 * Placeholder honesto pro módulo EUDR. UE 2023/1115 entra em vigor
 * 30/12/2026 pra grandes — exige polígono + DDS TRACES. Hoje não temos
 * provider integrado nem campos CAR/polígono em produtores. Esta tela:
 *   - Conta produtores totais (proxy de quantos seriam afetados)
 *   - Marca tudo como "Pendente de dados" (campo ainda não existe)
 *   - Lista próximos passos pra Fase 5+
 */
export default async function EudrAdminPage() {
  await requireAppAdmin();
  const supabase = await createClient();

  const [{ count: produtoresTotal }, { count: contratosTotal }] =
    await Promise.all([
      supabase.from("produtores").select("*", { count: "exact", head: true }),
      supabase.from("contratos").select("*", { count: "exact", head: true }),
    ]);

  // Sem campo car_code/polygon ainda. Esses números são placeholder honesto.
  const comCar = 0;
  const comPoligono = 0;
  const semDados = produtoresTotal ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="EUDR — UE 2023/1115"
        description="Regulamento europeu de desmatamento. Entra em vigor 30/12/2026 pra grandes produtores/operadores. Exige polígono georreferenciado + DDS no TRACES por lote exportado. Esta tela vira observabilidade real quando os campos CAR/polígono forem adicionados em produtores."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "EUDR" },
        ]}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Produtores afetados"
          value={semDados}
          icon={Leaf}
          hint="Todos os cadastrados são potencialmente afetados."
        />
        <KpiCard
          label="Com CAR registrado"
          value={comCar}
          tone={comCar === 0 ? "warning" : "success"}
          hint="Campo ainda não existe no banco."
        />
        <KpiCard
          label="Com polígono GeoJSON"
          value={comPoligono}
          tone={comPoligono === 0 ? "warning" : "success"}
          hint="Precisa de PostGIS habilitado."
        />
        <KpiCard
          label="Contratos exportáveis"
          value={contratosTotal ?? 0}
          icon={Calendar}
          hint="Qualquer contrato pode virar exportação."
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
              Dados EUDR incompletos
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Hoje o schema de <code>produtores</code> não tem CAR nem polígono.
              Sem isso, o Milsaca não consegue gerar DDS automaticamente. Isso
              precisa ser endereçado antes de 30/12/2026 (deadline grandes) ou
              30/06/2027 (PMEs).
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
                Adicionar <code>car_code</code> e <code>polygon</code> em produtores
              </p>
              <p className="text-xs text-slate-500">
                Migration nova. PostGIS habilitado pra coluna geometry. Validação
                de área mínima/máxima pelo CAR.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              2
            </span>
            <div>
              <p className="font-medium">
                Integração com CAR (SICAR) pra puxar polígono via CPF/CNPJ
              </p>
              <p className="text-xs text-slate-500">
                Edge function que consulta sicar.gov.br e popula o polygon
                automaticamente quando o produtor entra o CAR.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              3
            </span>
            <div>
              <p className="font-medium">
                Cross-check polígono × MapBiomas (desmatamento pós-2020)
              </p>
              <p className="text-xs text-slate-500">
                Cron mensal compara polígonos cadastrados com dataset MapBiomas
                pra flag visual + bloqueio de contrato exportável.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-[10px] font-semibold text-milsaca-cafezal">
              4
            </span>
            <div>
              <p className="font-medium">
                Geração de DDS XML pra TRACES (Comissão Europeia)
              </p>
              <p className="text-xs text-slate-500">
                Schema EU 2023/1115. Botão &quot;Gerar DDS&quot; no contrato → XML pronto
                pra upload no TRACES. Auditoria local da emissão.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="rounded-card border border-slate-200 bg-white shadow-card">
        <EmptyState
          icon={MapPin}
          title="Sem produtores com polígono cadastrado"
          description="Quando os campos CAR e polygon forem adicionados em produtores, esta seção vira a tabela de status EUDR — quem está pronto, quem falta CAR, quem tem alerta de desmatamento."
          secondaryCta={{
            label: "Ver produtores",
            href: "/admin/produtores",
          }}
        />
      </section>

      <p className="mt-6 text-center text-xs text-slate-400">
        Status atual da regulação:{" "}
        <StatusBadge tone="warning" withDot>
          Implementação pendente
        </StatusBadge>
      </p>
    </>
  );
}
