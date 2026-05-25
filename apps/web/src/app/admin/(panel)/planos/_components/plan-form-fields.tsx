import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanDefaults = {
  name?: string;
  slug?: string;
  description?: string | null;
  price_cents?: number;
  billing_period?: "monthly" | "yearly";
  features?: string[];
  active?: boolean;
};

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function PlanFormFields({ defaults }: { defaults?: PlanDefaults }) {
  const period = defaults?.billing_period ?? "monthly";
  const features = (defaults?.features ?? []).join("\n");
  const price = defaults?.price_cents != null
    ? centsToReais(defaults.price_cents)
    : "";

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome do plano *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaults?.name ?? ""}
            required
            placeholder="Plano Profissional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={defaults?.slug ?? ""}
            placeholder="profissional"
          />
          <p className="text-xs text-slate-500">Identificador curto. Deixe vazio pra gerar do nome.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input
            id="price"
            name="price"
            defaultValue={price}
            required
            placeholder="299,00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="billing_period">Período *</Label>
          <select
            id="billing_period"
            name="billing_period"
            defaultValue={period}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          >
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="active">Ativo</Label>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked={defaults?.active ?? true}
            />
            <span className="text-slate-600">Disponível para venda</span>
          </label>
        </div>
      </section>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição curta</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaults?.description ?? ""}
          rows={2}
          placeholder="Ideal para corretoras já estabelecidas..."
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="features">Features (uma por linha)</Label>
        <textarea
          id="features"
          name="features"
          defaultValue={features}
          rows={6}
          placeholder={"Até 50 contratos/mês\nWhatsApp Business integrado\nAnalytics avançado"}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>
    </div>
  );
}
