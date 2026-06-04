import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  StarOff,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getProdutorByProfileId } from "../_lib/produtor";
import { loadProdutorCotacoes } from "../cotacoes/_lib/queries";
import { listCorretorasParaProdutor } from "./_lib/queries";
import { toggleFavorito } from "./_actions";
import { buildWhatsAppInviteUrl } from "../../corretora/produtores/_lib/whatsapp";
import { WhatsAppButton } from "./_components/whatsapp-button";
import { CorretorasMapWrapper } from "./_components/corretoras-map-wrapper";
import { StarsDisplay } from "@/components/stars";
import { StarRating } from "./_components/star-rating";
import {
  REGIAO_LABEL,
  REGIOES_CAFEEIRAS,
  type RegiaoCafeeira,
} from "@/app/admin/(panel)/corretoras/_components/regioes";

export const metadata = { title: "Corretoras — Painel do produtor" };

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

type SearchParams = Promise<{ filter?: string; regiao?: string }>;

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "favoritas", label: "Favoritas" },
  { value: "verificadas", label: "Verificadas" },
];

const VALID_REGIOES = new Set<string>(REGIOES_CAFEEIRAS.map((r) => r.value));

function isRegiao(s: string): s is RegiaoCafeeira {
  return VALID_REGIOES.has(s);
}

