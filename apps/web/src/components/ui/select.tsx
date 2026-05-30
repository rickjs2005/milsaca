import * as React from "react";
import { cn } from "@/lib/utils";
import { inputBaseClassName } from "@/components/ui/input";

/**
 * Select NATIVO estilizado pra casar 1:1 com o `<Input>` Milsaca:
 * mesma altura touch-friendly (h-11 mobile / h-10 desktop), borda
 * `neutral-200`, foco com ring dourado, erro via `aria-invalid` (borda + ring
 * `danger-500`) e disabled claro.
 *
 * É nativo de propósito (B2B mobile, fazendeiro no celular): abre o picker do
 * sistema, zero dependência e acessível por padrão. As telas adotam na Onda 3.
 *
 * API = atributos nativos de `<select>` + `className`. Passe as `<option>`
 * como children. Para placeholder, use `<option value="" disabled>` como
 * primeiro filho.
 *
 * Classes específicas vs. Input:
 *   - `appearance-none` + chevron desenhado (bg svg) + `pr-9` pro espaço dele.
 *   - `cursor-pointer` (some quando disabled, herdando o `cursor-not-allowed`).
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        inputBaseClassName,
        "cursor-pointer appearance-none bg-no-repeat pr-9",
        "bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center]",
        // chevron neutral-500 desenhado como background svg
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%237C7D72%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
