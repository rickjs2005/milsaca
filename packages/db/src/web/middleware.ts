import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@milsaca/types/database";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Atualiza a sessão Supabase a cada requisição.
 * Chame dentro de middleware.ts do Next.js.
 *
 * Retorna a NextResponse já com os cookies atualizados.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Importante: getUser revalida o token; getSession só lê cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
