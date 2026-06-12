"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@milsaca/db/web/server";
import { getUser } from "@/lib/auth";
import { friendlyPostgresError } from "@/lib/postgres-error";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Server actions da Comunidade — compartilhadas pelos painéis corretora e
 * produtor. Cada form manda um hidden `base` (validado contra a allowlist)
 * pra action saber pra onde redirecionar; a revalidação cobre os DOIS
 * painéis, já que o conteúdo é o mesmo.
 *
 * Autorização fina (dono do post/comentário, usuário ativo) é da RLS —
 * aqui só validamos input e traduzimos erro.
 */

const BASES = [
  "/painel/corretora/comunidade",
  "/painel/produtor/comunidade",
] as const;

type Base = (typeof BASES)[number];

function safeBase(v: FormDataEntryValue | null): Base {
  const s = String(v ?? "");
  return (BASES as readonly string[]).includes(s)
    ? (s as Base)
    : "/painel/produtor/comunidade";
}

function revalidateComunidade() {
  for (const base of BASES) revalidatePath(base, "layout");
}

function cleanBody(v: FormDataEntryValue | null, max: number): string | null {
  const s = String(v ?? "").trim();
  if (!s || s.length > max) return null;
  return s;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type SocialFormState = { ok: boolean; error?: string } | null;

export async function createPost(
  _prev: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };

  const body = cleanBody(formData.get("body"), 2000);
  if (!body) {
    return { ok: false, error: "Escreva algo (até 2.000 caracteres) pra publicar." };
  }

  const supabase = await createClient();
  let imagePath: string | null = null;

  const file = formData.get("imagem");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) {
      return { ok: false, error: "Formato de imagem não suportado. Use JPG, PNG ou WebP." };
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return { ok: false, error: "Imagem grande demais. O limite é 5 MB." };
    }
    imagePath = `${user.id}/${randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("social")
      .upload(imagePath, file, { contentType: file.type });
    if (upErr) {
      (await getReqLogger()).error("social: upload de imagem falhou", {
        error: safeError(upErr),
      });
      return { ok: false, error: "Não deu pra enviar a imagem. Tente de novo." };
    }
  }

  const { error } = await supabase
    .from("social_posts")
    .insert({ author_id: user.id, body, image_path: imagePath });

  if (error) {
    (await getReqLogger()).error("social: insert de post falhou", {
      code: error.code,
      error: safeError(error),
    });
    if (imagePath) {
      await supabase.storage.from("social").remove([imagePath]);
    }
    return { ok: false, error: friendlyPostgresError(error) };
  }

  revalidateComunidade();
  return { ok: true };
}

export async function deletePost(formData: FormData) {
  const user = await getUser();
  const base = safeBase(formData.get("base"));
  if (!user) redirect("/entrar");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) redirect(base);

  const supabase = await createClient();

  // RLS garante que só o autor (ou admin) deleta; o select devolve o
  // image_path pra limpar o Storage depois.
  const { data, error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("image_path")
    .maybeSingle();

  if (error) {
    (await getReqLogger()).error("social: delete de post falhou", {
      code: error.code,
      error: safeError(error),
    });
    redirect(`${base}?error=${encodeURIComponent(friendlyPostgresError(error))}`);
  }

  if (data?.image_path) {
    await supabase.storage.from("social").remove([data.image_path]);
  }

  revalidateComunidade();
  redirect(`${base}?toast=${encodeURIComponent("Publicação removida.")}`);
}

/** Curtir/descurtir — chamada direto do client (LikeButton), sem redirect. */
export async function toggleLike(postId: string, curtir: boolean) {
  const user = await getUser();
  if (!user || !postId) return;

  const supabase = await createClient();
  if (curtir) {
    const { error } = await supabase
      .from("social_likes")
      .insert({ post_id: postId, user_id: user.id });
    // 23505 = já curtiu (duplo clique) — ignorável
    if (error && error.code !== "23505") {
      (await getReqLogger()).error("social: curtir falhou", {
        code: error.code,
        error: safeError(error),
      });
    }
  } else {
    const { error } = await supabase
      .from("social_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) {
      (await getReqLogger()).error("social: descurtir falhou", {
        code: error.code,
        error: safeError(error),
      });
    }
  }
  revalidateComunidade();
}

export async function createComment(
  _prev: SocialFormState,
  formData: FormData,
): Promise<SocialFormState> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };

  const postId = String(formData.get("post_id") ?? "");
  const body = cleanBody(formData.get("body"), 1000);
  if (!postId || !body) {
    return { ok: false, error: "Escreva um comentário (até 1.000 caracteres)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_comments")
    .insert({ post_id: postId, author_id: user.id, body });

  if (error) {
    (await getReqLogger()).error("social: comentário falhou", {
      code: error.code,
      error: safeError(error),
    });
    return { ok: false, error: friendlyPostgresError(error) };
  }

  revalidateComunidade();
  return { ok: true };
}

export async function deleteComment(formData: FormData) {
  const user = await getUser();
  const base = safeBase(formData.get("base"));
  if (!user) redirect("/entrar");

  const commentId = String(formData.get("comment_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  if (!commentId) redirect(base);

  const supabase = await createClient();
  // RLS: autor do comentário, autor do post ou admin.
  const { error } = await supabase
    .from("social_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    (await getReqLogger()).error("social: delete de comentário falhou", {
      code: error.code,
      error: safeError(error),
    });
  }

  revalidateComunidade();
  redirect(postId ? `${base}/post/${postId}` : base);
}

/** Seguir/deixar de seguir — chamada direto do client (FollowButton). */
export async function toggleFollow(perfilId: string, seguir: boolean) {
  const user = await getUser();
  if (!user || !perfilId || perfilId === user.id) return;

  const supabase = await createClient();
  if (seguir) {
    const { error } = await supabase
      .from("social_follows")
      .insert({ follower_id: user.id, followed_id: perfilId });
    if (error && error.code !== "23505") {
      (await getReqLogger()).error("social: seguir falhou", {
        code: error.code,
        error: safeError(error),
      });
    }
  } else {
    const { error } = await supabase
      .from("social_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", perfilId);
    if (error) {
      (await getReqLogger()).error("social: deixar de seguir falhou", {
        code: error.code,
        error: safeError(error),
      });
    }
  }
  revalidateComunidade();
}
