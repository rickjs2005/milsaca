import "server-only";

import { createClient } from "@milsaca/db/web/server";
import type { Database } from "@milsaca/types/database";
import { safeError } from "@/lib/logger";
import { getReqLogger } from "@/lib/req-logger";

/**
 * Queries da Comunidade (rede social interna).
 *
 * Compartilhadas pelos dois painéis (corretora e produtor) — as rotas são
 * wrappers finos em /painel/{papel}/comunidade que delegam pros componentes
 * de página em @/components/social/pages.
 *
 * Perfis vêm da view `social_perfis` (security definer), que expõe SÓ os
 * campos públicos de perfis ativos — a RLS de `profiles` é restrita demais
 * pra uma rede social.
 */

export const FEED_PAGE_SIZE = 10;
export const PERFIS_LIMIT = 30;

type PostRow = Database["public"]["Tables"]["social_posts"]["Row"];
type PerfilRow = Database["public"]["Views"]["social_perfis"]["Row"];

export type SocialPerfil = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  /** Rótulo do papel pra UI ("Produtor", "Corretora", "Produtor · Corretora"). */
  papel: string;
  corretoraNome: string | null;
  desde: string | null;
};

export type SocialPost = {
  id: string;
  autor: SocialPerfil;
  body: string;
  imageUrl: string | null;
  imagePath: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  isMine: boolean;
  createdAt: string;
};

export type SocialComment = {
  id: string;
  postId: string;
  autor: SocialPerfil;
  body: string;
  createdAt: string;
  /** Viewer pode apagar (autor do comentário ou autor do post). */
  canDelete: boolean;
};

export type FeedTab = "todos" | "seguindo";

const PERFIL_DESCONHECIDO: Omit<SocialPerfil, "id"> = {
  nome: "Usuário",
  avatarUrl: null,
  papel: "",
  corretoraNome: null,
  desde: null,
};

function papelLabel(roles: PerfilRow["roles"]): string {
  const r = roles ?? [];
  const parts: string[] = [];
  if (r.includes("produtor")) parts.push("Produtor");
  if (r.includes("corretora")) parts.push("Corretora");
  if (r.includes("admin") && parts.length === 0) parts.push("Milsaca");
  return parts.join(" · ");
}

function perfilFromRow(row: PerfilRow): SocialPerfil {
  return {
    id: row.id ?? "",
    nome: row.full_name?.trim() || "Usuário",
    avatarUrl: row.avatar_url,
    papel: papelLabel(row.roles),
    corretoraNome: row.corretora_nome,
    desde: row.created_at,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Erro de leitura não pode virar "lista vazia" silenciosa — loga e segue
 * com o fallback (o padrão de observabilidade do projeto).
 */
async function logQueryError(scope: string, error: unknown) {
  if (!error) return;
  (await getReqLogger()).error(`social: ${scope} falhou`, {
    error: safeError(error),
  });
}

/** URL pública da imagem do post (bucket `social` é público pra leitura). */
function publicImageUrl(supabase: Supabase, path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("social").getPublicUrl(path).data.publicUrl;
}

async function fetchPerfis(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, SocialPerfil>> {
  const map = new Map<string, SocialPerfil>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("social_perfis")
    .select("id, full_name, avatar_url, roles, corretora_id, corretora_nome, created_at")
    .in("id", ids);
  for (const row of data ?? []) {
    if (row.id) map.set(row.id, perfilFromRow(row));
  }
  return map;
}

async function hydratePosts(
  supabase: Supabase,
  viewerId: string,
  rows: PostRow[],
): Promise<SocialPost[]> {
  if (rows.length === 0) return [];
  const autorIds = [...new Set(rows.map((r) => r.author_id))];
  const postIds = rows.map((r) => r.id);

  const [perfis, { data: minhasCurtidas }] = await Promise.all([
    fetchPerfis(supabase, autorIds),
    supabase
      .from("social_likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .in("post_id", postIds),
  ]);
  const curtidos = new Set((minhasCurtidas ?? []).map((l) => l.post_id));

  return rows.map((r) => ({
    id: r.id,
    autor: perfis.get(r.author_id) ?? { id: r.author_id, ...PERFIL_DESCONHECIDO },
    body: r.body,
    imageUrl: publicImageUrl(supabase, r.image_path),
    imagePath: r.image_path,
    likesCount: r.likes_count,
    commentsCount: r.comments_count,
    likedByMe: curtidos.has(r.id),
    isMine: r.author_id === viewerId,
    createdAt: r.created_at,
  }));
}

export async function listFeed(
  viewerId: string,
  opts: { tab?: FeedTab; page?: number; autorId?: string } = {},
): Promise<{ rows: SocialPost[]; count: number }> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * FEED_PAGE_SIZE;

  let q = supabase
    .from("social_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + FEED_PAGE_SIZE - 1);

  if (opts.autorId) q = q.eq("author_id", opts.autorId);

  if (opts.tab === "seguindo") {
    const { data: seguindo } = await supabase
      .from("social_follows")
      .select("followed_id")
      .eq("follower_id", viewerId);
    const ids = (seguindo ?? []).map((f) => f.followed_id);
    if (ids.length === 0) return { rows: [], count: 0 };
    q = q.in("author_id", ids);
  }

  const { data, count, error } = await q;
  await logQueryError("listFeed", error);
  const rows = await hydratePosts(supabase, viewerId, data ?? []);
  return { rows, count: count ?? 0 };
}

export async function getPost(
  viewerId: string,
  postId: string,
): Promise<SocialPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (!data) return null;
  const [post] = await hydratePosts(supabase, viewerId, [data]);
  return post ?? null;
}

export async function listComments(
  viewerId: string,
  postId: string,
  postAuthorId: string,
): Promise<SocialComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);
  await logQueryError("listComments", error);
  const rows = data ?? [];
  const perfis = await fetchPerfis(supabase, [...new Set(rows.map((r) => r.author_id))]);
  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    autor: perfis.get(r.author_id) ?? { id: r.author_id, ...PERFIL_DESCONHECIDO },
    body: r.body,
    createdAt: r.created_at,
    canDelete: r.author_id === viewerId || postAuthorId === viewerId,
  }));
}

