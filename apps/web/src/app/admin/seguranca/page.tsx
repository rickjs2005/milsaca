import { Shield } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { TotpSetup } from "./_components/totp-setup";
import { TotpDisable } from "./_components/totp-disable";

export const metadata = { title: "Segurança · Admin Milsaca" };

export default async function AdminSegurancaPage() {
  await requireAppAdmin();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();

  const verified = (data?.totp ?? []).find((f) => f.status === "verified");
  const unverified = (data?.totp ?? []).find((f) => f.status === "unverified");

  return (
    <>
      <PageHeader
        eyebrow="Configuração"
        title="Segurança"
        description="Autenticação de dois fatores (2FA) e configurações da sua conta admin."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Segurança" },
        ]}
      />

      <section className="mb-6 rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-cafezal ring-1 ring-inset ring-milsaca-dourado/40">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-milsaca-preto">
              Autenticador (TOTP)
            </h2>
            <p className="text-xs text-slate-500">
              Códigos de 6 dígitos gerados a cada 30s pelo app do celular.
            </p>
          </div>
        </header>

        {verified ? (
          <TotpDisable
            factorId={verified.id}
            friendlyName={verified.friendly_name ?? null}
          />
        ) : unverified ? (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Setup incompleto</p>
              <p className="mt-0.5 text-xs">
                Você começou a configurar um autenticador mas não terminou.
                Conclua ou cancele abaixo.
              </p>
            </div>
            <TotpSetup />
          </div>
        ) : (
          <TotpSetup />
        )}
      </section>

      <section className="mb-6 rounded-card border border-slate-200 bg-milsaca-cream-claro/30 p-6">
        <h2 className="text-base font-semibold text-milsaca-preto">
          Por que ativar
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-milsaca-cafezal">✓</span>
            <span>
              Senha sozinha vaza em incidentes externos (phishing, reuso de
              senha em outros sites).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-milsaca-cafezal">✓</span>
            <span>
              Admin é alvo natural — uma conta comprometida pode mudar planos,
              aprovar corretoras fake, ler dados sensíveis.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-milsaca-cafezal">✓</span>
            <span>TOTP funciona offline depois do setup.</span>
          </li>
        </ul>
      </section>

      <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-base font-semibold text-milsaca-preto">
          Pré-requisito no projeto Supabase
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pra TOTP funcionar, o projeto Supabase precisa ter{" "}
          <strong>MFA habilitado</strong> em{" "}
          <em>Authentication → Multi-Factor Authentication</em>. Se ao clicar
          &quot;Ativar autenticador&quot; aparecer um erro mencionando &quot;MFA
          disabled&quot;, ative no dashboard primeiro.
        </p>
      </section>
    </>
  );
}
