"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "./submit-button";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** Action que roda só após confirmar. Anexado via formAction. */
  formAction?: (formData: FormData) => void | Promise<void>;
  pendingLabel?: string;

  // Conteúdo do dialog
  confirmTitle: string;
  confirmMessage: React.ReactNode;
  confirmButtonLabel?: string;
  confirmButtonVariant?: React.ComponentProps<typeof Button>["variant"];

  /** Se false, pula o dialog e submete direto (útil pra toggles bi-direcionais). */
  shouldConfirm?: boolean;
};

/**
 * Botão de submit com confirmação modal antes de disparar a server
 * action. Usa <dialog> nativo (sem dependência shadcn AlertDialog).
 *
 * PRECISA estar dentro de um <form>. O dialog mora no DOM dentro do
 * form, então o SubmitButton interno consegue submeter normal via
 * formAction.
 */
export function ConfirmSubmit({
  children,
  className,
  variant = "outline",
  size,
  formAction,
  pendingLabel,
  confirmTitle,
  confirmMessage,
  confirmButtonLabel = "Confirmar",
  confirmButtonVariant = "destructive",
  shouldConfirm = true,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!shouldConfirm) {
    return (
      <SubmitButton
        variant={variant}
        size={size}
        className={className}
        formAction={formAction}
        pendingLabel={pendingLabel}
      >
        {children}
      </SubmitButton>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </Button>

      <dialog
        ref={dialogRef}
        className="rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/60"
        onClick={(e) => {
          // Fecha ao clicar fora do conteúdo (backdrop)
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="w-[min(420px,90vw)] space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {confirmTitle}
          </h2>
          <div className="text-sm text-slate-600">{confirmMessage}</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </Button>
            <SubmitButton
              variant={confirmButtonVariant}
              formAction={formAction}
              pendingLabel={pendingLabel ?? "Confirmando..."}
              className="gap-2"
            >
              {confirmButtonLabel}
            </SubmitButton>
          </div>
        </div>
      </dialog>
    </>
  );
}
