import Link from "next/link";
import { MessagesSquare, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";
import { getProfile, requireUser } from "@/lib/auth";
import { FEED_PAGE_SIZE, listFeed, type FeedTab } from "@/lib/social/queries";
import { PostCard } from "../post-card";
import { PostComposer } from "../post-composer";

export type SocialSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export function firstParam(
  v: string | string[] | undefined,
): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const TABS: { value: FeedTab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "seguindo", label: "Seguindo" },
];

/**
 * Feed da Comunidade — página compartilhada pelos painéis corretora e
 * produtor; `base` é o prefixo da rota do painel ativo.
 */
export async function ComunidadeFeedPage({
  base,
  searchParams,
}: {
  base: string;
  searchParams: SocialSearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  const sp = await searchParams;

  const tab: FeedTab = firstParam(sp.tab) === "seguindo" ? "seguindo" : "todos";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);

  const { rows, count } = await listFeed(user.id, { tab, page });
  const totalPages = Math.max(1, Math.ceil(count / FEED_PAGE_SIZE));

  const tabHref = (t: FeedTab) => (t === "todos" ? base : `${base}?tab=${t}`);
  const pageHref = (p: number) =>
    `${base}?${new URLSearchParams({
      ...(tab === "seguindo" ? { tab } : {}),
      page: String(p),
    }).toString()}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Comunidade</h1>
          <p className="text-body-sm text-neutral-600">
            Novidades de produtores e corretoras da rede Milsaca.
          </p>
        </div>
        <Link
          href={`${base}/pessoas`}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3.5 py-2 text-body-sm font-medium text-milsaca-cafezal transition-colors hover:bg-neutral-50"
        >
          <Search aria-hidden className="h-4 w-4" />
          Encontrar pessoas
        </Link>
      </header>

      <PostComposer
        nome={profile?.full_name?.trim() || "Você"}
        avatarUrl={profile?.avatar_url ?? null}
      />

      {/* Abas Todos | Seguindo */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={tabHref(t.value)}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn(
              "rounded-pill px-3.5 py-1.5 text-body-sm font-medium transition-colors",
              tab === t.value
                ? "bg-milsaca-cafezal text-milsaca-cream"
                : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={
            tab === "seguindo"
              ? "Você ainda não segue ninguém"
              : "Nenhuma publicação ainda"
          }
          description={
            tab === "seguindo"
              ? "Siga produtores e corretoras pra montar o seu feed."
              : "Seja a primeira pessoa a compartilhar uma novidade com a rede."
          }
          cta={
            tab === "seguindo"
              ? { label: "Encontrar pessoas", href: `${base}/pessoas` }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((post) => (
            <PostCard key={post.id} post={post} base={base} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
