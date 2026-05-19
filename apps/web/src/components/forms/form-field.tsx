import { useId } from "react";
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
 * ou qualquer Input shadcn padrão, passe o componente como `children`.
 *
 * Conecta `aria-describedby` ao erro/helper via id auto-gerado.
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
  const errorId = error ? `${autoId}-error` : undefined;
  const helperId = helper && !error ? `${autoId}-helper` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? " *" : null}
      </Label>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {/* O caller pode escolher quem recebe os aria-* lendo da prop;
          mantemos o id no erro/helper pra ele referenciar. */}
      {children}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-[11px] text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
