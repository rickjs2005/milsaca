"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "produtor" | "corretora";

type Defaults = {
  email: string;
  full_name: string;
  corretora_name: string;
  corretora_city: string;
};

export function CadastroForm({
  action,
  initialRole,
  defaults,
  error,
}: {
  action: (formData: FormData) => void;
  initialRole: Role;
  defaults: Defaults;
  error: string | null;
}) {
  const [role, setRole] = useState<Role>(initialRole);

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-wide text-milsaca-verde-claro">
          Você é
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            value="produtor"
            currentValue={role}
            onSelect={setRole}
            title="Produtor"
            desc="Tenho café pra vender"
          />
          <RoleOption
            value="corretora"
            currentValue={role}
            onSelect={setRole}
            title="Corretora"
            desc="Opero negócios de café"
          />
        </div>
        <input type="hidden" name="role" value={role} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="full_name">Seu nome completo</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          defaultValue={defaults.full_name}
          placeholder="João da Silva"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaults.email}
          placeholder="voce@exemplo.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="Repita a senha"
        />
      </div>

      {role === "corretora" ? (
        <div className="space-y-4 rounded-md border border-milsaca-dourado/30 bg-milsaca-dourado/5 p-4">
          <p className="text-xs text-milsaca-verde">
            Dados da corretora — admin valida antes de liberar acesso.
          </p>

          <div className="space-y-2">
            <Label htmlFor="corretora_name">Nome da corretora</Label>
            <Input
              id="corretora_name"
              name="corretora_name"
              type="text"
              required
              defaultValue={defaults.corretora_name}
              placeholder="Café & Cia Corretagem"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="corretora_cnpj">CNPJ</Label>
            <Input
              id="corretora_cnpj"
              name="corretora_cnpj"
              type="text"
              required
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="corretora_city">Cidade</Label>
            <Input
              id="corretora_city"
              name="corretora_city"
              type="text"
              required
              defaultValue={defaults.corretora_city}
              placeholder="Manhuaçu/MG"
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        className="w-full bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
      >
        {role === "corretora" ? "Enviar pra aprovação" : "Criar conta"}
      </Button>
    </form>
  );
}

function RoleOption({
  value,
  currentValue,
  onSelect,
  title,
  desc,
}: {
  value: Role;
  currentValue: Role;
  onSelect: (v: Role) => void;
  title: string;
  desc: string;
}) {
  const selected = value === currentValue;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={
        selected
          ? "rounded-xl border-2 border-milsaca-verde bg-milsaca-verde/5 px-3 py-3 text-left transition-colors"
          : "rounded-xl border border-milsaca-cream-escuro bg-white px-3 py-3 text-left transition-colors hover:border-milsaca-dourado"
      }
    >
      <p className="text-sm font-semibold text-milsaca-verde">{title}</p>
      <p className="mt-0.5 text-xs text-milsaca-verde-claro">{desc}</p>
    </button>
  );
}
