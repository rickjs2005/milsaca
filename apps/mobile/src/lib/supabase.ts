// Cliente Supabase do mobile.
// - Storage seguro via expo-secure-store (chaves do iOS Keychain / Android Keystore)
// - Sem detectSessionInUrl (mobile não recebe callbacks por URL fragment;
//   o fluxo é OTP de 6 dígitos consumido na tela /verificar)

import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "@milsaca/types/database";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY não definidas. Verifique apps/mobile/.env.local.",
  );
}

// expo-secure-store tem limite de 2KB por valor; sessão Supabase fica
// confortavelmente abaixo (~1KB) então não precisamos chunking.
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const ACTIVE_ROLE_KEY = "mp_active_role";
