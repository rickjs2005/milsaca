"use client";

import { useState } from "react";

import { Input, inputBaseClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; state?: string };

type Defaults = {
  product_id?: string;
  region_id?: string | null;
  target_price?: number | string;
  target_pct?: number | string;
  condition?: "acima_de" | "abaixo_de" | "melhor_preco" | "acima_media";
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
      ? d.target_price.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : (d.target_price ?? "");
  const pctDefault =
    typeof d.target_pct === "number"
      ? String(d.target_pct).replace(".", ",")
      : (d.target_pct ?? "");

  const [condition, setCondition] = useState<string>(d.condition ?? "acima_de");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="product_id">Tipo de café *</Label>
        <Select
          id="product_id"
          name="product_id"
          required
          defaultValue={d.product_id ?? ""}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region_id">Praça (opcional)</Label>
        <Select id="region_id" name="region_id" defaultValue={d.region_id ?? ""}>
          <option value="">— Qualquer praça</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.state ? `/${r.state}` : ""}
            </option>
          ))}
        </Select>
        <p className="text-caption text-neutral-500">
          Se vazio, dispara assim que qualquer praça bater o preço alvo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="condition">Condição *</Label>
          <Select
            id="condition"
            name="condition"
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="acima_de">Subir acima de</option>
            <option value="abaixo_de">Cair abaixo de</option>
            <option value="melhor_preco">Melhor preço da praça</option>
            <option value="acima_media">% acima da média</option>
          </Select>
        </div>
        {(condition === "acima_de" || condition === "abaixo_de") && (
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
        )}
        {condition === "acima_media" && (
          <div className="space-y-2">
            <Label htmlFor="target_pct">% acima da média *</Label>
            <Input
              id="target_pct"
              name="target_pct"
              type="text"
              inputMode="decimal"
              required
              defaultValue={pctDefault}
              placeholder="5"
            />
            <p className="text-caption text-neutral-500">
              Avisa quando alguma corretora pagar essa % acima da média da
              praça.
            </p>
          </div>
        )}
        {condition === "melhor_preco" && (
          <div className="space-y-2">
            <p className="text-caption text-neutral-500">
              Avisamos quando aparecer o melhor preço da praça (1× por dia).
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Como avisar *</Label>
        <Select
          id="channel"
          name="channel"
          required
          defaultValue={d.channel ?? "app"}
        >
          <option value="app">No app (notificação interna)</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </Select>
        <p className="text-caption text-neutral-500">
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
          className={cn(inputBaseClassName, "h-auto")}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-body-sm text-milsaca-cafezal">
        <input
          type="checkbox"
          name="active"
          defaultChecked={d.active ?? true}
          className="h-4 w-4 cursor-pointer accent-milsaca-cafezal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
        Alvo ativo (dispara notificações)
      </label>
    </div>
  );
}
