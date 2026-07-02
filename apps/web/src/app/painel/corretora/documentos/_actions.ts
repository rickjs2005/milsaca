"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import type { Json } from "@milsaca/types/database";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import {
  extensaoDocumento,
  validarArquivoDocumento,
  type DocumentoCategoria,
  type DocumentoOwnerKind,
} from "@/lib/documentos";
import { uuidSchema } from "../_lib/schemas";
import { ensureCorretora, requireActiveSubscription } from "../_lib/corretora";

const DOCUMENTOS = "/painel/corretora/documentos";

const OWNER_KINDS: DocumentoOwnerKind[] = [
  "produtor",
  "lote",
  "contrato",
  "corretora",
];
const CATEGORIAS: DocumentoCategoria[] = [
  "car",
  "itr",
  "procuracao",
  "certificado",
  "nota_fiscal",
  "contrato_assinado",
  "outro",
];

// Auditoria best-effort (mesmo padrão de contratos/_actions.ts): a RPC
// log_audit carimba actor/corretora server-side e nunca derruba a mutação.
async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.rpc("log_audit", {
      p_action: action,
      p_entity: "documento",
      p_entity_id: entityId,
      p_payload: payload as Json,
    });
  } catch (e) {
    const log = await getReqLogger({ action });
    log.warn("log_audit_falhou", { err: safeError(e) });
  }
}

// back = página que originou (lista central ou detalhe de lote/contrato).
// Só aceitamos paths internos do painel pra não virar open redirect.
function safeBack(formData: FormData): string {
  const raw = String(formData.get("back") ?? "").trim();
  return raw.startsWith("/painel/") ? raw : DOCUMENTOS;
}

function backWith(back: string, key: "error" | "saved", msg: string): never {
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}${key}=${encodeURIComponent(msg)}`);
}

function revalidateAffected(back: string) {
  revalidatePath(DOCUMENTOS);
  if (back !== DOCUMENTOS) revalidatePath(back);
}

/**
 * Sobe um documento e vincula a produtor/lote/contrato/corretora.
 * Ordem: valida → INSERT (RLS valida o vínculo com o tenant) → upload.
 * Se o upload falhar, remove a linha (não fica registro sem arquivo).
 */
export async function uploadDocumento(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(profile.corretora_id, DOCUMENTOS);
  const back = safeBack(formData);

  const ownerKind = String(formData.get("owner_kind") ?? "") as DocumentoOwnerKind;
  const categoria = String(formData.get("categoria") ?? "") as DocumentoCategoria;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const validoAte = String(formData.get("valido_ate") ?? "").trim() || null;
  const arquivo = formData.get("arquivo");

  if (!OWNER_KINDS.includes(ownerKind)) backWith(back, "error", "Vínculo inválido.");
  if (!CATEGORIAS.includes(categoria)) backWith(back, "error", "Categoria inválida.");
  if (!titulo || titulo.length > 160)
    backWith(back, "error", "Informe um título (até 160 caracteres).");

  // owner_id: pra vínculo "corretora" é o próprio tenant; senão vem do form.
  let ownerId = profile.corretora_id;
  if (ownerKind !== "corretora") {
    const parsed = uuidSchema.safeParse(String(formData.get("owner_id") ?? "").trim());
    if (!parsed.success)
      backWith(back, "error", "Selecione o vínculo do documento.");
    ownerId = parsed.data!;
  }

  if (!(arquivo instanceof File) || arquivo.size === 0)
    backWith(back, "error", "Selecione o arquivo do documento.");
  const arquivoErro = validarArquivoDocumento(arquivo as File);
  if (arquivoErro) backWith(back, "error", arquivoErro);

  const file = arquivo as File;
  const ext = extensaoDocumento(file);
  const supabase = await createClient();

  // INSERT primeiro: o with check da RLS garante que o owner pertence ao
  // tenant (lote/contrato da corretora, produtor relacionado). storage_path
  // é determinístico: {corretora_id}/{documento_id}.{ext}.
  const { data: doc, error } = await supabase
    .from("documentos")
    .insert({
      corretora_id: profile.corretora_id,
      owner_kind: ownerKind,
      owner_id: ownerId,
      categoria,
      titulo,
      valido_ate: validoAte,
      mime_type: file.type,
      tamanho_bytes: file.size,
      uploaded_by: profile.id,
      // placeholder trocado logo abaixo (precisa do id gerado); unique ok.
      storage_path: `pending/${crypto.randomUUID()}`,
    })
    .select("id")
    .single();

  if (error || !doc) {
    const log = await getReqLogger({
      action: "uploadDocumento",
      corretoraId: profile.corretora_id,
    });
    log.error("documento_insert_falhou", {
      code: error?.code,
      err: error ? safeError(error) : { message: "insert sem retorno" },
    });
    backWith(back, "error", friendlyPostgresError(error));
  }

  const path = `${profile.corretora_id}/${doc.id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    // Sem arquivo não fica registro: rollback best-effort da linha.
    await supabase.from("documentos").delete().eq("id", doc.id);
    const log = await getReqLogger({
      action: "uploadDocumento",
      corretoraId: profile.corretora_id,
      documentoId: doc.id,
    });
    log.error("documento_upload_falhou", { err: safeError(uploadError) });
    backWith(back, "error", "Não foi possível enviar o arquivo. Tente novamente.");
  }

  const { error: pathError } = await supabase
    .from("documentos")
    .update({ storage_path: path })
    .eq("id", doc.id);
  if (pathError) {
    const log = await getReqLogger({
      action: "uploadDocumento",
      corretoraId: profile.corretora_id,
      documentoId: doc.id,
    });
    log.error("documento_path_update_falhou", { err: safeError(pathError) });
    backWith(back, "error", friendlyPostgresError(pathError));
  }

  await logAudit(supabase, "documento.upload", doc.id, {
    owner_kind: ownerKind,
    owner_id: ownerId,
    categoria,
    titulo,
  });

  revalidateAffected(back);
  backWith(back, "saved", "Documento enviado.");
}

