"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";
import { getProfile } from "@/lib/auth";
import {
  CATEGORIAS_PRODUTOR,
  extensaoDocumento,
  validarArquivoDocumento,
  type DocumentoCategoria,
} from "@/lib/documentos";
import { getProdutorByProfileId } from "../_lib/produtor";

const MEUS_DOCS = "/painel/produtor/documentos";

function fail(msg: string): never {
  redirect(`${MEUS_DOCS}?error=${encodeURIComponent(msg)}`);
}

function ok(msg: string): never {
  redirect(`${MEUS_DOCS}?saved=${encodeURIComponent(msg)}`);
}

async function ensureProdutor() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const produtor = await getProdutorByProfileId(profile.id);
  if (!produtor) redirect("/painel/produtor");
  return { profile, produtor };
}

/**
 * Produtor sobe documento próprio (CAR, ITR, certificado...). Fica na pasta
 * dele no Storage ({profile_id}/...) e SEM corretora_id — as corretoras
 * relacionadas (lead/contrato) enxergam via RLS. É a base do mutirão EUDR.
 */
export async function uploadMeuDocumento(formData: FormData) {
  const { profile, produtor } = await ensureProdutor();

  const categoria = String(formData.get("categoria") ?? "") as DocumentoCategoria;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const validoAte = String(formData.get("valido_ate") ?? "").trim() || null;
  const arquivo = formData.get("arquivo");

  if (!CATEGORIAS_PRODUTOR.includes(categoria)) fail("Categoria inválida.");
  if (!titulo || titulo.length > 160)
    fail("Informe um título (até 160 caracteres).");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    fail("Selecione o arquivo do documento.");
  const arquivoErro = validarArquivoDocumento(arquivo as File);
  if (arquivoErro) fail(arquivoErro);

  const file = arquivo as File;
  const ext = extensaoDocumento(file);
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("documentos")
    .insert({
      corretora_id: null,
      owner_kind: "produtor",
      owner_id: produtor.id,
      categoria,
      titulo,
      valido_ate: validoAte,
      mime_type: file.type,
      tamanho_bytes: file.size,
      uploaded_by: profile.id,
      storage_path: `pending/${crypto.randomUUID()}`,
    })
    .select("id")
    .single();

  if (error || !doc) {
    const log = await getReqLogger({ action: "uploadMeuDocumento" });
    log.error("documento_produtor_insert_falhou", {
      code: error?.code,
      err: error ? safeError(error) : { message: "insert sem retorno" },
    });
    fail(friendlyPostgresError(error));
  }

  // Pasta do produtor = profile_id (policy documentos_produtor_* do bucket).
  const path = `${profile.id}/${doc.id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    await supabase.from("documentos").delete().eq("id", doc.id);
    const log = await getReqLogger({
      action: "uploadMeuDocumento",
      documentoId: doc.id,
    });
    log.error("documento_produtor_upload_falhou", { err: safeError(uploadError) });
    fail("Não foi possível enviar o arquivo. Tente novamente.");
  }

  await supabase.from("documentos").update({ storage_path: path }).eq("id", doc.id);

  revalidatePath(MEUS_DOCS);
  ok("Documento enviado.");
}

/** Soft-delete de um documento que o PRÓPRIO produtor subiu. */
export async function excluirMeuDocumento(formData: FormData) {
  const { profile } = await ensureProdutor();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Documento inválido.");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("documentos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("uploaded_by", profile.id)
    .is("deleted_at", null)
    .select("id");

  if (error) fail(friendlyPostgresError(error));
  if (!updated || updated.length === 0)
    fail("Documento não encontrado ou já removido.");

  revalidatePath(MEUS_DOCS);
  ok("Documento removido.");
}

/** Abre o arquivo via signed URL — RLS do Storage decide (docs dele + contratos). */
export async function baixarMeuDocumento(formData: FormData) {
  await ensureProdutor();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) fail("Documento inválido.");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) fail("Documento não encontrado.");

  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.storage_path, 60 * 5);
  if (error || !data) fail("Não foi possível abrir o arquivo.");

  redirect(data.signedUrl);
}
