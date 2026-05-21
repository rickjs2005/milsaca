import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Defaults = {
  name?: string;
  priority?: number;
  action?: "match" | "skip" | "fallback_support";
  conditions?: object;
  notes?: string | null;
  active?: boolean;
};

/**
 * Form fields compartilhado entre criar e editar regra. Inclui:
 *   - name, priority (1-9999, menor avalia antes)
 *   - action (match/skip/fallback_support) com explicação inline
 *   - conditions em JSON puro (textarea com exemplo) — fase 2 vira UI guiada
 *   - notes opcional
 *   - active toggle
 */
export function RuleFormFields({ defaults }: { defaults?: Defaults }) {
  const d = defaults ?? {};
  const conditionsJSON = d.conditions
    ? JSON.stringify(d.conditions, null, 2)
    : "";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={d.name ?? ""}
            placeholder="Ex.: Bloquear corretora vencida"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade *</Label>
          <Input
            id="priority"
            name="priority"
            type="number"
            min={1}
            max={9999}
            required
            defaultValue={d.priority ?? 100}
          />
          <p className="text-[10px] text-slate-500">
            Menor avalia antes. 10 = topo · 100 = padrão · 999 = fallback final.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="action">Ação *</Label>
        <select
          id="action"
          name="action"
          defaultValue={d.action ?? "match"}
          required
          className="flex h-9 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
        >
          <option value="match">match — corretora elegível recebe</option>
          <option value="skip">skip — corretora ignorada</option>
          <option value="fallback_support">
            fallback_support — manda pro suporte / lista de espera
          </option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conditions">Conditions (JSON)</Label>
        <textarea
          id="conditions"
          name="conditions"
          rows={6}
          defaultValue={conditionsJSON}
          placeholder='{ "require_region_match": true, "require_specie_match": true }'
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-milsaca-dourado focus:outline-none focus:ring-2 focus:ring-milsaca-dourado/30"
        />
        <p className="text-[10px] text-slate-500">
          Objeto JSON com condições. Exemplos:
          <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
            corretora_status_in
          </code>
          ,{" "}
          <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
            require_region_match
          </code>
          ,{" "}
          <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
            min_sacas
          </code>
          ,{" "}
          <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
            plan_required
          </code>
          . Aplicação real fica em edge function (Fase 2).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={d.notes ?? ""}
          placeholder="Contexto / motivo / link pra Linear..."
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
        Regra ativa
      </label>
    </div>
  );
}
