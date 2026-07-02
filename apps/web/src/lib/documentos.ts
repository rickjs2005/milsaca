// Helpers puros da gestão documental (F1) — compartilhados entre o painel
// da corretora e o do produtor. Sem Supabase aqui: só labels e validação.

import type { Database } from "@milsaca/types/database";

export type DocumentoCategoria =
  Database["public"]["Enums"]["documento_categoria"];
export type DocumentoOwnerKind =
  Database["public"]["Enums"]["documento_owner_kind"];

export const CATEGORIA_LABEL: Record<DocumentoCategoria, string> = {
  car: "CAR",
  itr: "ITR",
  procuracao: "Procuração",
  certificado: "Certificado",
  nota_fiscal: "Nota fiscal",
  contrato_assinado: "Contrato assinado",
  dossie_eudr: "Dossiê EUDR",
  outro: "Outro",
};

/**
 * Categorias disponíveis pra upload MANUAL. `dossie_eudr` fica de fora:
 * é gerado pelo sistema (PDF do lote), não anexado à mão.
 */
export const CATEGORIAS_UPLOAD = (
  Object.keys(CATEGORIA_LABEL) as DocumentoCategoria[]
).filter((c) => c !== "dossie_eudr");

export const OWNER_KIND_LABEL: Record<DocumentoOwnerKind, string> = {
  produtor: "Produtor",
  lote: "Lote",
  contrato: "Contrato",
  corretora: "Corretora",
};

/** Categorias que o PRODUTOR pode subir em "Meus documentos". */
export const CATEGORIAS_PRODUTOR: DocumentoCategoria[] = [
  "car",
  "itr",
  "certificado",
  "procuracao",
  "outro",
];

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Valida o arquivo (MIME allowlist + tamanho). PDF e imagem cobrem CAR,
 * ITR, certificados e notas digitalizadas — não aceitamos executável/zip.
 */
export function validarArquivoDocumento(file: File): string | null {
  const tipoOk =
    file.type.startsWith("image/") || file.type === "application/pdf";
  if (!tipoOk) return "O documento precisa ser uma imagem ou PDF.";
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > MAX_DOC_BYTES)
    return "O documento deve ter no máximo 10MB.";
  return null;
}

/** Extensão segura derivada do arquivo (mesma regra do upload de comprovantes). */
export function extensaoDocumento(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  return (
    (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (file.type.split("/")[1] ?? "bin")
  );
}

export type ValidadeStatus = "sem_validade" | "ok" | "vence_em_breve" | "vencido";

/** Status de validade: "vence_em_breve" = próximos 30 dias. */
export function statusValidade(validoAte: string | null): ValidadeStatus {
  if (!validoAte) return "sem_validade";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(`${validoAte}T00:00:00`);
  if (limite < hoje) return "vencido";
  const em30 = new Date(hoje);
  em30.setDate(em30.getDate() + 30);
  if (limite <= em30) return "vence_em_breve";
  return "ok";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
