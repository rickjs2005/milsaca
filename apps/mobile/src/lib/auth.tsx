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
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setActiveRole: (role: UserRole) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function pickDefaultRole(
  roles: UserRole[] | null | undefined,
  previous: UserRole | null,
): UserRole | null {
  if (!roles || roles.length === 0) return null;

  // Mobile não suporta admin (admin opera pelo painel web). Se o user
  // tem só role admin, retornamos "admin" mesmo — o gate em (painel)/_layout
  // detecta e mostra "use o web". Pra escolher entre produtor/corretora,
  // ignoramos admin no cálculo.
  const mobileRoles = roles.filter((r) => r !== "admin");

  if (mobileRoles.length === 0) {
    // Só tem admin → retorna admin pro gate mostrar mensagem "use o web"
    return roles.includes("admin") ? "admin" : null;
  }

  if (
    previous &&
    previous !== "admin" &&
    mobileRoles.includes(previous)
  ) {
    return previous;
  }
  if (mobileRoles.length === 1) return mobileRoles[0] ?? null;

  // 2+ roles mobile (produtor + corretora) → tela /escolher decide
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

  const signInWithOtp = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { error: "Informe seu email." };

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    if (!trimmedEmail || !trimmedToken) {
      return { error: "Informe email e código." };
    }
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: "email",
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
      signInWithOtp,
      verifyOtp,
      signOut,
      setActiveRole,
      reloadProfile,
    }),
    [
      status,
      session,
      profile,
      activeRole,
      signInWithOtp,
      verifyOtp,
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
