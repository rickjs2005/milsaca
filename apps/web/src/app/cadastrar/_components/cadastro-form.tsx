"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { SubmitButton } from "@/components/submit-button";

type Role = "produtor" | "corretora";

type Defaults = {
  email: string;
  full_name: string;
  corretora_name: string;
  corretora_cnpj: string;
  corretora_city: string;
  corretora_uf: string;
  corretora_whatsapp: string;
};

type Founder = {
  accepting: boolean;
  used: number;
  total: number;
};

export function CadastroForm({
  action,
  initialRole,
  defaults,
  founder,
  error,
}: {
  action: (formData: FormData) => void;
  initialRole: Role;
  defaults: Defaults;
  founder: Founder;
  error: string | null;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const corretoraClosed = role === "corretora" && !founder.accepting;

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
          Você é
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            value="produtor"
            currentValue={role}
            onSelect={setRole}
            title="Produtor"
            desc="Tenho café pra vender"
          />
          <RoleOption
            value="corretora"
            currentValue={role}
            onSelect={setRole}
            title="Corretora"
            desc="Opero negócios de café"
          />
        </div>
        <input type="hidden" name="role" value={role} />
      </fieldset>

      {corretoraClosed ? (
        <CorretoraClosedPanel total={founder.total} />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Seu nome completo" htmlFor="full_name" required>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            defaultValue={defaults.full_name}
            placeholder="João da Silva"
          />
        </FormField>

        <FormField label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaults.email}
            placeholder="voce@exemplo.com"
          />
        </FormField>

        <FormField
          label="Senha"
          htmlFor="password"
          required
          helper="Mínimo 8 caracteres"
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
        </FormField>

        <FormField label="Confirmar senha" htmlFor="confirm" required>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Repita a senha"
          />
        </FormField>
      </div>

      {role === "corretora" ? (
        <div className="space-y-4 rounded-lg border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-4">
          <div className="rounded-md bg-milsaca-verde px-3 py-2 text-xs font-medium text-milsaca-cream">
            Programa Fundadoras · {founder.used} de {founder.total} vagas ·
            grátis vitalício
          </div>
          <p className="text-xs text-milsaca-verde">
            Dados da corretora — admin valida antes de liberar acesso.
          </p>

          <FormField
            label="Nome da corretora"
            htmlFor="corretora_name"
            required
          >
            <Input
              id="corretora_name"
              name="corretora_name"
              type="text"
              required
              defaultValue={defaults.corretora_name}
              placeholder="Café & Cia Corretagem"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="CNPJ" htmlFor="corretora_cnpj" required>
              <MaskedInput
                id="corretora_cnpj"
                type="cnpj"
                name="corretora_cnpj"
                required
                defaultValue={defaults.corretora_cnpj}
                validateOnBlur
              />
            </FormField>

            <FormField
              label="WhatsApp"
              htmlFor="corretora_whatsapp"
              helper="Opcional, mas acelera o contato dos produtores."
            >
              <MaskedInput
                id="corretora_whatsapp"
                type="phone"
                name="corretora_whatsapp"
                defaultValue={defaults.corretora_whatsapp}
                validateOnBlur
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_8rem]">
            <FormField label="Cidade" htmlFor="corretora_city" required>
              <MunicipioAutocomplete
                name="corretora_city"
                defaultValue={defaults.corretora_city}
                uf={defaults.corretora_uf || "MG"}
                ufFieldId="corretora_uf"
                required
                placeholder="Manhuaçu"
              />
            </FormField>

            <FormField label="UF" htmlFor="corretora_uf" required>
              <UfSelect
                id="corretora_uf"
                name="corretora_uf"
                required
                defaultValue={defaults.corretora_uf || "MG"}
              />
            </FormField>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-milsaca-cream-escuro bg-milsaca-cream/60 p-4">
        <label className="flex items-start gap-3 text-sm text-milsaca-verde">
          <input
            type="checkbox"
            name="lgpd_consent"
            value="on"
            required
            className="mt-0.5 h-5 w-5 cursor-pointer accent-milsaca-verde"
          />
          <span className="leading-relaxed">
            Concordo com a{" "}
            <a
              href="/politica-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </a>{" "}
            e autorizo o Milsaca a usar meus dados pra conectar com{" "}
            {role === "corretora" ? "produtores" : "corretoras"} de café.
            Posso revogar a qualquer momento em{" "}
            <code className="text-xs">contato@milsaca.app</code>.
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <SubmitButton
        pendingLabel="Enviando..."
        className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
      >
        {role === "corretora" ? "Enviar pra aprovação" : "Criar conta"}
      </SubmitButton>
        </>
      )}
    </form>
  );
}

function CorretoraClosedPanel({ total }: { total: number }) {
  return (
    <div className="space-y-3 rounded-lg border border-milsaca-dourado/40 bg-milsaca-dourado/5 p-5 text-center">
      <p className="text-sm font-semibold text-milsaca-verde">
        Vagas de fundadora encerradas no momento
      </p>
      <p className="text-xs leading-relaxed text-milsaca-verde-claro">
        As {total} vagas do programa de fundadoras (grátis vitalício) não estão
        abertas agora. Entre na lista de espera que a gente te chama assim que
        liberar novas vagas.
      </p>
      <Link
        href="/corretoras/espera"
        className="inline-flex w-full items-center justify-center rounded-md bg-milsaca-verde px-4 py-2.5 text-sm font-medium text-milsaca-cream transition-colors hover:bg-milsaca-verde-claro"
      >
        Entrar na lista de espera
      </Link>
    </div>
  );
}

function RoleOption({
  value,
  currentValue,
  onSelect,
  title,
  desc,
}: {
  value: Role;
  currentValue: Role;
  onSelect: (v: Role) => void;
  title: string;
  desc: string;
}) {
  const selected = value === currentValue;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className={
        selected
          ? "rounded-xl border-2 border-milsaca-verde bg-milsaca-verde/5 px-3 py-3 text-left transition-colors"
          : "rounded-xl border border-milsaca-cream-escuro bg-white px-3 py-3 text-left transition-colors hover:border-milsaca-dourado"
      }
    >
      <p className="text-sm font-semibold text-milsaca-verde">{title}</p>
      <p className="mt-0.5 text-xs text-milsaca-verde-claro">{desc}</p>
    </button>
  );
}
