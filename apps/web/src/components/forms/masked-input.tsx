"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatCEP,
  formatCNPJ,
  formatCPF,
  formatCpfOrCnpj,
  formatPhoneBR,
  isValidCEP,
  isValidCNPJ,
  isValidCPF,
  isValidCpfOrCnpj,
  isValidPhoneBR,
  normalizeCEP,
  normalizeCNPJ,
  normalizeCPF,
  normalizeCpfOrCnpj,
  normalizePhoneBR,
  onlyDigits,
} from "@/lib/brasil";

export type MaskType = "cpf" | "cnpj" | "cpf-cnpj" | "phone" | "cep";

const META: Record<
  MaskType,
  {
    placeholder: string;
    maxDigits: number;
    format: (v: string) => string;
    normalize: (v: string) => string | null;
    isValid: (v: string) => boolean;
    inputMode: "numeric" | "tel";
    autoComplete?: string;
  }
> = {
  cpf: {
    placeholder: "000.000.000-00",
    maxDigits: 11,
    format: formatCPF,
    normalize: (v) => normalizeCPF(v),
    isValid: isValidCPF,
    inputMode: "numeric",
  },
  cnpj: {
    placeholder: "00.000.000/0000-00",
    maxDigits: 14,
    format: formatCNPJ,
    normalize: (v) => normalizeCNPJ(v),
    isValid: isValidCNPJ,
    inputMode: "numeric",
  },
  "cpf-cnpj": {
    placeholder: "CPF ou CNPJ",
    maxDigits: 14,
    format: formatCpfOrCnpj,
    normalize: (v) => normalizeCpfOrCnpj(v),
    isValid: isValidCpfOrCnpj,
    inputMode: "numeric",
  },
  phone: {
    placeholder: "(00) 00000-0000",
    maxDigits: 11,
    format: formatPhoneBR,
    normalize: (v) => normalizePhoneBR(v),
    isValid: isValidPhoneBR,
    inputMode: "tel",
    autoComplete: "tel",
  },
  cep: {
    placeholder: "00000-000",
    maxDigits: 8,
    format: formatCEP,
    normalize: (v) => normalizeCEP(v),
    isValid: isValidCEP,
    inputMode: "numeric",
    autoComplete: "postal-code",
  },
};

type Props = {
  /** Tipo de máscara. */
  type: MaskType;
  /** Nome do campo no FormData (submitido com valor normalizado). */
  name: string;
  /** Valor inicial — aceita mascarado ou cru. */
  defaultValue?: string | null;
  /** Texto do placeholder. Padrão por tipo. */
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  /** Se true, valida ao perder foco e mostra hint visual. */
  validateOnBlur?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Input que aplica máscara visual enquanto o user digita E submete o
 * valor NORMALIZADO ao backend via input hidden de mesmo `name`.
 *
 * Padrão usado em todo o Milsaca:
 *   - Docs (CPF/CNPJ) submetem só dígitos
 *   - Telefones submetem 55DDDXXXXXXXX (E.164 sem +)
 *
 * Validação visual opcional via `validateOnBlur`: marca borda destrutiva
 * + aria-invalid se o valor estiver completo mas inválido (DV errado).
 */
export function MaskedInput({
  type,
  name,
  defaultValue,
  placeholder,
  required,
  id,
  className,
  validateOnBlur,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalidProp,
}: Props) {
  const meta = META[type];
  const autoId = useId();
  const fieldId = id ?? `${name}-${autoId}`;

  const [raw, setRaw] = useState(() => meta.format(defaultValue ?? ""));
  const [touched, setTouched] = useState(false);

  const normalized = useMemo(() => {
    const v = meta.normalize(raw);
    return v ?? "";
  }, [raw, meta]);

  const digitsOnly = onlyDigits(raw);
  const isComplete = digitsOnly.length === meta.maxDigits;
  const isInvalidNow =
    validateOnBlur && touched && isComplete && !meta.isValid(raw);

  return (
    <>
      <Input
        id={fieldId}
        type="text"
        inputMode={meta.inputMode}
        autoComplete={meta.autoComplete}
        placeholder={placeholder ?? meta.placeholder}
        required={required}
        value={raw}
        onChange={(e) => setRaw(meta.format(e.target.value))}
        onBlur={() => setTouched(true)}
        aria-invalid={ariaInvalidProp ?? (isInvalidNow || undefined)}
        aria-describedby={ariaDescribedBy}
        className={className}
      />
      {/* Submete valor normalizado pro form. */}
      <input type="hidden" name={name} value={normalized} />
    </>
  );
}
