import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { deleteComment } from "@/lib/social/actions";
import { getPost, listComments } from "@/lib/social/queries";
import { SocialAvatar } from "../avatar";
import { CommentForm } from "../comment-form";
import { PostCard } from "../post-card";

/**
 * Página do post: a publicação em destaque + comentários + form.
 * Compartilhada pelos dois painéis via `base`.
 */
export async function ComunidadePostPage({
  base,
  postId,
}: {
  base: string;
  postId: string;
}) {
  const user = await requireUser();
  const post = await getPost(user.id, postId);
  if (!post) notFound();

  const comments = await listComments(user.id, post.id, post.autor.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <Link
          href={base}
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-neutral-600 transition-colors hover:text-milsaca-cafezal"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar pra Comunidade
        </Link>
        <h1 className="text-h1 text-milsaca-cafezal">Publicação</h1>
      </header>

      <PostCard post={post} base={base} detalhe />

      <Card>
        <CardContent className="space-y-4 p-card pt-card">
          <h2 className="text-h3 text-milsaca-cafezal">
            Comentários{comments.length > 0 ? ` (${comments.length})` : ""}
          </h2>

          <CommentForm postId={post.id} />

          {comments.length === 0 ? (
            <p className="text-body-sm text-neutral-500">
              Ainda não tem comentário aqui. Puxe o assunto!
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <Link href={`${base}/perfil/${c.autor.id}`} className="shrink-0">
                    <SocialAvatar
                      nome={c.autor.nome}
                      avatarUrl={c.autor.avatarUrl}
                      size="sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1 rounded-md bg-milsaca-cream/60 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={`${base}/perfil/${c.autor.id}`}
                        className="text-body-sm font-semibold text-milsaca-cafezal hover:underline"
                      >
                        {c.autor.nome}
                      </Link>
                      <span className="text-caption text-neutral-500">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-body-sm text-milsaca-preto">
                      {c.body}
                    </p>
                  </div>
                  {c.canDelete ? (
                    <form action={deleteComment}>
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="post_id" value={post.id} />
                      <input type="hidden" name="base" value={base} />
                      <ConfirmSubmit
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-danger-600"
                        confirmTitle="Remover comentário?"
                        confirmMessage="O comentário some pra todo mundo. Não dá pra desfazer."
                        confirmButtonLabel="Remover"
                        pendingLabel="Removendo..."
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                        <span className="sr-only">Remover comentário</span>
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
