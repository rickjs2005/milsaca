"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import {
  CATEGORIA_LABEL,
  OWNER_KIND_LABEL,
  type DocumentoCategoria,
  type DocumentoOwnerKind,
} from "@/lib/documentos";
import type { VinculoOption } from "../_lib/queries";

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[];
const KINDS = Object.keys(OWNER_KIND_LABEL) as DocumentoOwnerKind[];

/**
 * Form de upload da corretora. Client component só pelo switch do vínculo
 * (o select de lote/contrato/produtor muda conforme o tipo escolhido).
 */
export function UploadDocumentoForm({
  action,
  back,
  lotes,
  contratos,
  produtores,
}: {
  action: (formData: FormData) => void | Promise<void>;
  back: string;
  lotes: VinculoOption[];
  contratos: VinculoOption[];
  produtores: VinculoOption[];
}) {
  const [kind, setKind] = useState<DocumentoOwnerKind>("lote");

  const options: Record<DocumentoOwnerKind, VinculoOption[]> = {
    lote: lotes,
    contrato: contratos,
    produtor: produtores,
    corretora: [],
  };

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="back" value={back} />

      <div className="space-y-1.5">
        <Label htmlFor="doc-owner-kind">Vincular a</Label>
        <Select
          id="doc-owner-kind"
          name="owner_kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as DocumentoOwnerKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {OWNER_KIND_LABEL[k]}
            </option>
          ))}
        </Select>
      </div>

      {kind !== "corretora" ? (
        <div className="space-y-1.5">
          <Label htmlFor="doc-owner-id">{OWNER_KIND_LABEL[kind]}</Label>
          <Select id="doc-owner-id" name="owner_id" defaultValue="" required>
            <option value="" disabled>
              Selecione…
            </option>
            {options[kind].map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="doc-titulo">Título</Label>
        <Input
          id="doc-titulo"
          name="titulo"
          maxLength={160}
          required
          placeholder="Ex.: CAR — Sítio Boa Vista"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doc-categoria">Categoria</Label>
        <Select id="doc-categoria" name="categoria" defaultValue="outro">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doc-valido-ate">Válido até (opcional)</Label>
        <Input id="doc-valido-ate" name="valido_ate" type="date" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doc-arquivo">Arquivo (PDF ou imagem, até 10MB)</Label>
        <Input
          id="doc-arquivo"
          name="arquivo"
          type="file"
          accept="application/pdf,image/*"
          required
        />
      </div>

      <div className="sm:col-span-2">
        <SubmitButton variant="primary" pendingLabel="Enviando…">
          Enviar documento
        </SubmitButton>
      </div>
    </form>
  );
}
