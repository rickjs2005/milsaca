import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Defaults = {
  name?: string;
  slug?: string;
  species?: string;
  process?: string | null;
  default_unit?: string;
  active?: boolean;
  notes?: string | null;
};

export function TypeFormFields({ defaults }: { defaults?: Defaults }) {
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
            placeholder="Ex: Arábica Bebida Dura"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="species">Espécie *</Label>
          <select
            id="species"
            name="species"
            required
            defaultValue={d.species ?? "arabica"}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="arabica">Arábica</option>
            <option value="conilon">Conilon</option>
            <option value="robusta">Robusta</option>
            <option value="cacau">Cacau</option>
            <option value="pimenta">Pimenta</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="process">Processo</Label>
          <select
            id="process"
            name="process"
            defaultValue={d.process ?? ""}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
          >
            <option value="">— (sem processo)</option>
            <option value="natural">Natural</option>
            <option value="cereja_descascado">Cereja descascado</option>
            <option value="cd_desmucilado">CD desmucilado</option>
            <option value="despolpado">Despolpado</option>
            <option value="fermentacao_induzida">Fermentação induzida</option>
            <option value="lavado">Lavado</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="default_unit">Unidade padrão *</Label>
        <select
          id="default_unit"
          name="default_unit"
          required
          defaultValue={d.default_unit ?? "saca_60kg"}
          className="flex h-10 w-full max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
        >
          <option value="saca_60kg">Saca 60kg</option>
          <option value="kg">Quilograma (kg)</option>
          <option value="arroba">Arroba</option>
          <option value="libra">Libra (lb)</option>
          <option value="tonelada">Tonelada</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={d.notes ?? ""}
          placeholder="Padrão CEPEA, observação técnica, etc."
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
        Ativo (aparece em listas e filtros)
      </label>
    </div>
  );
}
