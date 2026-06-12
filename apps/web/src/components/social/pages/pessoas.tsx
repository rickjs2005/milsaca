import Link from "next/link";
import { ArrowLeft, Search, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { searchPerfis } from "@/lib/social/queries";
import { FollowButton } from "../follow-button";
import { SocialAvatar } from "../avatar";
import { firstParam, type SocialSearchParams } from "./feed";

/**
 * Diretório + busca de perfis da Comunidade. Form GET simples (?q=) —
 * sem termo, mostra os perfis mais recentes da rede.
 */
export async function ComunidadePessoasPage({
  base,
  searchParams,
}: {
  base: string;
  searchParams: SocialSearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();

  const perfis = await searchPerfis(user.id, q);

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
        <div>
          <h1 className="text-h1 text-milsaca-cafezal">Pessoas</h1>
          <p className="text-body-sm text-neutral-600">
            Encontre produtores e corretoras pra seguir na Comunidade.
          </p>
        </div>
      </header>

      <form method="get" className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar pelo nome…"
            className="w-full rounded-md border border-neutral-200 bg-white py-2 pl-9 pr-3 text-body-sm text-milsaca-preto placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-milsaca-cafezal px-3.5 py-2 text-body-sm font-medium text-milsaca-cream transition-colors hover:bg-milsaca-folha"
        >
          Buscar
        </button>
      </form>

      {perfis.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Ninguém encontrado"
          description={
            q
              ? `Nenhum perfil bate com "${q}". Tente outro nome.`
              : "Ainda não tem perfis ativos na rede."
          }
        />
      ) : (
        <ul className="space-y-3">
          {perfis.map((p) => {
            const souEu = p.id === user.id;
            return (
              <li key={p.id}>
                <Card interactive>
                  <CardContent className="flex items-center gap-3 p-card pt-card">
                    <Link href={`${base}/perfil/${p.id}`} className="shrink-0">
                      <SocialAvatar nome={p.nome} avatarUrl={p.avatarUrl} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${base}/perfil/${p.id}`}
                        className="block truncate text-body-sm font-semibold text-milsaca-cafezal hover:underline"
                      >
                        {p.nome}
                        {souEu ? (
                          <span className="ml-2 text-caption font-normal text-neutral-500">
                            (você)
                          </span>
                        ) : null}
                      </Link>
                      <p className="truncate text-caption text-neutral-500">
                        {[p.papel, p.corretoraNome].filter(Boolean).join(" · ") ||
                          "Membro da rede Milsaca"}
                      </p>
                    </div>
                    {!souEu ? (
                      <FollowButton perfilId={p.id} seguindo={p.euSigo} />
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
