// Helpers de WhatsApp portados de
// apps/web/src/app/painel/corretora/produtores/_lib/whatsapp.ts.
// Mantém a normalização BR (+55 se 10/11 dígitos puros).

function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13))
    return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
