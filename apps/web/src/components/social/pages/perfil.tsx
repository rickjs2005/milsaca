import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import {
  FEED_PAGE_SIZE,
  getPerfil,
  getPerfilStats,
  isSeguindo,
  listFeed,
} from "@/lib/social/queries";
import { ApelidoForm } from "../apelido-form";
import { FollowButton } from "../follow-button";
import { PostCard } from "../post-card";
import { SocialAvatar } from "../avatar";
import { firstParam, type SocialSearchParams } from "./feed";

/**
 * Perfil público na Comunidade: cabeçalho (avatar, papel, contadores,
 * seguir) + publicações da pessoa.
 */
export async function ComunidadePerfilPage({
  base,
  perfilId,
  searchParams,
}: {
  base: string;
  perfilId: string;
  searchParams: SocialSearchParams;
}) {
  const user = await requireUser();
  const perfil = await getPerfil(perfilId);
  if (!perfil) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const souEu = perfil.id === user.id;

  const [stats, sigo, { rows, count }] = await Promise.all([
    getPerfilStats(perfil.id),
    souEu ? Promise.resolve(false) : isSeguindo(user.id, perfil.id),
    listFeed(user.id, { autorId: perfil.id, page }),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / FEED_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={base}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-neutral-600 transition-colors hover:text-milsaca-cafezal"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Voltar pra Comunidade
      </Link>

      <Card tone="premium">
        <CardContent className="p-card pt-card">
          <div className="flex flex-wrap items-start gap-4">
            <SocialAvatar nome={perfil.nome} avatarUrl={perfil.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-h2 text-milsaca-cafezal">{perfil.nome}</h1>
              <p className="text-body-sm text-neutral-600">
                {[perfil.papel, perfil.corretoraNome]
                  .filter(Boolean)
                  .join(" · ") || "Membro da rede Milsaca"}
              </p>
              {perfil.desde ? (
                <p className="mt-1 text-caption text-neutral-500">
                  Na Milsaca desde {fmtDate(perfil.desde)}
                </p>
              ) : null}
              {souEu ? (
                <div className="mt-2">
                  <ApelidoForm apelido={perfil.apelido} />
                </div>
              ) : null}
            </div>
            {!souEu ? (
              <FollowButton perfilId={perfil.id} seguindo={sigo} size="default" />
            ) : null}
          </div>

          <dl className="mt-4 flex gap-6 border-t border-neutral-100 pt-4">
            {[
              { label: "Publicações", value: stats.posts },
              { label: "Seguidores", value: stats.seguidores },
              { label: "Seguindo", value: stats.seguindo },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-caption text-neutral-500">{s.label}</dt>
                <dd className="text-h3 text-milsaca-cafezal">{s.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={
            souEu ? "Você ainda não publicou nada" : "Nenhuma publicação ainda"
          }
          description={
            souEu
              ? "Compartilhe a primeira novidade com a rede na Comunidade."
              : "Quando essa pessoa publicar, aparece aqui."
          }
          cta={souEu ? { label: "Ir pro feed", href: base } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {rows.map((post) => (
            <PostCard key={post.id} post={post} base={base} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(p) => `${base}/perfil/${perfil.id}?page=${p}`}
      />
    </div>
  );
}
