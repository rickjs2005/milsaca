import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  CATEGORIA_LABEL,
  formatBytes,
  statusValidade,
} from "@/lib/documentos";
import type { DocumentoRow } from "../_lib/queries";

const DATA_BR = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  return DATA_BR.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));
}

function ValidadeBadge({ validoAte }: { validoAte: string | null }) {
  const status = statusValidade(validoAte);
  if (status === "sem_validade")
    return <span className="text-caption text-neutral-400">sem validade</span>;
  if (status === "vencido")
    return (
      <Badge className="border-danger-100 bg-danger-50 text-danger-700">
        Vencido em {fmtData(validoAte)}
      </Badge>
    );
  if (status === "vence_em_breve")
    return (
      <Badge className="border-warning-100 bg-warning-50 text-warning-700">
        Vence em {fmtData(validoAte)}
      </Badge>
    );
  return (
    <Badge className="border-success-100 bg-success-50 text-success-700">
      Válido até {fmtData(validoAte)}
    </Badge>
  );
}

export type DocumentoListItem = DocumentoRow & { vinculo_label?: string };

/**
 * Lista genérica de documentos (server component). As actions chegam por
 * props para servir aos dois painéis (corretora e produtor) — quem pode
 * remover é decidido pelo chamador (e no fim das contas pela RLS).
 */
export function DocumentosList({
  docs,
  back,
  baixarAction,
  excluirAction,
  showVinculo = false,
}: {
  docs: DocumentoListItem[];
  /** Path interno pra voltar após a action (?saved/?error). */
  back: string;
  baixarAction: (formData: FormData) => void | Promise<void>;
  /** Sem action de excluir = lista somente leitura. */
  excluirAction?: (formData: FormData) => void | Promise<void>;
  showVinculo?: boolean;
}) {
  if (docs.length === 0) {
    return (
      <p className="py-6 text-center text-body-sm text-neutral-500">
        Nenhum documento por aqui ainda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-milsaca-cream-escuro">
      {docs.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
        >
          <FileText className="h-4 w-4 shrink-0 text-milsaca-verde-claro" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-milsaca-preto">
              {doc.titulo}
              {doc.versao > 1 ? (
                <span className="ml-2 text-caption text-neutral-500">
                  v{doc.versao}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-neutral-500">
              <span>{CATEGORIA_LABEL[doc.categoria]}</span>
              {showVinculo && doc.vinculo_label ? (
                <span>· {doc.vinculo_label}</span>
              ) : null}
              <span>· {formatBytes(doc.tamanho_bytes)}</span>
              <span>· {fmtData(doc.created_at)}</span>
            </p>
          </div>
          <ValidadeBadge validoAte={doc.valido_ate} />
          <div className="flex items-center gap-2">
            <form action={baixarAction}>
              <input type="hidden" name="id" value={doc.id} />
              <input type="hidden" name="back" value={back} />
              <SubmitButton variant="outline" size="sm" pendingLabel="Abrindo…">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Abrir
              </SubmitButton>
            </form>
            {excluirAction ? (
              <form action={excluirAction}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="back" value={back} />
                <ConfirmSubmit
                  variant="ghost"
                  size="sm"
                  confirmTitle="Remover documento"
                  confirmMessage={
                    <>
                      Remover <strong>{doc.titulo}</strong>? Ele sai da
                      listagem, mas permanece no histórico de auditoria.
                    </>
                  }
                  confirmButtonLabel="Remover"
                  confirmButtonVariant="destructive"
                  pendingLabel="Removendo…"
                >
                  Remover
                </ConfirmSubmit>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
