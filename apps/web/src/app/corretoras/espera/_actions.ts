"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { createHash } from "node:crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  citySchema,
  ufSchema,
  whatsappOptionalSchema,
} from "@/lib/brasil-schemas";

/**
 * Entra na lista de espera de corretora (quando o programa fundador está
 * cheio/fechado). Insert público — RLS permite anon. Rate-limit por IP.
 */
export async function entrarNaEspera(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsapp") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const cityRaw = String(formData.get("city") ?? "");
  const ufRaw = String(formData.get("state") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;

  const params = new URLSearchParams();
  if (name) params.set("name", name);

  if (!name) {
    params.set("error", "Informe seu nome.");
    redirect(`/corretoras/espera?${params.toString()}`);
  }

  let whatsapp: string | null = null;
  if (whatsappRaw.trim()) {
    const wa = whatsappOptionalSchema.safeParse(whatsappRaw);
    if (!wa.success) {
      params.set("error", "Informe um WhatsApp válido (com DDD).");
      redirect(`/corretoras/espera?${params.toString()}`);
    }
    whatsapp = wa.data;
  }

  let city: string | null = null;
  if (cityRaw.trim()) {
    const c = citySchema.safeParse(cityRaw);
    city = c.success ? c.data : cityRaw.trim();
  }
  let state: string | null = null;
  if (ufRaw.trim()) {
    const u = ufSchema.safeParse(ufRaw);
    state = u.success ? u.data : null;
  }

  // Rate limit por IP: 5 envios/hora.
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() : h.get("x-real-ip");
  const salt = process.env.LEAD_IP_SALT ?? "milsaca-waitlist";
  const ipKey = createHash("sha256")
    .update(`${salt}|${ip ?? "no-ip"}`)
    .digest("hex")
    .slice(0, 16);
  const rl = await checkRateLimit(`waitlist:${ipKey}`, 5, 3600);
  if (!rl.allowed) {
    params.set(
      "error",
      `Muitos envios. Tente de novo em ${Math.ceil(rl.retryAfterSeconds / 60)}min.`,
    );
    redirect(`/corretoras/espera?${params.toString()}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("corretora_waitlist").insert({
    name,
    whatsapp,
    email,
    city,
    state,
    message,
  });

  if (error) {
    params.set("error", "Não consegui salvar agora. Tente de novo em instantes.");
    redirect(`/corretoras/espera?${params.toString()}`);
  }

  redirect("/corretoras/espera?enviado=1");
}
