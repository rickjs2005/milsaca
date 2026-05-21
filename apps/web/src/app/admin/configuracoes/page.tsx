import { requireAppAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "./_actions";
import {
  listSettings,
  SETTING_LABELS,
  SETTING_SECTIONS,
  SETTING_TYPES,
} from "./_lib/settings";

export const metadata = { title: "Configurações · Admin Milsaca" };

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function asBoolean(v: unknown): boolean {
  return v === true || v === "true";
}

function asNumber(v: unknown): number | "" {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

export default async function ConfiguracoesPage() {
  await requireAppAdmin();
  const rows = await listSettings();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return (
    <>
      <PageHeader
        eyebrow="Configuração"
        title="Configurações da plataforma"
        description="Controla o comportamento global do Milsaca — cadastro público, trial, suporte oficial, providers e distribuição de leads. Aplicado em tempo real após salvar."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Configurações" },
        ]}
      />

      <form action={updateSettings} className="space-y-6">
        {SETTING_SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-card border border-slate-200 bg-white p-6 shadow-card"
          >
            <header className="mb-5">
              <h2 className="text-base font-semibold text-milsaca-preto">
                {section.title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {section.description}
              </p>
            </header>

            <div className="space-y-4">
              {section.keys.map((key) => {
                const type = SETTING_TYPES[key];
                const current = byKey.get(key);
                const label = SETTING_LABELS[key];

                if (type.kind === "boolean") {
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 transition-colors hover:bg-milsaca-cream/40"
                    >
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={asBoolean(current)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-milsaca-cafezal"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  );
                }

                if (type.kind === "select") {
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <select
                        id={key}
                        name={key}
                        defaultValue={asString(current)}
                        className="flex h-9 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
                      >
                        {type.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (type.kind === "number") {
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={key}
                          name={key}
                          type="number"
                          inputMode="numeric"
                          min={type.min}
                          max={type.max}
                          defaultValue={asNumber(current)}
                          className="w-32"
                        />
                        {type.suffix ? (
                          <span className="text-xs text-slate-500">
                            {type.suffix}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      name={key}
                      defaultValue={asString(current)}
                      placeholder={type.placeholder}
                      className="max-w-md"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex justify-end">
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Salvando..."
          >
            Salvar configurações
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
