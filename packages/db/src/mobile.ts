import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@milsaca/types/database";

/**
 * Client Supabase para o app mobile (Expo).
 * Usa as chaves EXPO_PUBLIC_* (publishable).
 *
 * O storage padrão é AsyncStorage / SecureStore — configurado no app mobile
 * via createClient(...{ auth: { storage } }) na inicialização.
 */
export function createClient(storage?: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}) {
  return createSupabaseClient<Database>(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  );
}