export default async function CorretorasProdutorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/painel/produtor/corretoras");
  const sp = await searchParams;
  const filter = sp.filter ?? "";
  const regiao = sp.regiao && isRegiao(sp.regiao) ? sp.regiao : null;

  let lista = await listCorretorasParaProdutor(user.id);
  if (filter === "favoritas") lista = lista.filter((c) => c.is_favorita);
  if (filter === "verificadas") lista = lista.filter((c) => c.verified);
  if (regiao) {
    lista = lista.filter((c) => c.regioes_atendimento.includes(regiao));
  }

  const totalFavoritas = lista.filter((c) => c.is_favorita).length;

  // Preço que cada corretora paga HOJE pro café da espécie do produtor →
  // ranqueia a lista (quem paga mais primeiro) e marca o "melhor preço".
  const produtor = await getProdutorByProfileId(user.id);
  const specie = produtor?.specie === "conilon" ? "conilon" : "arabica";
  const specieNome = specie === "conilon" ? "Conilón" : "Arábica";
  const cot = await loadProdutorCotacoes({ produtorId: user.id });
  const normSpecie = (s: string | null) =>
    s === "conillon" ? "conilon" : s ?? "";
  const precoPorCorretora = new Map<
    string,
    { price: number; variacao: number | null }
  >();
  for (const card of [...cot.minhasCorretoras, ...cot.outrasPracas]) {
    if (normSpecie(card.specie) !== specie) continue;
    const prev = precoPorCorretora.get(card.corretora_id);
    if (!prev || card.current_price > prev.price) {
      precoPorCorretora.set(card.corretora_id, {
        price: card.current_price,
        variacao: card.variacao_pct,
      });
    }
  }
  // Ranqueia por preço desc (sem preço vai pro fim, mantendo ordem anterior).
  lista = [...lista].sort((a, b) => {
    const pa = precoPorCorretora.get(a.id)?.price ?? -1;
    const pb = precoPorCorretora.get(b.id)?.price ?? -1;
    return pb - pa;
  });
  let melhorPrecoId: string | null = null;
  let melhorPreco = -1;
  for (const c of lista) {
    const p = precoPorCorretora.get(c.id)?.price;
    if (p != null && p > melhorPreco) {
      melhorPreco = p;
      melhorPrecoId = c.id;
    }
  }
  const temPreco = precoPorCorretora.size > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-milsaca-cafezal">Corretoras</h1>
        <p className="text-body-sm text-neutral-600">
          {temPreco
            ? `Ranqueadas pelo preço que pagam hoje pelo seu café (${specieNome}). Marque favoritas pra acompanhar no painel.`
            : "Catálogo de corretoras cadastradas na Milsaca. Marque favoritas pra ver as cotações delas em destaque no painel."}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-neutral-600">Mostrar:</span>
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.value) params.set("filter", f.value);
          if (regiao) params.set("regiao", regiao);
          const href = params.toString()
            ? `/painel/produtor/corretoras?${params.toString()}`
            : "/painel/produtor/corretoras";
          const active = filter === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={
                active
                  ? "rounded-pill bg-milsaca-cafezal px-3 py-1 text-caption font-medium text-milsaca-cream"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
              }
            >
              {f.label}
              {f.value === "favoritas" && totalFavoritas > 0 && (
                <span className="ml-1.5 rounded-pill bg-milsaca-dourado/30 px-1.5 text-[10px]">
                  {totalFavoritas}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-neutral-600">Região:</span>
        {[null, ...REGIOES_CAFEEIRAS.map((r) => r.value)].map((value) => {
          const params = new URLSearchParams();
          if (filter) params.set("filter", filter);
          if (value) params.set("regiao", value);
          const href = params.toString()
            ? `/painel/produtor/corretoras?${params.toString()}`
            : "/painel/produtor/corretoras";
          const active = regiao === value;
          const label = value ? REGIAO_LABEL[value] : "Todas";
          return (
            <Link
              key={value ?? "all"}
              href={href}
              className={
                active
                  ? "rounded-pill bg-milsaca-dourado px-3 py-1 text-caption font-medium text-milsaca-cafezal"
                  : "rounded-pill border border-neutral-200 px-3 py-1 text-caption text-neutral-600 transition-colors hover:border-milsaca-dourado hover:text-milsaca-cafezal"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {(() => {
        const pins = lista
          .filter(
            (c): c is typeof c & { lat: number; lng: number } =>
              c.lat != null && c.lng != null,
          )
          .map((c) => ({
            id: c.id,
            name: c.name,
            city: c.city,
            state: c.state,
            verified: c.verified,
            lat: c.lat,
            lng: c.lng,
          }));
        return pins.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-caption font-semibold uppercase tracking-wider text-neutral-500">
              No mapa
            </h2>
            <CorretorasMapWrapper pins={pins} />
            <p className="text-caption text-neutral-500">
              {pins.length} corretora{pins.length === 1 ? "" : "s"} com
              localização confirmada. As demais aparecem só na lista abaixo.
            </p>
          </section>
        ) : null;
      })()}

      {lista.length === 0 ? (
        <Card tone="muted" className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10 text-milsaca-cafezal">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="text-body-sm font-medium text-milsaca-cafezal">
              {filter === "favoritas"
                ? "Você ainda não favoritou nenhuma corretora."
                : filter === "verificadas"
                  ? "Nenhuma corretora verificada disponível ainda."
                  : "Nenhuma corretora cadastrada ainda."}
            </p>
            {filter && (
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/painel/produtor/corretoras">
                  Ver todas as corretoras
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((c) => {
            const waUrl = buildWhatsAppInviteUrl({
              phone: c.phone,
              message: `Oi! Vi a ${c.name} no Milsaca e gostaria de conversar sobre cotações de café.`,
            });
            return (
              <Card key={c.id} interactive>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-milsaca-cafezal">
                        {c.name}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        {(c.city || c.state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[c.city, c.state].filter(Boolean).join(" / ")}
                          </span>
                        )}
                        {c.verified && (
                          <StatusBadge tone="premium" withDot={false}>
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Verificada
                          </StatusBadge>
                        )}
                      </CardDescription>
                    </div>
                    <form action={toggleFavorito}>
                      <input
                        type="hidden"
                        name="corretora_id"
                        value={c.id}
                      />
                      <input
                        type="hidden"
                        name="action"
                        value={c.is_favorita ? "remove" : "add"}
                      />
                      <button
                        type="submit"
                        title={
                          c.is_favorita
                            ? "Remover dos favoritos"
                            : "Adicionar aos favoritos"
                        }
                        className={cn(
                          "rounded-md p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          c.is_favorita
                            ? "text-milsaca-dourado hover:opacity-80"
                            : "text-neutral-400 hover:text-milsaca-dourado",
                        )}
                      >
                        {c.is_favorita ? (
                          <Star className="h-5 w-5 fill-current" />
                        ) : (
                          <StarOff className="h-5 w-5" />
                        )}
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const pc = precoPorCorretora.get(c.id);
                    if (!pc) return null;
                    const up = pc.variacao != null && pc.variacao >= 0;
                    const Arrow = up ? ArrowUpRight : ArrowDownRight;
                    return (
                      <div className="rounded-md bg-milsaca-cream/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-caption text-neutral-500">
                            Paga hoje · {specieNome}
                          </p>
                          {c.id === melhorPrecoId ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-milsaca-dourado/25 px-2 py-0.5 text-[10px] font-semibold text-milsaca-cafezal">
                              <Trophy className="h-3 w-3" />
                              Melhor preço
                            </span>
                          ) : null}
                        </div>
                        <p className="text-h3 font-bold text-milsaca-cafezal">
                          {BRL.format(pc.price)}
                          <span className="text-caption font-normal text-neutral-500">
                            /saca
                          </span>
                          {pc.variacao != null ? (
                            <span
                              className={cn(
                                "ml-2 inline-flex items-center gap-0.5 text-caption font-semibold",
                                up ? "text-success-700" : "text-danger-700",
                              )}
                            >
                              <Arrow className="h-3 w-3" />
                              {up ? "+" : ""}
                              {pc.variacao.toFixed(1)}%
                            </span>
                          ) : null}
                        </p>
                      </div>
                    );
                  })()}
                  {c.rating_count > 0 && (
                    <StarsDisplay value={c.rating_media} count={c.rating_count} />
                  )}
                  {c.regioes_atendimento.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.regioes_atendimento.map((r) => (
                        <span
                          key={r}
                          className="rounded-pill bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] text-milsaca-cafezal"
                        >
                          {REGIAO_LABEL[r]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 text-caption text-neutral-600">
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </div>
                    )}
                  </div>

                  {(c.qtd_negociacoes > 0 || c.qtd_contratos > 0) && (
                    <div className="flex flex-wrap gap-2 text-caption">
                      {c.qtd_negociacoes > 0 && (
                        <span className="rounded-pill bg-neutral-100 px-2 py-0.5 text-neutral-700">
                          {c.qtd_negociacoes} negociaç
                          {c.qtd_negociacoes === 1 ? "ão" : "ões"}
                        </span>
                      )}
                      {c.qtd_contratos > 0 && (
                        <span className="rounded-pill bg-success-50 px-2 py-0.5 text-success-700">
                          {c.qtd_contratos} contrato
                          {c.qtd_contratos === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {waUrl && (
                      <WhatsAppButton
                        corretoraId={c.id}
                        fallbackWaUrl={waUrl}
                        source="catalogo_corretoras"
                      />
                    )}
                    {c.qtd_negociacoes > 0 && (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/painel/produtor/negociacoes">
                          Ver propostas
                        </Link>
                      </Button>
                    )}
                  </div>

                  {(c.qtd_negociacoes > 0 || c.qtd_contratos > 0) && (
                    <div className="border-t border-neutral-100 pt-3">
                      <p className="mb-1 text-caption text-neutral-500">
                        {c.minha_avaliacao != null
                          ? "Sua avaliação:"
                          : "Avalie esta corretora:"}
                      </p>
                      <StarRating
                        corretoraId={c.id}
                        current={c.minha_avaliacao}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
