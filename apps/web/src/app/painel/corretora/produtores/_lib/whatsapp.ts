/**
 * Normaliza um telefone BR pra formato wa.me (E.164 sem +).
 * Aceita "(33) 99999-9999", "+55 33 9 9999-9999", "5533999999999" etc.
 * Retorna null se não conseguir derivar um número plausível (>=10 dígitos).
 * Adiciona DDI 55 se telefone vier com 10 ou 11 dígitos.
 */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits;
  return null;
}

export function buildWhatsAppInviteUrl({
  phone,
  message,
}: {
  phone: string | null;
  message: string;
}): string | null {
  const normalized = normalizePhoneBR(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function defaultInviteMessage({
  corretoraNome,
  produtorNome,
  siteUrl,
}: {
  corretoraNome: string;
  produtorNome: string;
  siteUrl: string;
}): string {
  return [
    `Olá, ${produtorNome.split(" ")[0] || produtorNome}!`,
    "",
    `Aqui é da ${corretoraNome}. Cadastramos você na Milsaca pra você acompanhar as cotações do café e receber propostas direto pelo celular.`,
    "",
    `Pra entrar é só usar seu email neste link: ${siteUrl}/entrar`,
    "",
    "Qualquer dúvida me chama por aqui!",
  ].join("\n");
}
