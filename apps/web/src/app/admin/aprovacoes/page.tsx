import Link from "next/link";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aprovarCorretora, rejeitarCorretora } from "../_actions";

export const metadata = { title: "Aprovações · Admin Milsaca" };

type PendingSignup = {
  profile_id: string;
  email: string | null;
  full_name: string | null;
  signup_at: string;
  corretora_name: string | null;
  corretora_cnpj: string | null;
  corretora_city: string | null;
};

interface PageProps {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

function fmtCnpj(d: string | null): string {
  if (!d) return "";
  const s = d.replace(/\D/g, "");
  if (s.length !== 14) return d;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function AdminAprovacoesPage({ searchParams }: PageProps) {
  await requireAppAdmin();
  const { ok, error } = await searchParams;

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc(
    "list_pending_corretora_signups",
  );
  const rows: PendingSignup[] = (data ?? []) as PendingSignup[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-xs text-milsaca-dourado hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-milsaca-verde">
            Aprovações de corretora
          </h1>
          <p className="mt-1 text-sm text-milsaca-verde-claro">
            {rows.length} aguardando análise.
          </p>
        </div>
      </div>

      {ok ? (
        <p className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {rpcError ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao listar pendentes: {rpcError.message}
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-milsaca-verde/10 bg-white p-10 text-center text-sm text-milsaca-verde-claro">
            Nenhuma corretora aguardando aprovação.
          </div>
        ) : null}

        {rows.map((row) => (
          <article
            key={row.profile_id}
            className="rounded-2xl border border-milsaca-verde/10 bg-white p-6 shadow-sm"
          >
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-milsaca-cream-escuro pb-4">
              <div>
                <h2 className="text-lg font-semibold text-milsaca-verde">
                  {row.corretora_name ?? "Corretora sem nome"}
                </h2>
                <p className="mt-0.5 text-xs text-milsaca-verde-claro">
                  Solicitado por{" "}
                  <span className="font-medium">
                    {row.full_name ?? "—"}
                  </span>{" "}
                  · {row.email ?? "sem email"} · {fmtDate(row.signup_at)}
                </p>
              </div>
            </header>

            <form action={aprovarCorretora} className="mt-4 space-y-4">
              <input type="hidden" name="profile_id" value={row.profile_id} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Nome da corretora"
                  name="name"
                  defaultValue={row.corretora_name ?? ""}
                  required
                />
                <Field
                  label="CNPJ"
                  name="cnpj"
                  defaultValue={fmtCnpj(row.corretora_cnpj)}
                  required
                />
                <Field
                  label="Cidade"
                  name="city"
                  defaultValue={row.corretora_city ?? ""}
                  required
                />
                <Field
                  label="UF"
                  name="state"
                  maxLength={2}
                  placeholder="MG"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  formAction={rejeitarCorretora}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  Rejeitar
                </Button>
                <Button
                  type="submit"
                  className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
                >
                  Aprovar e criar corretora
                </Button>
              </div>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </div>
  );
}
