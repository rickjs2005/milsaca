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

type MaskType = "cpf" | "cnpj" | "cpf-cnpj" | "phone" | "cep";

const META: Record<
  MaskType,
  {
    placeholder: string;
    maxDigits: number;
    /** Comprimentos (em dígitos) em que o valor é considerado "completo"
     *  e portanto passível de validação inline. CPF=11, CNPJ=14, etc. */
    validLengths: number[];
    /** Mensagem mostrada inline quando completo porém inválido. */
    errorLabel: string;
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
    validLengths: [11],
    errorLabel: "CPF inválido — confira os números.",
    format: formatCPF,
    normalize: (v) => normalizeCPF(v),
    isValid: isValidCPF,
    inputMode: "numeric",
  },
  cnpj: {
    placeholder: "00.000.000/0000-00",
    maxDigits: 14,
    validLengths: [14],
    errorLabel: "CNPJ inválido — confira os números.",
    format: formatCNPJ,
    normalize: (v) => normalizeCNPJ(v),
    isValid: isValidCNPJ,
    inputMode: "numeric",
  },
  "cpf-cnpj": {
    placeholder: "CPF ou CNPJ",
    maxDigits: 14,
    validLengths: [11, 14],
    errorLabel: "CPF ou CNPJ inválido — confira os números.",
    format: formatCpfOrCnpj,
    normalize: (v) => normalizeCpfOrCnpj(v),
    isValid: isValidCpfOrCnpj,
    inputMode: "numeric",
  },
  phone: {
    placeholder: "(00) 00000-0000",
    maxDigits: 11,
    validLengths: [10, 11],
    errorLabel: "Telefone inválido — confira o DDD e os números.",
    format: formatPhoneBR,
    normalize: (v) => normalizePhoneBR(v),
    isValid: isValidPhoneBR,
    inputMode: "tel",
    autoComplete: "tel",
  },
  cep: {
    placeholder: "00000-000",
    maxDigits: 8,
    validLengths: [8],
    errorLabel: "CEP inválido.",
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
  /** Se true, valida ao perder foco / completar e mostra hint visual + mensagem. */
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
 * Validação visual via `validateOnBlur`: quando o valor atinge um
 * comprimento "completo" (ex.: 11 dígitos de CPF) mas o dígito
 * verificador não bate, marca borda destrutiva + aria-invalid e mostra
 * uma mensagem curta logo abaixo. Verde discreto quando válido.
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
  const msgId = `${fieldId}-msg`;

  const [raw, setRaw] = useState(() => meta.format(defaultValue ?? ""));
  const [touched, setTouched] = useState(false);

  const normalized = useMemo(() => {
    const v = meta.normalize(raw);
    return v ?? "";
  }, [raw, meta]);

  const digitsOnly = onlyDigits(raw);
  // "Completo" = bateu num comprimento válido pro tipo (CPF 11, CNPJ 14...).
  const isComplete = meta.validLengths.includes(digitsOnly.length);
  const valueIsValid = meta.isValid(raw);
  const showFeedback = !!validateOnBlur && (touched || isComplete) && digitsOnly.length > 0;
  const isInvalidNow = showFeedback && isComplete && !valueIsValid;
  const isValidNow = showFeedback && isComplete && valueIsValid;

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
        aria-describedby={
          isInvalidNow ? [ariaDescribedBy, msgId].filter(Boolean).join(" ") : ariaDescribedBy
        }
        className={
          [
            className,
            isInvalidNow ? "border-danger-500 focus-visible:ring-danger-500" : "",
            isValidNow ? "border-success-500 focus-visible:ring-success-500" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {isInvalidNow ? (
        <p id={msgId} className="mt-1 text-xs text-danger-600">
          {meta.errorLabel}
        </p>
      ) : null}
      {/* Submete valor normalizado pro form. */}
      <input type="hidden" name={name} value={normalized} />
    </>
  );
}
