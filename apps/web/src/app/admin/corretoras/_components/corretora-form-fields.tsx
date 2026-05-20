// Campos do form de corretora — compartilhado entre "Nova" e "Editar".
// Server Component sem state; valores defaults vêm via prop.

import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { REGIOES_CAFEEIRAS, type RegiaoCafeeira } from "./regioes";

type Defaults = {
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cnpj?: string | null;
  inscricao_est?: string | null;
  phone?: string | null;
  telefone_fixo?: string | null;
  email?: string | null;
  site_url?: string | null;
  descricao?: string | null;
  logo_url?: string | null;
  regioes_atendimento?: RegiaoCafeeira[] | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

const labelCls =
  "text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro";
const inputCls =
  "w-full rounded-xl border border-milsaca-verde/20 px-3 py-2 text-sm text-milsaca-verde outline-none focus:border-milsaca-dourado";
const inputMonoCls = `${inputCls} font-mono`;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-milsaca-dourado">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CorretoraFormFields({
  defaults,
  hideSlug = false,
}: {
  defaults?: Defaults;
  hideSlug?: boolean;
}) {
  const d = defaults ?? {};
  return (
    <div className="space-y-8">
      <Section title="Identidade">
        <div className="space-y-1">
          <label className={labelCls}>Nome *</label>
          <input
            name="name"
            required
            defaultValue={d.name ?? ""}
            placeholder="Café & Cia Corretagem"
            className={inputCls}
          />
        </div>
        {hideSlug ? null : (
          <div className="space-y-1">
            <label className={labelCls}>Slug (URL)</label>
            <input
              name="slug"
              defaultValue={d.slug ?? ""}
              placeholder="cafe-cia (gerado do nome se vazio)"
              className={inputMonoCls}
            />
            <p className="text-xs text-milsaca-verde-claro/70">
              Usado em códigos de contrato (<code>slug-2026-0001</code>).
            </p>
          </div>
        )}
        <div className="space-y-1">
          <label className={labelCls}>Descrição</label>
          <textarea
            name="descricao"
            rows={2}
            defaultValue={d.descricao ?? ""}
            placeholder="Corretora de café especializada em Arábica do Caparaó"
            className={inputCls}
          />
        </div>
      </Section>

      <Section title="Documentos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="cnpj" className={labelCls}>
              CNPJ
            </label>
            <MaskedInput
              id="cnpj"
              type="cnpj"
              name="cnpj"
              defaultValue={d.cnpj ?? ""}
              validateOnBlur
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Inscrição estadual</label>
            <input
              name="inscricao_est"
              defaultValue={d.inscricao_est ?? ""}
              placeholder="000.000.000.000"
              className={inputCls}
            />
          </div>
        </div>
      </Section>

      <Section title="Região de atendimento">
        <p className="text-xs text-milsaca-verde-claro/80">
          Marque todas que a corretora opera. Aparece como filtro pro produtor
          no catálogo.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REGIOES_CAFEEIRAS.map((r) => {
            const checked = (d.regioes_atendimento ?? []).includes(r.value);
            return (
              <label
                key={r.value}
                className="flex items-center gap-2 rounded-lg border border-milsaca-cream-escuro/60 px-3 py-2 text-sm text-milsaca-verde hover:border-milsaca-dourado"
              >
                <input
                  type="checkbox"
                  name="regioes_atendimento"
                  value={r.value}
                  defaultChecked={checked}
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Endereço">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-1">
            <label htmlFor="cep" className={labelCls}>
              CEP
            </label>
            <MaskedInput
              id="cep"
              type="cep"
              name="cep"
              defaultValue={d.cep ?? ""}
              validateOnBlur
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={labelCls}>Endereço (rua, nº)</label>
            <input
              name="endereco"
              defaultValue={d.endereco ?? ""}
              placeholder="Av. Getúlio Vargas, 1234"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className={labelCls}>Bairro</label>
            <input
              name="bairro"
              defaultValue={d.bairro ?? ""}
              placeholder="Centro"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="corretora-state" className={labelCls}>
              Estado (UF)
            </label>
            <UfSelect
              id="corretora-state"
              name="state"
              defaultValue={d.state ?? ""}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Cidade</label>
            <MunicipioAutocomplete
              name="city"
              defaultValue={d.city ?? ""}
              uf={d.state ?? null}
              ufFieldId="corretora-state"
              placeholder="Manhuaçu"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelCls}>Latitude (opcional)</label>
            <input
              name="lat"
              defaultValue={d.lat != null ? String(d.lat) : ""}
              placeholder="-20.2587"
              inputMode="decimal"
              className={inputMonoCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Longitude (opcional)</label>
            <input
              name="lng"
              defaultValue={d.lng != null ? String(d.lng) : ""}
              placeholder="-42.0289"
              inputMode="decimal"
              className={inputMonoCls}
            />
          </div>
        </div>
        <p className="text-[11px] text-milsaca-verde-claro/70">
          Cole de um link do Google Maps (clique direito → coordenadas).
          Fica oculto pro produtor; usado no mapa de busca futuro.
        </p>
      </Section>

      <Section title="Contato">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="phone" className={labelCls}>
              WhatsApp
            </label>
            <MaskedInput
              id="phone"
              type="phone"
              name="phone"
              defaultValue={d.phone ?? ""}
              validateOnBlur
            />
            <p className="text-xs text-milsaca-verde-claro/70">
              Canal principal pra produtor.
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="telefone_fixo" className={labelCls}>
              Telefone fixo
            </label>
            <MaskedInput
              id="telefone_fixo"
              type="phone"
              name="telefone_fixo"
              defaultValue={d.telefone_fixo ?? ""}
              validateOnBlur
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelCls}>E-mail</label>
            <input
              name="email"
              type="email"
              defaultValue={d.email ?? ""}
              placeholder="contato@cafecia.com.br"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Site</label>
            <input
              name="site_url"
              type="url"
              defaultValue={d.site_url ?? ""}
              placeholder="https://cafecia.com.br"
              className={inputCls}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Logo (URL)</label>
          <input
            name="logo_url"
            type="url"
            defaultValue={d.logo_url ?? ""}
            placeholder="https://...png (Storage será adicionado depois)"
            className={inputCls}
          />
        </div>
      </Section>
    </div>
  );
}
