import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@milsaca/db/web/server";
import { defaultRouteFor } from "@/lib/auth";
import type { Profile } from "@milsaca/types";

/**
 * Verificação de OTP por token_hash (fluxo de confirmação por email).
 * Usado, por exemplo, em recuperação de senha ou confirmação de email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/painel";

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/entrar?error=Link%20inv%C3%A1lido`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(
      `${origin}/entrar?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/entrar?error=Sess%C3%A3o%20inv%C3%A1lida`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<Pick<Profile, "role">>();

  const target = profile?.role ? defaultRouteFor(profile.role) : next;
  return NextResponse.redirect(`${origin}${target}`);
}
