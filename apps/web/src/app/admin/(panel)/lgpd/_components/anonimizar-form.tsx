"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { anonimizarTitular } from "../_actions";

const CONFIRM_WORD = "ANONIMIZAR";

/**
 * Form de anonimização de titular (LGPD). É uma ação DESTRUTIVA e
 * irreversível, então o botão de submit só habilita quando o admin
 * digita exatamente "ANONIMIZAR" no campo de confirmação.
 */
export function AnonimizarForm() {
  const [userId, setUserId] = useState("");
  const [confirm, setConfirm] = useState("");

  const ready = userId.trim().length > 0 && confirm.trim() === CONFIRM_WORD;

  return (
    <form action={anonimizarTitular} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="user_id">ID do titular (user_id)</Label>
        <Input
          id="user_id"
          name="user_id"
          required
          autoComplete="off"
          placeholder="00000000-0000-0000-0000-000000000000"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-slate-500">
          UUID do usuário em <code>auth.users</code> / <code>profiles.id</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">
          Pra confirmar, digite{" "}
          <span className="font-mono font-semibold text-rose-700">
            {CONFIRM_WORD}
          </span>
        </Label>
        <Input
          id="confirm"
          name="confirm"
          autoComplete="off"
          placeholder={CONFIRM_WORD}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <SubmitButton
        pendingLabel="Anonimizando..."
        disabled={!ready}
        className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
      >
        <ShieldAlert className="h-4 w-4" />
        Anonimizar titular
      </SubmitButton>
    </form>
  );
}
