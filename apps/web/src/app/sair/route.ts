import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@milsaca/db/web/server";

/**
 * Logout. Suporta GET e POST para facilitar links e formulários.
 */
async function handler(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/entrar`);
}

export const GET = handler;
export const POST = handler;
