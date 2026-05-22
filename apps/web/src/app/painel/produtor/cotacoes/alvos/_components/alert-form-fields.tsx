import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string; state?: string };

type Defaults = {
  product_id?: string;
  region_id?: string | null;
  target_price?: number | string;
  condition?: "acima_de" | "abaixo_de";
  channel?: "app" | "whatsapp" | "email";
  active?: boolean;
  notes?: string | null;
};

export function AlertFormFields({
  defaults,
  products,
  regions,
}: {
  defaults?: Defaults;
  products: Option[];
  regions: Option[];
}) {
  const d = defaults ?? {};
  const priceDefault =
    typeof d.target_price === "number"
      ? String(d.target_price).replace(".", ",")
      : (d.target_price ?? "");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="product_id">Tipo de café *</Label>
        <select
          id="product_id"
          name="product_id"
          required
          defaultValue={d.product_id ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region_id">Praça (opcional)</Label>
        <select
          id="region_id"
          name="region_id"
          defaultValue={d.region_id ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— Qualquer praça</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.state ? `/${r.state}` : ""}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-milsaca-verde-claro/70">
          Se vazio, dispara assim que qualquer praça bater o preço alvo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="condition">Condição *</Label>
          <select
            id="condition"
            name="condition"
            required
            defaultValue={d.condition ?? "acima_de"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="acima_de">Subir acima de</option>
            <option value="abaixo_de">Cair abaixo de</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_price">Preço alvo (R$/saca) *</Label>
          <Input
            id="target_price"
            name="target_price"
            type="text"
            inputMode="decimal"
            required
            defaultValue={priceDefault}
            placeholder="2.000,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Como avisar *</Label>
        <select
          id="channel"
          name="channel"
          required
          defaultValue={d.channel ?? "app"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="app">No app (notificação interna)</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </select>
        <p className="text-[10px] text-milsaca-verde-claro/70">
          Notificação no app sempre é criada. WhatsApp/E-mail precisam do
          provider configurado pelo time Milsaca pra chegar — caso contrário
          fica em fila.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observação</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={d.notes ?? ""}
          placeholder="Lembrete pessoal..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-milsaca-verde">
        <input
          type="checkbox"
          name="active"
          defaultChecked={d.active ?? true}
          className="h-4 w-4 cursor-pointer accent-milsaca-verde"
        />
        Alvo ativo (dispara notificações)
      </label>
    </div>
  );
}
