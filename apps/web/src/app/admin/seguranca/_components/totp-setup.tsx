"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@milsaca/db/web/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "idle" | "enrolling" | "qr" | "verifying" | "done" | "error";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function start() {
    setError(null);
    setPhase("enrolling");
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Milsaca Admin (${new Date().toLocaleDateString("pt-BR")})`,
    });
    if (error || !data) {
      setError(error?.message ?? "Falha ao iniciar setup");
      setPhase("error");
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPhase("qr");
  }

  async function confirm() {
    if (!factorId) return;
    setError(null);
    setPhase("verifying");
    const supabase = createClient();
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? "Falha ao desafiar");
      setPhase("error");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.trim(),
    });
    if (verifyError) {
      setError("Código inválido. Tente de novo.");
      setPhase("qr");
      return;
    }
    setPhase("done");
    router.refresh();
  }

  async function cancelUnverified() {
    if (!factorId) {
      setPhase("idle");
      return;
    }
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    setPhase("idle");
    setFactorId(null);
    setQr(null);
    setSecret(null);
    setCode("");
    router.refresh();
  }

  if (phase === "idle" || phase === "enrolling") {
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
