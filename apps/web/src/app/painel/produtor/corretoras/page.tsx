import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  StarOff,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listCorretorasParaProdutor } from "./_lib/queries";
import { toggleFavorito } from "./_actions";
import { buildWhatsAppInviteUrl } from "../../corretora/produtores/_lib/whatsapp";
import { WhatsAppButton } from "./_components/whatsapp-button";
import {
  REGIAO_LABEL,
  REGIOES_CAFEEIRAS,
  type RegiaoCafeeira,
} from "@/app/admin/corretoras/_components/regioes";

export const metadata = { title: "Corretoras — Painel do produtor" };

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-milsaca-verde">
          Corretoras
        </h1>
        <p className="text-sm text-milsaca-verde-claro">
          Catálogo de corretoras cadastradas na Milsaca. Marque favoritas pra
          ver as cotações delas em destaque no painel.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Mostrar:</span>
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
                  ? "rounded-full bg-milsaca-verde px-3 py-1 text-xs font-medium text-milsaca-cream"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {f.label}
              {f.value === "favoritas" && totalFavoritas > 0 && (
                <span className="ml-1.5 rounded-full bg-milsaca-dourado/30 px-1.5 text-[10px]">
                  {totalFavoritas}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-milsaca-verde-claro">Região:</span>
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
                  ? "rounded-full bg-milsaca-dourado px-3 py-1 text-xs font-medium text-milsaca-verde"
                  : "rounded-full border border-milsaca-cream-escuro px-3 py-1 text-xs text-milsaca-verde-claro hover:text-milsaca-verde"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <Card className="border-dashed border-milsaca-cream-escuro bg-transparent">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-verde/10 text-milsaca-verde">
              <Building2 className="h-6 w-6" />
            </span>
            <p className="text-sm text-milsaca-verde">
              {filter === "favoritas"
                ? "Você ainda não favoritou nenhuma corretora."
                : filter === "verificadas"
                  ? "Nenhuma corretora verificada disponível ainda."
                  : "Nenhuma corretora cadastrada ainda."}
            </p>
            {filter && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="mt-2 border-milsaca-verde text-milsaca-verde"
              >
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
              <Card key={c.id} className="border-milsaca-cream-escuro">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base text-milsaca-verde">
                        {c.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        {(c.city || c.state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[c.city, c.state].filter(Boolean).join(" / ")}
                          </span>
                        )}
                        {c.verified && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Verificada
                          </Badge>
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
                        className={
                          c.is_favorita
                            ? "text-milsaca-dourado hover:opacity-80"
                            : "text-milsaca-verde-claro hover:text-milsaca-dourado"
                        }
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
                  {c.regioes_atendimento.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.regioes_atendimento.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-milsaca-dourado/15 px-2 py-0.5 text-[10px] text-milsaca-verde"
                        >
                          {REGIAO_LABEL[r]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1 text-xs text-milsaca-verde-claro">
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
                    <div className="flex gap-2 text-[11px]">
                      {c.qtd_negociacoes > 0 && (
                        <span className="rounded bg-milsaca-cream-escuro/60 px-2 py-0.5 text-milsaca-verde">
                          {c.qtd_negociacoes} negociaç
                          {c.qtd_negociacoes === 1 ? "ão" : "ões"}
                        </span>
                      )}
                      {c.qtd_contratos > 0 && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
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
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border-milsaca-cream-escuro text-milsaca-verde"
                      >
                        <Link href="/painel/produtor/negociacoes">
                          Ver propostas
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
