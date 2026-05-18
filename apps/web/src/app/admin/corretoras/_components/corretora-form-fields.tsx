// Campos do form de corretora — compartilhado entre "Nova" e "Editar".
// Server Component sem state; valores defaults vêm via prop.

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
            <label className={labelCls}>CNPJ</label>
            <input
              name="cnpj"
              defaultValue={d.cnpj ?? ""}
              placeholder="00.000.000/0000-00"
              className={inputCls}
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
            <label className={labelCls}>CEP</label>
            <input
              name="cep"
              defaultValue={d.cep ?? ""}
              placeholder="36900-000"
              className={inputCls}
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
            <label className={labelCls}>Cidade</label>
            <input
              name="city"
              defaultValue={d.city ?? ""}
              placeholder="Manhuaçu"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Estado (UF)</label>
            <input
              name="state"
              maxLength={2}
              defaultValue={d.state ?? ""}
              placeholder="MG"
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>
      </Section>

      <Section title="Contato">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={labelCls}>WhatsApp</label>
            <input
              name="phone"
              defaultValue={d.phone ?? ""}
              placeholder="(33) 99999-9999"
              className={inputCls}
            />
            <p className="text-xs text-milsaca-verde-claro/70">
              Canal principal pra produtor.
            </p>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Telefone fixo</label>
            <input
              name="telefone_fixo"
              defaultValue={d.telefone_fixo ?? ""}
              placeholder="(33) 3333-3333"
              className={inputCls}
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
