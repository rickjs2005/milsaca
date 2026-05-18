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

// expo-secure-store tem limite de 2KB por valor. Quando o JWT do Supabase
// passa disso (user com roles[] grande, user_metadata, etc.), setItemAsync
// emite warning e a sessão não persiste — usuário cai de volta no login.
// Solução: chunking. Valor grande é quebrado em N partes; o key principal
// guarda apenas um marker "__chunked__:N", e os pedaços ficam em key.0, key.1...
const CHUNK_SIZE = 1800;
const CHUNK_MARKER = "__chunked__:";

async function deleteOldChunks(key: string): Promise<void> {
  const existing = await SecureStore.getItemAsync(key);
  if (!existing?.startsWith(CHUNK_MARKER)) return;
  const count = parseInt(existing.slice(CHUNK_MARKER.length), 10);
  if (!Number.isFinite(count) || count <= 0) return;
  for (let i = 0; i < count; i++) {
    try {
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    } catch {
      // ignore — chunk pode já não existir
    }
  }
}

const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const head = await SecureStore.getItemAsync(key);
    if (!head) return null;
    if (!head.startsWith(CHUNK_MARKER)) return head;
    const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join("");
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await deleteOldChunks(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const total = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, `${CHUNK_MARKER}${total}`);
    for (let i = 0; i < total; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await deleteOldChunks(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
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
