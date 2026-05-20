"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  formAction?: (formData: FormData) => void | Promise<void>;
  /** Disable adicional, combinado com `pending` via OR. */
  disabled?: boolean;
};

/**
 * Botão de submit pra forms server-action. Mostra spinner e desabilita
 * enquanto a action está em flight. Usa useFormStatus, então PRECISA
 * estar dentro de um <form>.
 *
 * Aceita variant/size do Button padrão. Suporta formAction pra forms
 * com múltiplas actions (ex.: Aprovar/Rejeitar no mesmo form).
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
  formAction,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      formAction={formAction}
      disabled={pending || disabled}
      className={cn(className)}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{pendingLabel ?? "Aguarde..."}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
