import { notFound, redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getProfile } from "@/lib/auth";
import { getContrato, CONTRATO_STATUS_LABEL } from "../../_lib/queries";
import { PrintButton } from "./_print-button";

export const metadata = { title: "Espelho de contrato — Milsaca" };

type Params = Promise<{ id: string }>;

function formatBRL(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function EspelhoContratoPage({
  params,
}: {
  params: Params;
}) {
  const profile = await getProfile();
  if (!profile?.corretora_id) {
    redirect("/painel/escolher?error=Sem%20corretora%20vinculada");
  }
  const { id } = await params;
  const contrato = await getContrato(profile.corretora_id, id);
  if (!contrato) notFound();

  const supabase = await createClient();
  const { data: corretora } = await supabase
    .from("corretoras")
    .select("name, slug, city, phone, verified")
    .eq("id", profile.corretora_id)
    .maybeSingle();

  const valorPorSaca =
    contrato.total_value != null && contrato.bag_count
      ? contrato.total_value / contrato.bag_count
      : null;

  return (
    <main className="min-h-screen bg-white text-milsaca-verde print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Barra de ações — escondida no print */}
        <div className="no-print mb-8 flex items-center justify-between rounded-2xl border border-milsaca-verde/10 bg-milsaca-cream-escuro/30 px-4 py-3 text-sm">
          <a
            href={`/painel/corretora/contratos/${contrato.id}`}
            className="text-milsaca-dourado hover:underline"
          >
            ← Voltar pro contrato
          </a>
          <PrintButton />
        </div>

        {/* Cabeçalho */}
        <header className="border-b-2 border-milsaca-verde pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-milsaca-verde-claro">
                Espelho de corretagem
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {contrato.code}
              </h1>
              <p className="mt-1 text-sm text-milsaca-verde-claro">
                {CONTRATO_STATUS_LABEL[contrato.status]} ·{" "}
                {contrato.signed_at
                  ? `Assinado em ${formatDate(contrato.signed_at)}`
                  : `Criado em ${formatDate(contrato.created_at)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-milsaca-verde">
                {corretora?.name ?? "Corretora"}
              </p>
              {corretora?.city ? (
                <p className="text-xs text-milsaca-verde-claro">
                  {corretora.city}
                </p>
              ) : null}
              {corretora?.phone ? (
                <p className="text-xs text-milsaca-verde-claro">
                  {corretora.phone}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        {/* Partes — triangular: vendedor / corretora / comprador */}
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
              Vendedor (produtor)
            </p>
            <p className="mt-2 text-lg font-medium">{contrato.produtor_nome}</p>
            {contrato.produtor_phone ? (
              <p className="text-sm text-milsaca-verde-claro">
                {contrato.produtor_phone}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
              Corretora intermediária
            </p>
            <p className="mt-2 text-lg font-medium">
              {corretora?.name ?? "—"}
            </p>
            {corretora?.slug ? (
              <p className="font-mono text-xs text-milsaca-verde-claro">
                {corretora.slug}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
              Comprador
            </p>
            <p className="mt-2 text-lg font-medium">
              {contrato.comprador_nome ?? "— a definir —"}
            </p>
            {contrato.comprador_cnpj ? (
              <p className="font-mono text-xs text-milsaca-verde-claro">
                CNPJ {contrato.comprador_cnpj}
              </p>
            ) : null}
            {contrato.comprador_city ? (
              <p className="text-xs text-milsaca-verde-claro">
                {contrato.comprador_city}
                {contrato.comprador_state ? `/${contrato.comprador_state}` : ""}
              </p>
            ) : null}
          </div>
        </section>

        {/* Negócio */}
        <section className="mt-8 rounded-2xl border border-milsaca-verde/15 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-milsaca-verde-claro">
            Objeto do contrato
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Tipo de café">{contrato.coffee_type ?? "—"}</Field>
            <Field label="Sacas (60kg)">
              {contrato.bag_count?.toLocaleString("pt-BR") ?? "—"}
            </Field>
            <Field label="Valor por saca">{formatBRL(valorPorSaca)}</Field>
            <Field label="Valor total">{formatBRL(contrato.total_value)}</Field>
          </dl>
        </section>

        {/* Comissão */}
        {contrato.comissao_pct != null ? (
          <section className="mt-4 rounded-2xl border border-milsaca-dourado/40 bg-milsaca-dourado/10 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-milsaca-verde-claro">
              Corretagem
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
              <Field label="Alíquota">
                {contrato.comissao_pct.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                })}
                %
              </Field>
              <Field label="Comissão devida à corretora">
                {formatBRL(contrato.comissao_total)}
              </Field>
            </dl>
          </section>
        ) : null}

        {/* Assinatura — 3 partes */}
        <section className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="border-b border-milsaca-verde/40 pb-1" />
            <p className="mt-2 text-xs text-milsaca-verde-claro">
              {contrato.produtor_nome}
            </p>
            <p className="text-xs text-milsaca-verde-claro">Vendedor</p>
          </div>
          <div>
            <div className="border-b border-milsaca-verde/40 pb-1" />
            <p className="mt-2 text-xs text-milsaca-verde-claro">
              {corretora?.name ?? "Corretora"}
            </p>
            <p className="text-xs text-milsaca-verde-claro">
              Corretora intermediária
            </p>
          </div>
          <div>
            <div className="border-b border-milsaca-verde/40 pb-1" />
            <p className="mt-2 text-xs text-milsaca-verde-claro">
              {contrato.comprador_nome ?? "Comprador"}
            </p>
            <p className="text-xs text-milsaca-verde-claro">Comprador</p>
          </div>
        </section>

        <footer className="mt-16 border-t border-milsaca-verde/10 pt-4 text-center text-[10px] uppercase tracking-widest text-milsaca-verde-claro">
          Espelho gerado pelo Milsaca · {new Date().toLocaleDateString("pt-BR")}
        </footer>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-milsaca-verde-claro">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