export async function getPerfil(perfilId: string): Promise<SocialPerfil | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_perfis")
    .select("id, full_name, avatar_url, roles, corretora_id, corretora_nome, created_at")
    .eq("id", perfilId)
    .maybeSingle();
  return data ? perfilFromRow(data) : null;
}

export type PerfilStats = {
  posts: number;
  seguidores: number;
  seguindo: number;
};

export async function getPerfilStats(perfilId: string): Promise<PerfilStats> {
  const supabase = await createClient();
  const [posts, seguidores, seguindo] = await Promise.all([
    supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", perfilId),
    supabase
      .from("social_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followed_id", perfilId),
    supabase
      .from("social_follows")
      .select("followed_id", { count: "exact", head: true })
      .eq("follower_id", perfilId),
  ]);
  return {
    posts: posts.count ?? 0,
    seguidores: seguidores.count ?? 0,
    seguindo: seguindo.count ?? 0,
  };
}

export async function isSeguindo(
  viewerId: string,
  perfilId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_follows")
    .select("followed_id")
    .eq("follower_id", viewerId)
    .eq("followed_id", perfilId)
    .maybeSingle();
  return Boolean(data);
}

export type PerfilComSeguindo = SocialPerfil & { euSigo: boolean };

/**
 * Busca de perfis por nome (case-insensitive). Sem termo, lista os perfis
 * mais recentes — serve de diretório pra descobrir quem está na Comunidade.
 */
export async function searchPerfis(
  viewerId: string,
  termo: string,
): Promise<PerfilComSeguindo[]> {
  const supabase = await createClient();
  let q = supabase
    .from("social_perfis")
    .select("id, full_name, avatar_url, roles, corretora_id, corretora_nome, created_at")
    .limit(PERFIS_LIMIT);

  const t = termo.trim().replace(/[%_]/g, "\\$&");
  if (t) {
    q = q.ilike("full_name", `%${t}%`).order("full_name", { ascending: true });
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error } = await q;
  await logQueryError("searchPerfis", error);
  const rows = (data ?? []).filter((r) => r.id);

  const ids = rows.map((r) => r.id as string);
  let sigo = new Set<string>();
  if (ids.length > 0) {
    const { data: follows } = await supabase
      .from("social_follows")
      .select("followed_id")
      .eq("follower_id", viewerId)
      .in("followed_id", ids);
    sigo = new Set((follows ?? []).map((f) => f.followed_id));
  }

  return rows.map((r) => ({
    ...perfilFromRow(r),
    euSigo: sigo.has(r.id as string),
  }));
}
