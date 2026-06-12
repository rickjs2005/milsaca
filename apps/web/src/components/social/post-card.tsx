import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Mic, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { timeAgo } from "@/lib/format";
import { deletePost } from "@/lib/social/actions";
import type { SocialPost } from "@/lib/social/queries";
import { SocialAvatar } from "./avatar";
import { LikeButton } from "./like-button";

/**
 * Card de publicação do feed. Server component — a interação fica nas
 * ilhas client (LikeButton, ConfirmSubmit).
 *
 * `detalhe` = página do post (sem link "ver comentários" no rodapé).
 */
export function PostCard({
  post,
  base,
  detalhe = false,
}: {
  post: SocialPost;
  base: string;
  detalhe?: boolean;
}) {
  const perfilHref = `${base}/perfil/${post.autor.id}`;
  const postHref = `${base}/post/${post.id}`;

  return (
    <Card>
      <CardContent className="space-y-3 p-card pt-card">
        {/* Autor */}
        <div className="flex items-start gap-3">
          <Link href={perfilHref} className="shrink-0">
            <SocialAvatar nome={post.autor.nome} avatarUrl={post.autor.avatarUrl} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Link
                href={perfilHref}
                className="truncate text-body-sm font-semibold text-milsaca-cafezal hover:underline"
              >
                {post.autor.nome}
              </Link>
              {post.autor.papel ? (
                <span className="rounded-pill bg-milsaca-cream px-2 py-0.5 text-caption text-neutral-600">
                  {post.autor.papel}
                </span>
              ) : null}
            </div>
            <p className="text-caption text-neutral-500">
              {post.autor.corretoraNome ? `${post.autor.corretoraNome} · ` : ""}
              {timeAgo(post.createdAt)}
            </p>
          </div>
          {post.isMine ? (
            <form action={deletePost}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="base" value={base} />
              <ConfirmSubmit
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-danger-600"
                confirmTitle="Remover publicação?"
                confirmMessage="A publicação, as curtidas e os comentários dela somem pra todo mundo. Não dá pra desfazer."
                confirmButtonLabel="Remover"
                pendingLabel="Removendo..."
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                <span className="sr-only">Remover publicação</span>
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>

        {/* Conteúdo (texto é opcional — post pode ser só áudio/foto/vídeo) */}
        {post.body ? (
          <p className="whitespace-pre-wrap break-words text-body text-milsaca-preto">
            {post.body}
          </p>
        ) : null}

        {post.audioUrl ? (
          <div className="flex items-center gap-2 rounded-md bg-milsaca-cream/60 p-2">
            <Mic aria-hidden className="h-4 w-4 shrink-0 text-milsaca-dourado" />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- áudio do usuário */}
            <audio
              src={post.audioUrl}
              controls
              preload="metadata"
              className="h-10 min-w-0 flex-1"
            />
          </div>
        ) : null}

        {post.imageUrl ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-neutral-100">
            <Image
              src={post.imageUrl}
              alt="Foto da publicação"
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        {post.videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- vídeo do usuário, sem legenda disponível
          <video
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-[520px] w-full rounded-md bg-black"
          />
        ) : null}

        {/* Rodapé de interação — LikeButton é a ilha client. */}
        <div className="flex items-center gap-1 border-t border-neutral-100 pt-2">
          <LikeButton
            postId={post.id}
            liked={post.likedByMe}
            count={post.likesCount}
          />
          {detalhe ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-body-sm text-neutral-600">
              <MessageCircle aria-hidden className="h-4 w-4" />
              {post.commentsCount}
            </span>
          ) : (
            <Link
              href={postHref}
              className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-body-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal"
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              {post.commentsCount}
              <span className="sr-only">comentários</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
