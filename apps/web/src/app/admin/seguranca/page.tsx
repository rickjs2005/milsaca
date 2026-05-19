import { Shield } from "lucide-react";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
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
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Segurança
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Autenticação de dois fatores (2FA) e configurações da sua conta admin.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-dourado/15 text-milsaca-dourado">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Por que ativar
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li>
            ✓ Senha sozinha vaza em incidentes externos (phishing, reuso de
            senha em outros sites)
          </li>
          <li>
            ✓ Admin é alvo natural — uma conta comprometida pode mudar planos,
            aprovar corretoras fake, ler dados sensíveis
          </li>
          <li>
            ✓ TOTP funciona offline depois do setup
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Pré-requisito no projeto Supabase
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pra TOTP funcionar, o projeto Supabase precisa ter <strong>MFA habilitado</strong>
          em <em>Authentication → Multi-Factor Authentication</em>.
          Se ao clicar &quot;Ativar autenticador&quot; aparecer um erro
          mencionando &quot;MFA disabled&quot;, ative no dashboard primeiro.
        </p>
      </section>
    </div>
  );
}
