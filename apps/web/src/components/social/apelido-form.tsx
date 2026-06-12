"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { updateApelido, type SocialFormState } from "@/lib/social/actions";

/**
 * Edição do apelido no próprio perfil da Comunidade. Colapsado num botão
 * "Editar apelido"; o nome registrado (contratos) não muda.
 */
export function ApelidoForm({ apelido }: { apelido: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<SocialFormState, FormData>(
    updateApelido,
    null,
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {state?.ok ? (
          <span className="inline-flex items-center gap-1 text-caption text-success-700">
            <Check aria-hidden className="h-3.5 w-3.5" />
            Apelido salvo
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal"
        >
          <Pencil aria-hidden className="h-3 w-3" />
          {apelido ? "Editar apelido" : "Usar um apelido"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="apelido"
          defaultValue={apelido ?? ""}
          maxLength={40}
          placeholder="Ex.: Zé do Café"
          autoFocus
          className="w-48 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-body-sm text-milsaca-preto placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SubmitButton size="sm" pendingLabel="Salvando...">
          Salvar
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-caption text-neutral-500 hover:text-milsaca-cafezal"
        >
          Cancelar
        </button>
      </div>
      <p className="text-caption text-neutral-500">
        É como você aparece na Comunidade. Deixe vazio pra usar seu nome.
        Contratos continuam com o nome registrado.
      </p>
      {state && !state.ok && state.error ? (
        <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
