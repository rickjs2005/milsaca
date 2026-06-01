import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { REGIME_LABEL, type CompradorDetail } from "../_lib/queries";
import {
  CAFE_PREF_LABEL,
  PROCESSO_PREF_LABEL,
} from "../_lib/comprador-meta";

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

      <div className="border-t border-milsaca-cream-escuro pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-milsaca-verde-claro">
          Perfil de compra
        </p>
        <p className="mt-1 text-caption text-neutral-500">
          O que este comprador procura — usado pra casar oferta com comprador
          certo (Tipo, peneira, EUDR).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="perfil_cafe">Café preferido</Label>
          <select
            id="perfil_cafe"
            name="perfil_cafe"
            defaultValue={defaults.perfil?.cafe ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {Object.entries(CAFE_PREF_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil_processo">Processo preferido</Label>
          <select
            id="perfil_processo"
            name="perfil_processo"
            defaultValue={defaults.perfil?.processo ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {Object.entries(PROCESSO_PREF_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil_peneira">Faixa de peneira</Label>
          <Input
            id="perfil_peneira"
            name="perfil_peneira"
            defaultValue={defaults.perfil?.peneira ?? ""}
            placeholder="Ex: 16/17+"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="perfil_volume_sacas">Volume típico (sacas)</Label>
          <Input
            id="perfil_volume_sacas"
            name="perfil_volume_sacas"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={
              defaults.perfil?.volume_sacas != null
                ? String(defaults.perfil.volume_sacas)
                : ""
            }
            placeholder="Ex: 500"
          />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="perfil_exige_eudr"
            defaultChecked={defaults.perfil?.exige_eudr ?? false}
            className="h-4 w-4 rounded border-input text-milsaca-cafezal focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-milsaca-verde">
            Exige rastreabilidade EUDR (UE 2023/1115)
          </span>
        </label>
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
