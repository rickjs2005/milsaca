"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@milsaca/db/web/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Estado discriminado pela `phase`. Modelar assim garante que os dados do
 * enrollment (`factorId`/`qr`/`secret`) só existem nas fases em que fazem
 * sentido — impede estados inconsistentes (ex.: phase "qr" sem qr).
 */
type SetupState =
  | { phase: "idle"; error: string | null }
  | { phase: "enrolling" }
  | { phase: "error"; error: string }
  | { phase: "qr"; factorId: string; qr: string; secret: string; error: string | null }
  | { phase: "verifying"; factorId: string; qr: string; secret: string }
  | { phase: "done" };

type Phase = SetupState["phase"];

/**
 * Actions semânticas que representam cada transição da máquina de estados.
 */
type SetupAction =
  | { type: "START" }
  | { type: "START_FAIL"; error: string }
  | { type: "START_OK"; factorId: string; qr: string; secret: string }
  | { type: "VERIFY" }
  | { type: "CHALLENGE_FAIL"; error: string }
  | { type: "VERIFY_FAIL"; error: string }
  | { type: "VERIFY_OK" }
  | { type: "RESET" };

const initialState: SetupState = { phase: "idle", error: null };

function reducer(state: SetupState, action: SetupAction): SetupState {
  switch (action.type) {
    case "START":
      return { phase: "enrolling" };
    case "START_FAIL":
      return { phase: "error", error: action.error };
    case "START_OK":
      return {
        phase: "qr",
        factorId: action.factorId,
        qr: action.qr,
        secret: action.secret,
        error: null,
      };
    case "VERIFY":
      // Só faz sentido a partir da fase "qr"; mantém os dados do enrollment.
      if (state.phase !== "qr") return state;
      return {
        phase: "verifying",
        factorId: state.factorId,
        qr: state.qr,
        secret: state.secret,
      };
    case "CHALLENGE_FAIL":
      return { phase: "error", error: action.error };
    case "VERIFY_FAIL":
      // Volta pra "qr" preservando os dados do enrollment, com a mensagem de erro.
      if (state.phase !== "verifying") return state;
      return {
        phase: "qr",
        factorId: state.factorId,
        qr: state.qr,
        secret: state.secret,
        error: action.error,
      };
    case "VERIFY_OK":
      return { phase: "done" };
    case "RESET":
      // Preserva o comportamento original: cancelar não limpava `error`,
      // então uma mensagem anterior (ex.: "Código inválido") seguia visível.
      return {
        phase: "idle",
        error: "error" in state ? state.error : null,
      };
    default:
      return state;
  }
}

/**
 * Componente client que orquestra o enrollment de TOTP via Supabase MFA.
 *
 * Fluxo:
 *   1. Click "Ativar TOTP" → supabase.auth.mfa.enroll({ factorType: 'totp' })
 *      → retorna QR code (SVG data URL) + secret
 *   2. User escaneia no Authenticator e digita código de 6 dígitos
 *   3. supabase.auth.mfa.challenge → supabase.auth.mfa.verify
 *   4. Sucesso: refresh da página pra refletir status verificado
 */
export function TotpSetup() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  // `code` permanece como useState: é o input controlado do campo de 6 dígitos.
  const [code, setCode] = useState("");

  async function start() {
    dispatch({ type: "START" });
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Milsaca Admin (${new Date().toLocaleDateString("pt-BR")})`,
    });
    if (error || !data) {
      dispatch({ type: "START_FAIL", error: error?.message ?? "Falha ao iniciar setup" });
      return;
    }
    dispatch({
      type: "START_OK",
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirm() {
    if (state.phase !== "qr") return;
    const factorId = state.factorId;
    dispatch({ type: "VERIFY" });
    const supabase = createClient();
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      dispatch({
        type: "CHALLENGE_FAIL",
        error: challengeError?.message ?? "Falha ao desafiar",
      });
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.trim(),
    });
    if (verifyError) {
      dispatch({ type: "VERIFY_FAIL", error: "Código inválido. Tente de novo." });
      return;
    }
    dispatch({ type: "VERIFY_OK" });
    router.refresh();
  }

  async function cancelUnverified() {
    const factorId = "factorId" in state ? state.factorId : null;
    if (!factorId) {
      dispatch({ type: "RESET" });
      return;
    }
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    dispatch({ type: "RESET" });
    setCode("");
    router.refresh();
  }

  const phase: Phase = state.phase;

  if (phase === "idle" || phase === "enrolling") {
    const error = state.phase === "idle" ? state.error : null;
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Adicione um segundo fator pra proteger sua conta admin.
          Você vai precisar de um app autenticador no celular —
          recomendo <strong>Authy</strong>, <strong>Google Authenticator</strong>{" "}
          ou <strong>1Password</strong>.
        </p>
        <Button
          onClick={start}
          disabled={phase === "enrolling"}
          className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          {phase === "enrolling" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando...
            </>
          ) : (
            "Ativar autenticador (TOTP)"
          )}
        </Button>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  // Demais fases (qr / verifying / error / done) renderizam a tela do QR.
  const qr = "qr" in state ? state.qr : null;
  const secret = "secret" in state ? state.secret : null;
  const error = "error" in state ? state.error : null;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          1. Escaneie o QR code
        </p>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="QR code TOTP"
            className="mt-3 h-48 w-48 mx-auto rounded bg-white p-2"
          />
        ) : null}
        {secret ? (
          <div className="mt-3">
            <p className="text-[11px] text-slate-500">
              Ou cole o código manualmente:
            </p>
            <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs">
              {secret}
            </code>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="totp-code">2. Digite o código de 6 dígitos do app</Label>
        <Input
          id="totp-code"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="text-center text-2xl tracking-widest font-mono"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={cancelUnverified}
          disabled={phase === "verifying"}
        >
          Cancelar
        </Button>
        <Button
          onClick={confirm}
          disabled={code.length !== 6 || phase === "verifying"}
          className="gap-2 bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
        >
          {phase === "verifying" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            "Confirmar"
          )}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
