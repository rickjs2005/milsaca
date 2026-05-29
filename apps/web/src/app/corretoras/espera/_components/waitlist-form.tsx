"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { MaskedInput } from "@/components/forms/masked-input";
import { UfSelect } from "@/components/forms/uf-select";
import { MunicipioAutocomplete } from "@/components/municipio-autocomplete";
import { SubmitButton } from "@/components/submit-button";

export function WaitlistForm({
  action,
  defaults,
  error,
}: {
  action: (formData: FormData) => void;
  defaults: { name: string };
  error: string | null;
}) {
  return (
    <form action={action} className="space-y-5">
      {/* Honeypot: humano não vê nem tabula; bot preenche. A action
          descarta o envio (finge sucesso) quando "company" vem preenchido. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Não preencha este campo</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <FormField label="Seu nome" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          defaultValue={defaults.name}
          placeholder="João da Silva"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="WhatsApp"
          htmlFor="whatsapp"
          helper="Pra te chamar quando abrir vaga."
        >
          <MaskedInput id="whatsapp" type="phone" name="whatsapp" validateOnBlur />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_8rem]">
        <FormField label="Cidade" htmlFor="city">
          <MunicipioAutocomplete
            name="city"
            uf="MG"
            ufFieldId="state"
            placeholder="Manhuaçu"
          />
        </FormField>

        <FormField label="UF" htmlFor="state">
          <UfSelect id="state" name="state" defaultValue="MG" />
        </FormField>
      </div>

      <FormField label="Mensagem (opcional)" htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Conta um pouco sobre a sua corretora (cidade, tempo de mercado...)"
        />
      </FormField>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <SubmitButton
        pendingLabel="Enviando..."
        className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
      >
        Entrar na lista de espera
      </SubmitButton>
    </form>
  );
}
