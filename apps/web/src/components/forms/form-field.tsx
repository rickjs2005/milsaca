import { isValidElement, cloneElement, useId } from "react";
import type { ReactElement } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  /** Texto de ajuda mostrado abaixo do label, antes do input. */
  hint?: string;
  /** Mensagem de erro embaixo do campo (servidor ou cliente). */
  error?: string | null;
  /** Texto de exemplo discreto embaixo do input (não-erro). */
  helper?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Wrapper de campo de formulário com Label + slot pra input + erro
 * acessível.
 *
 * Pra usar com `<MaskedInput>` / `<UfSelect>` / `<MunicipioAutocomplete>`
 * ou qualquer Input/Select shadcn padrão, passe o componente como `children`.
 *
 * Acessibilidade:
 *   - Conecta `aria-describedby` (hint + erro/helper) ao único filho quando ele
 *     é um elemento React que aceita a prop. Filhos que já tragam
 *     `aria-describedby` são preservados (concatenados).
 *   - Marca `aria-invalid` no filho quando há `error`, sem sobrescrever um
 *     valor explícito do caller.
 *   - Erro recebe `role="alert"` pra leitores de tela anunciarem na hora.
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  helper,
  className,
  children,
}: Props) {
  const autoId = useId();
  const hintId = hint ? `${autoId}-hint` : undefined;
  const errorId = error ? `${autoId}-error` : undefined;
  const helperId = helper && !error ? `${autoId}-helper` : undefined;

  const describedBy =
    [hintId, errorId, helperId].filter(Boolean).join(" ") || undefined;

  // Conecta aria-describedby / aria-invalid no único filho, preservando o que
  // o caller já tiver passado. Mantém retrocompat: se não der pra clonar
  // (ex.: múltiplos filhos / texto), renderiza como veio.
  let control = children;
  if (isValidElement(children) && describedBy) {
    const child = children as ReactElement<{
      "aria-describedby"?: string;
      "aria-invalid"?: boolean | "true" | "false";
    }>;
    const existingDescribedBy = child.props["aria-describedby"];
    control = cloneElement(child, {
      "aria-describedby": [existingDescribedBy, describedBy]
        .filter(Boolean)
        .join(" "),
      "aria-invalid": error ? true : child.props["aria-invalid"],
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} tone={error ? "error" : "default"}>
        {label}
        {required ? " *" : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-caption text-neutral-500">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger-600">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-caption text-neutral-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
