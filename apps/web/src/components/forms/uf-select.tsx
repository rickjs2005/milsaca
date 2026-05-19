"use client";

import { useId } from "react";
import { UFS } from "@/lib/brasil";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  onChange?: (uf: string) => void;
};

/**
 * Select de UF brasileira com 27 entradas + opção vazia.
 * Submete em uppercase via FormData.
 */
export function UfSelect({
  name,
  defaultValue,
  required,
  id,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  onChange,
}: Props) {
  const autoId = useId();
  const fieldId = id ?? `${name}-${autoId}`;
  const initial = (defaultValue ?? "").toUpperCase();

  return (
    <select
      id={fieldId}
      name={name}
      required={required}
      defaultValue={UFS.includes(initial as (typeof UFS)[number]) ? initial : ""}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <option value="">—</option>
      {UFS.map((uf) => (
        <option key={uf} value={uf}>
          {uf}
        </option>
      ))}
    </select>
  );
}
