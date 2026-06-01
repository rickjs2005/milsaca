"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

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
  refCorretora,
}: {
  action: (formData: FormData) => void;
  initialRole: Role;
  defaults: Defaults;
  founder: Founder;
  error: string | null;
  /** id da corretora indicadora (link /indicacao/{slug}); vira favorita no signup. */
  refCorretora?: string;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const corretoraClosed = role === "corretora" && !founder.accepting;

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-caption font-medium uppercase tracking-wide text-neutral-600">
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
        {refCorretora ? (
          <input type="hidden" name="ref" value={refCorretora} />
        ) : null}
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
        <div className="space-y-4 rounded-lg border border-milsaca-dourado/30 bg-milsaca-dourado/10 p-4">
          <div className="rounded-md bg-milsaca-cafezal px-3 py-2 text-caption font-medium text-milsaca-cream">
            Programa Fundadoras · {founder.used} de {founder.total} vagas ·
            grátis vitalício
          </div>
          <p className="text-caption text-neutral-700">
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

      <div className="rounded-lg border border-neutral-200 bg-milsaca-cream/60 p-4">
        <label className="flex items-start gap-3 text-body-sm text-neutral-700">
          <input
            type="checkbox"
            name="lgpd_consent"
            value="on"
            required
            className="mt-0.5 h-5 w-5 cursor-pointer accent-milsaca-cafezal"
          />
          <span className="leading-relaxed">
            Concordo com a{" "}
            <a
              href="/politica-privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-milsaca-cafezal underline-offset-2 hover:underline"
            >
              Política de Privacidade
            </a>{" "}
            e autorizo o Milsaca a usar meus dados pra conectar com{" "}
            {role === "corretora" ? "produtores" : "corretoras"} de café.
            Posso revogar a qualquer momento em{" "}
            <code className="text-caption">milsaca2026@gmail.com</code>.
          </span>
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-body-sm font-medium text-danger-700"
        >
          {error}
        </p>
      ) : null}

      <SubmitButton
        pendingLabel="Enviando..."
        variant="primary"
        size="lg"
        className="w-full"
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
    <div className="space-y-3 rounded-lg border border-milsaca-dourado/40 bg-milsaca-dourado/10 p-5 text-center">
      <p className="text-body-sm font-semibold text-milsaca-cafezal">
        Vagas de fundadora encerradas no momento
      </p>
      <p className="text-caption leading-relaxed text-neutral-600">
        As {total} vagas do programa de fundadoras (grátis vitalício) não estão
        abertas agora. Entre na lista de espera que a gente te chama assim que
        liberar novas vagas.
      </p>
      <Button asChild variant="primary" size="lg" className="w-full">
        <Link href="/corretoras/espera">Entrar na lista de espera</Link>
      </Button>
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
          ? "rounded-xl border-2 border-milsaca-cafezal bg-milsaca-cafezal/5 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : "rounded-xl border border-neutral-200 bg-white px-3 py-3 text-left transition-colors hover:border-milsaca-dourado focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
    >
      <p className="text-body-sm font-semibold text-milsaca-cafezal">{title}</p>
      <p className="mt-0.5 text-caption text-neutral-600">{desc}</p>
    </button>
  );
}
