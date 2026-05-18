"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_ROLE_COOKIE_NAME,
  getProfile,
  panelFor,
} from "@/lib/auth";

type ClientRole = "produtor" | "corretora";
const VALID_ROLES: ClientRole[] = ["produtor", "corretora"];

/**
 * Seta o cookie de modo ativo e redireciona pro painel.
 * Falha graciosamente se o user não tem aquele papel.
 * Admin não aparece aqui — é via /admin direto.
 */
export async function selectRole(formData: FormData) {
  const raw = String(formData.get("role") ?? "").trim();
  if (!VALID_ROLES.includes(raw as ClientRole)) {
    redirect("/painel/escolher");
  }
  const role = raw as ClientRole;

  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (!profile.roles.includes(role)) {
    redirect("/painel/escolher");
  }

  const store = await cookies();
  store.set(ACTIVE_ROLE_COOKIE_NAME, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });

  redirect(panelFor(role));
}
