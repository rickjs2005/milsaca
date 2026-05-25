import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppAdmin } from "@/lib/auth";
import { createClient } from "@milsaca/db/web/server";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { updateRule } from "../_actions";
import { RuleFormFields } from "../_components/rule-form-fields";

export const metadata = { title: "Editar regra · Admin Milsaca" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRegraPage({ params }: PageProps) {
  await requireAppAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_distribution_rules")
    .select("id, name, priority, action, conditions, notes, active")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Prioridade ${data.priority}`}
        title={data.name}
        description="Edite a regra. Mudanças refletem na próxima avaliação de lead."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Regras de leads", href: "/admin/regras-leads" },
          { label: data.name },
        ]}
        actions={
          data.active ? (
            <StatusBadge status="ativo" />
          ) : (
            <StatusBadge status="inativo" />
          )
        }
      />

      <form
        action={updateRule}
        className="space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-card"
      >
        <input type="hidden" name="id" value={data.id} />
        <RuleFormFields
          defaults={{
            name: data.name,
            priority: data.priority,
            action: data.action as "match" | "skip" | "fallback_support",
            conditions: (data.conditions ?? {}) as object,
            notes: data.notes,
            active: data.active,
          }}
        />
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button asChild variant="outline">
            <Link href="/admin/regras-leads">Voltar</Link>
          </Button>
          <SubmitButton
            className="gap-2 bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-folha"
            pendingLabel="Salvando..."
          >
            Salvar alterações
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
