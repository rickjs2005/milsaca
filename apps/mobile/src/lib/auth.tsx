// AuthProvider — única fonte da verdade pra sessão e papel ativo no mobile.
//
// Espelha o comportamento do web:
//   - `profiles.roles user_role[]` permite produtor + corretora no mesmo email
//   - Quando há 2+ papéis, o usuário escolhe via /escolher e o valor
//     persiste em SecureStore (key `mp_active_role`) — equivalente ao
//     cookie do web.
//
// Hooks expostos:
//   useAuth() → { status, session, user, profile, activeRole, ... }
//   onAuthStateChange dispara reload do profile automaticamente.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@milsaca/types";

import { ACTIVE_ROLE_KEY, supabase } from "./supabase";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

interface AuthValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  activeRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  confirmEmail: (
    email: string,
    token: string,
  ) => Promise<{ error?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setActiveRole: (role: UserRole) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function pickDefaultRole(
  roles: UserRole[] | null | undefined,
  _previous: UserRole | null,
): UserRole | null {
  if (!roles || roles.length === 0) return null;

  // Mobile é EXCLUSIVO PRO PRODUTOR. Corretora e admin operam no painel
  // web (milsaca.app). Decisão tomada em 2026-05-22 — quem entra no mobile
  // com role apenas corretora/admin vê a tela "Use o web" em (painel)/_layout.
  if (roles.includes("produtor")) return "produtor";
  if (roles.includes("admin")) return "admin"; // gate específico
  if (roles.includes("corretora")) return "corretora"; // gate específico
  return null;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[auth] fetchProfile error:", error.message);
    return null;
  }
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const mounted = useRef(true);

  // Inicialização: lê sessão + papel salvo, escuta mudanças.
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const [{ data: sessionData }, savedRoleRaw] = await Promise.all([
        supabase.auth.getSession(),
        SecureStore.getItemAsync(ACTIVE_ROLE_KEY),
      ]);
      if (!mounted.current) return;

      const savedRole = (savedRoleRaw as UserRole | null) ?? null;
      const initial = sessionData.session ?? null;
      setSession(initial);

      if (initial) {
        const p = await fetchProfile(initial.user.id);
        if (!mounted.current) return;
        setProfile(p);
        setActiveRoleState(pickDefaultRole(p?.roles, savedRole));
        setStatus("signed_in");
      } else {
        setStatus("signed_out");
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, next) => {
        if (!mounted.current) return;
        setSession(next ?? null);
        if (!next) {
          setProfile(null);
          setActiveRoleState(null);
          await SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
          setStatus("signed_out");
          return;
        }
        const [p, savedRole] = await Promise.all([
          fetchProfile(next.user.id),
          SecureStore.getItemAsync(ACTIVE_ROLE_KEY),
        ]);
        if (!mounted.current) return;
        setProfile(p);
        setActiveRoleState(
          pickDefaultRole(p?.roles, (savedRole as UserRole | null) ?? null),
        );
        setStatus("signed_in");
      },
    );

    return () => {
      mounted.current = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) return { error: "Informe email e senha." };

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName: string;
    }) => {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        return { error: "Preencha nome, email e senha." };
      }
      if (password.length < 8) {
        return { error: "Senha precisa ter pelo menos 8 caracteres." };
      }
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName, role: "produtor" },
        },
      });
      if (error) return { error: error.message };
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const confirmEmail = useCallback(
    async (email: string, token: string) => {
      const trimmed = email.trim().toLowerCase();
      const code = token.replace(/\D/g, "").slice(0, 6);
      if (!trimmed || code.length !== 6) {
        return { error: "Código inválido. São 6 dígitos." };
      }
      const { error } = await supabase.auth.verifyOtp({
        email: trimmed,
        token: code,
        type: "email",
      });
      if (error) return { error: "Código incorreto ou expirado." };
      return {};
    },
    [],
  );

  const resendConfirmation = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { error: "Informe seu email." };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { error: "Informe seu email." };

    // Deep link pra o próprio app reabrir na tela de redefinir senha,
    // em vez de jogar pro web (que não existe nesse fluxo no mobile).
    // Scheme `milsaca://` declarado em app.json.
    const redirectTo = Linking.createURL("/redefinir-senha");
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
  }, []);

  const setActiveRole = useCallback(async (role: UserRole) => {
    await SecureStore.setItemAsync(ACTIVE_ROLE_KEY, role);
    setActiveRoleState(role);
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!session) return;
    const p = await fetchProfile(session.user.id);
    if (!mounted.current) return;
    setProfile(p);
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      activeRole,
      signIn,
      signUp,
      confirmEmail,
      resendConfirmation,
      requestPasswordReset,
      signOut,
      setActiveRole,
      reloadProfile,
    }),
    [
      status,
      session,
      profile,
      activeRole,
      signIn,
      signUp,
      confirmEmail,
      resendConfirmation,
      requestPasswordReset,
      signOut,
      setActiveRole,
      reloadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
