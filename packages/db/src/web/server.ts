import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@milsaca/types/database";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase para uso em Server Components, Route Handlers
 * e Server Actions do Next.js (App Router).
 *
 * Lembre-se: no server, sempre use supabase.auth.getUser() — nunca getSession().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component — ignorar.
            // O middleware já cuida de manter o cookie atualizado.
          }
        },
      },
    },
  );
}