/**
 * Nova versão: nova linha encadeada (versao+1) com novo arquivo. A versão
 * anterior fica no histórico (soft-delete) — nunca sobrescrevemos arquivo.
 */
export async function novaVersaoDocumento(formData: FormData) {
  const profile = await ensureCorretora();
  await requireActiveSubscription(profile.corretora_id, DOCUMENTOS);
  const back = safeBack(formData);

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) backWith(back, "error", "Documento inválido.");
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    backWith(back, "error", "Selecione o novo arquivo.");
  const arquivoErro = validarArquivoDocumento(arquivo as File);
  if (arquivoErro) backWith(back, "error", arquivoErro);

  const supabase = await createClient();
  const { data: anterior } = await supabase
    .from("documentos")
    .select("*")
    .eq("id", idParsed.data!)
    .eq("corretora_id", profile.corretora_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!anterior) backWith(back, "error", "Documento não encontrado.");

  const file = arquivo as File;
  const ext = extensaoDocumento(file);

  const { data: novo, error } = await supabase
    .from("documentos")
    .insert({
      corretora_id: anterior.corretora_id,
      owner_kind: anterior.owner_kind,
      owner_id: anterior.owner_id,
      categoria: anterior.categoria,
      titulo: anterior.titulo,
      valido_ate: String(formData.get("valido_ate") ?? "").trim() || anterior.valido_ate,
      mime_type: file.type,
      tamanho_bytes: file.size,
      uploaded_by: profile.id,
      versao: anterior.versao + 1,
      substitui_documento_id: anterior.id,
      storage_path: `pending/${crypto.randomUUID()}`,
    })
    .select("id")
    .single();
  if (error || !novo) backWith(back, "error", friendlyPostgresError(error));

  const path = `${profile.corretora_id}/${novo.id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) {
    await supabase.from("documentos").delete().eq("id", novo.id);
    backWith(back, "error", "Não foi possível enviar o arquivo. Tente novamente.");
  }
  await supabase.from("documentos").update({ storage_path: path }).eq("id", novo.id);

  // Versão anterior sai da listagem (soft-delete), mas segue no histórico.
  await supabase
    .from("documentos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", anterior.id)
    .eq("corretora_id", profile.corretora_id);

  await logAudit(supabase, "documento.nova_versao", novo.id, {
    substitui: anterior.id,
    versao: anterior.versao + 1,
  });

  revalidateAffected(back);
  backWith(back, "saved", `Nova versão (v${anterior.versao + 1}) enviada.`);
}

/** Soft-delete (deleted_at) — o arquivo e o histórico permanecem. */
export async function excluirDocumento(formData: FormData) {
  const profile = await ensureCorretora();
  const back = safeBack(formData);

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) backWith(back, "error", "Documento inválido.");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("documentos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", idParsed.data!)
    .eq("corretora_id", profile.corretora_id)
    .is("deleted_at", null)
    .select("id");

  if (error) backWith(back, "error", friendlyPostgresError(error));
  if (!updated || updated.length === 0)
    backWith(back, "error", "Documento não encontrado ou já removido.");

  await logAudit(supabase, "documento.excluir", idParsed.data!, {});

  revalidateAffected(back);
  backWith(back, "saved", "Documento removido.");
}

/** Abre o arquivo via signed URL (5 min). RLS do Storage decide o acesso. */
export async function baixarDocumento(formData: FormData) {
  await ensureCorretora();
  const back = safeBack(formData);

  const idParsed = uuidSchema.safeParse(String(formData.get("id") ?? "").trim());
  if (!idParsed.success) backWith(back, "error", "Documento inválido.");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", idParsed.data!)
    .maybeSingle();
  if (!doc) backWith(back, "error", "Documento não encontrado.");

  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.storage_path, 60 * 5);
  if (error || !data) backWith(back, "error", "Não foi possível abrir o arquivo.");

  redirect(data.signedUrl);
}
