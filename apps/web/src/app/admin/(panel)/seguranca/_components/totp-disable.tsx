"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@milsaca/db/web/client";
import { Button } from "@/components/ui/button";

type Props = {
  factorId: string;
  friendlyName: string | null;
};

/**
 * Desativa o TOTP atual após confirmação. Bloqueia clique acidental
 * via window.confirm — em produção idealmente substituir pelo
 * &lt;ConfirmSubmit&gt; do admin, mas isso aqui é client-only.
 */
export function TotpDisable({ factorId, friendlyName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisable() {
    if (
      !window.confirm(
        "Tem certeza que quer desativar o autenticador? Sua conta admin volta a depender só de email + senha.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-700">
        <p className="font-medium">✓ Autenticador ativo</p>
        <p className="mt-0.5 text-xs">
          {friendlyName ?? "TOTP"} — você precisa do código a cada login.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={handleDisable}
        disabled={busy}
        className="gap-2 text-destructive hover:text-destructive"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Desativando...
          </>
        ) : (
          "Desativar autenticador"
        )}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
