import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { REGIME_LABEL, type CompradorDetail } from "./_lib/queries";

type Props = {
  defaults?: Partial<CompradorDetail>;
};

export function CompradorFormFields({ defaults = {} }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Razão social / nome *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaults.name ?? ""}
            placeholder="Ex: Café Express Trading S.A."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade_name">Nome fantasia</Label>
          <Input
            id="trade_name"
            name="trade_name"
            defaultValue={defaults.trade_name ?? ""}
            placeholder="Ex: Café Express"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={defaults.tipo ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            <option value="industria">Indústria</option>
            <option value="exportador">Exportador</option>
            <option value="trading">Trading</option>
            <option value="torrefador">Torrefador</option>
            <option value="cooperativa">Cooperativa</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <MaskedInput
            id="cnpj"
            type="cnpj"
            name="cnpj"
            defaultValue={defaults.cnpj ?? ""}
            validateOnBlur
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
          <Input
            id="inscricao_estadual"
            name="inscricao_estadual"
            defaultValue={defaults.inscricao_estadual ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regime_tributario">Regime tributário</Label>
          <select
            id="regime_tributario"
            name="regime_tributario"
            defaultValue={defaults.regime_tributario ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {Object.entries(REGIME_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-milsaca-cream-escuro pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
          Contato
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_name">Nome do contato</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={defaults.contact_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">E-mail</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={defaults.contact_email ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Telefone / WhatsApp</Label>
          <MaskedInput
            id="contact_phone"
            type="phone"
            name="contact_phone"
            defaultValue={defaults.contact_phone ?? ""}
            validateOnBlur
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <div className="flex gap-2">
            <Input
              id="city"
              name="city"
              defaultValue={defaults.city ?? ""}
              placeholder="São Paulo"
              className="flex-1"
              autoComplete="address-level2"
            />
            <UfSelect
              name="state"
              defaultValue={defaults.state ?? ""}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={defaults.observacoes ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Preferências, histórico, condições especiais..."
        />
      </div>
    </>
  );
}
