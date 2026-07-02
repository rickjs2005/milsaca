import { Paperclip } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import {
  CATEGORIA_LABEL,
  type DocumentoCategoria,
  type DocumentoOwnerKind,
} from "@/lib/documentos";
import { listDocumentosDoOwner } from "../_lib/queries";
import {
  baixarDocumento,
  excluirDocumento,
  uploadDocumento,
} from "../_actions";
import { DocumentosList } from "./documentos-list";

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[];

/**
 * Seção "Documentos" embutível nas páginas de detalhe (lote, contrato).
 * Server component: lista + form de anexo com o vínculo já fixado.
 */
export async function DocumentosSection({
  ownerKind,
  ownerId,
  back,
}: {
  ownerKind: Exclude<DocumentoOwnerKind, "corretora">;
  ownerId: string;
  /** Path da página que embute (pra voltar com ?saved/?error). */
  back: string;
}) {
  const docs = await listDocumentosDoOwner(ownerKind, ownerId);

  return (
    <Card className="border-milsaca-cream-escuro">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-milsaca-verde-claro" />
          Documentos
        </CardTitle>
        <CardDescription>
          CAR, certificados, notas e anexos deste{" "}
          {ownerKind === "lote" ? "lote" : "contrato"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DocumentosList
          docs={docs}
          back={back}
          baixarAction={baixarDocumento}
          excluirAction={excluirDocumento}
        />

        <details className="rounded-md border border-milsaca-cream-escuro p-3">
          <summary className="cursor-pointer text-body-sm font-medium text-milsaca-verde">
            Anexar documento
          </summary>
          <form action={uploadDocumento} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="back" value={back} />
            <input type="hidden" name="owner_kind" value={ownerKind} />
            <input type="hidden" name="owner_id" value={ownerId} />

            <div className="space-y-1.5">
              <Label htmlFor={`doc-titulo-${ownerId}`}>Título</Label>
              <Input
                id={`doc-titulo-${ownerId}`}
                name="titulo"
                maxLength={160}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`doc-categoria-${ownerId}`}>Categoria</Label>
              <Select
                id={`doc-categoria-${ownerId}`}
                name="categoria"
                defaultValue="outro"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`doc-valido-${ownerId}`}>
                Válido até (opcional)
              </Label>
              <Input id={`doc-valido-${ownerId}`} name="valido_ate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`doc-arquivo-${ownerId}`}>
                Arquivo (PDF ou imagem, até 10MB)
              </Label>
              <Input
                id={`doc-arquivo-${ownerId}`}
                name="arquivo"
                type="file"
                accept="application/pdf,image/*"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton variant="primary" pendingLabel="Enviando…">
                Enviar
              </SubmitButton>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
