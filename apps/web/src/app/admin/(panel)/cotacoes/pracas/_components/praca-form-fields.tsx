import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UfSelect } from "@/components/forms/uf-select";

type Defaults = {
  name?: string;
  slug?: string;
  city?: string | null;
  state?: string;
  region_group?: string | null;
  active?: boolean;
  notes?: string | null;
};

export function PracaFormFields({ defaults }: { defaults?: Defaults }) {
  const d = defaults ?? {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={d.name ?? ""}
            placeholder="Ex: Manhuaçu"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={d.slug ?? ""}
            placeholder="(auto se vazio)"
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            defaultValue={d.city ?? ""}
            placeholder="Manhuaçu"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">UF *</Label>
          <UfSelect
            id="state"
            name="state"
            required
            defaultValue={d.state ?? "MG"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="region_group">Grupo regional</Label>
        <Input
          id="region_group"
          name="region_group"
          defaultValue={d.region_group ?? ""}
          placeholder="Matas de Minas, Cerrado Mineiro, Sul de Minas..."
        />
        <p className="text-[10px] text-slate-500">
          Agrupa praças vizinhas pra filtros e relatórios.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={d.notes ?? ""}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={d.active ?? true}
          className="h-4 w-4 cursor-pointer accent-milsaca-cafezal"
        />
        Ativa (aparece em formulários e filtros)
      </label>
    </div>
  );
}
