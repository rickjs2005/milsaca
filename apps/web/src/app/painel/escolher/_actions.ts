"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_ROLE_COOKIE_NAME,
  getProfile,
  panelFor,
} from "@/lib/auth";
import type { UserRole } from "@milsaca/types";

const VALID_ROLES: UserRole[] = ["produtor", "corretora", "admin"];

/**
 * Seta o cookie de modo ativo e redireciona pro painel.
 * Falha graciosamente se o user não tem aquele papel.
 */
export async function selectRole(formData: FormData) {
  const raw = String(formData.get("role") ?? "").trim();
  if (!VALID_ROLES.includes(raw as UserRole)) {
    redirect("/painel/escolher");
  }
  const role = raw as UserRole;

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
