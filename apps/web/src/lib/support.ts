import { unstable_cache } from "next/cache";
import { createPublicClient } from "@milsaca/db/web/public";

export type SupportChannels = {
  whatsapp: string | null;
  email: string | null;
  waHref: string | null;
  mailHref: string | null;
};

const WA_MSG = "Olá! Preciso de ajuda com o Milsaca.";
const MAIL_SUBJECT = "Suporte Milsaca";

function asString(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

/**
 * Canais oficiais de suporte (WhatsApp + e-mail), lidos de
 * `platform_settings` e gerenciados pelo admin em /admin/configuracoes.
 *
 * São públicos por design (contato de negócio, sem PII) — expostos via a
 * policy `platform_settings_public_support`, que libera leitura anônima
 * apenas das chaves `support_whatsapp` e `support_email`.
 *
 * Usa o client público (sem cookie) pra poder rodar dentro de
 * `unstable_cache`. Cache de 1h: esses valores mudam raríssimo.
 */
export const getSupportChannels = unstable_cache(
  async (): Promise<SupportChannels> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["support_whatsapp", "support_email"]);

    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    const email = asString(map.get("support_email"));
    const rawWa = asString(map.get("support_whatsapp"));
    const whatsapp = rawWa ? rawWa.replace(/\D/g, "") : null;

    return {
      whatsapp,
      email,
      waHref: whatsapp
        ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(WA_MSG)}`
        : null,
      mailHref: email
        ? `mailto:${email}?subject=${encodeURIComponent(MAIL_SUBJECT)}`
        : null,
    };
  },
  ["support-channels"],
  { revalidate: 3600, tags: ["support-channels"] },
);
