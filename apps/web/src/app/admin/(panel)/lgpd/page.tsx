import { CheckCircle2, ShieldAlert, Info, AlertTriangle } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AnonimizarForm } from "./_components/anonimizar-form";

export const metadata = { title: "LGPD · Admin Milsaca" };

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string; warn?: string }>;
}

export default async function AdminLgpdPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const sp = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Configuração"
        title="LGPD"
        description="Atendimento a direitos de titular — anonimização de dados pessoais (LGPD art. 18)."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "LGPD" }]}
      />

      {sp.ok ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {sp.ok}
        </div>
      ) : null}
      {sp.warn ? (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {sp.warn}
        </div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 rounded-md border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {sp.error}
        </div>
      ) : null}

      <section className="mb-6 rounded-card border border-neutral-200 bg-white p-6 shadow-card">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-700 ring-1 ring-inset ring-danger-100">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-milsaca-preto">
              Anonimizar titular
            </h2>
            <p className="text-xs text-neutral-500">
              Ação destrutiva e irreversível. Use apenas em resposta a um
              pedido formal de exclusão do titular.
            </p>
          </div>
        </header>

        <div className="mb-5 space-y-3 rounded-md border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
          <p className="font-medium">O que a anonimização faz:</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5">•</span>
              <span>Mascara o nome do titular.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5">•</span>
              <span>Apaga CPF/CNPJ e telefone.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5">•</span>
              <span>
                Faz soft-delete do perfil (define <code>deleted_at</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-0.5">•</span>
              <span>
                Neutraliza o e-mail de login em <code>auth.users</code> (troca
                por um placeholder não-roteável) e bane a conta, impedindo
                re-login.
              </span>
            </li>
          </ul>
          <p className="flex items-start gap-2 border-t border-warning-100 pt-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              A neutralização do e-mail em <code>auth.users</code> depende da{" "}
              <code>SUPABASE_SECRET_KEY</code> estar configurada no ambiente. Se
              não estiver, o mascaramento dos demais dados ocorre normalmente e
              você verá um aviso para concluir essa etapa.
            </span>
          </p>
        </div>

        <AnonimizarForm />
      </section>
    </>
  );
}
