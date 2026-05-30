import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@milsaca/db/web/public";

/**
 * Página pública da corretora — pra ser compartilhada com produtores e
 * compradores.
 *
 * Hoje lê da view `corretoras_publicas` (sem cnpj/IE/CEP/endereço) que
 * está com grant pra `authenticated`. **Visitante sem login é
 * redirecionado pra /entrar pelo middleware existente** — pra deixar
 * 100% público (anon), aplicar a migration:
 *
 *   grant select on public.corretoras_publicas to anon;
 *
 * E ajustar o `PROTECTED_PREFIX` em src/middleware.ts pra incluir uma
 * exceção pra `/c/*`. Fica como pendência da Fase 9 ou suporte futuro.
 */

type Props = {
  params: Promise<{ slug: string }>;
};

type CorretoraPublic = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  verified: boolean;
  descricao: string | null;
  logo_url: string | null;
  site_url: string | null;
};

/**
 * Busca da corretora pública cacheada (Opção A). A página não personaliza
 * nada por usuário logado — é a vitrine pública da corretora — então é
 * 100% cacheável. Usamos `unstable_cache` com client SEM cookie (a RPC/view
 * `corretoras_publicas` só expõe campos públicos), tirando o tráfego do
 * Postgres mesmo a página sendo dinâmica por causa de `cookies()`.
 * TTL 600s: perfil de corretora muda muito pouco. Tag `corretora-<slug>`.
 *
 * `generateMetadata` e a página reusam o mesmo fetch cacheado (mesma chave),
 * então só há 1 ida ao banco por slug a cada janela de revalidação.
 */
function getCorretoraPublica(slug: string) {
  const fetchCorretora = unstable_cache(
    async (s: string): Promise<CorretoraPublic | null> => {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("corretoras_publicas")
        .select(
          "id, name, slug, city, state, phone, email, verified, descricao, logo_url, site_url",
        )
        .eq("slug", s)
        .maybeSingle<CorretoraPublic>();
      return data ?? null;
    },
    ["corretora-publica"],
    { revalidate: 600, tags: [`corretora-${slug}`] },
  );
  return fetchCorretora(slug);
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getCorretoraPublica(slug);
  if (!data) {
    return { title: "Corretora não encontrada — Milsaca" };
  }
  const local = [data.city, data.state].filter(Boolean).join("/");
  return {
    title: `${data.name}${local ? ` · ${local}` : ""} — Milsaca`,
    description:
      data.descricao ??
      `Corretora de café ${data.name}${local ? ` em ${local}` : ""}. Veja contatos e fale agora pelo WhatsApp.`,
  };
}

function sanitizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export default async function CorretoraPublicPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCorretoraPublica(slug);

  if (!data) {
    notFound();
  }

  const c = data;
  const local = [c.city, c.state].filter(Boolean).join("/");
  const phoneDigits = sanitizePhone(c.phone);
  const waText = encodeURIComponent(
    `Olá! Vi o perfil da ${c.name} no Milsaca e gostaria de conversar sobre café.`,
  );
  const waHref = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${waText}`
    : `https://wa.me/?text=${waText}`;
  const mailHref = c.email
    ? `mailto:${c.email}?subject=${encodeURIComponent(`Contato via Milsaca — ${c.name}`)}`
    : null;

  return (
    <main className="min-h-screen bg-milsaca-cream">
      <header className="bg-milsaca-cafezal px-6 py-12 text-milsaca-cream sm:px-12 sm:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          {c.logo_url ? (
            <Image
              src={c.logo_url}
              alt={`Logo ${c.name}`}
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 shrink-0 rounded-2xl border border-milsaca-dourado/40 bg-white object-contain p-2 shadow-card"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-milsaca-dourado/20 text-3xl font-bold text-milsaca-dourado">
              {c.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {c.name}
              </h1>
              {c.verified ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-milsaca-dourado/15 px-2.5 py-1 text-[11px] font-medium text-milsaca-dourado ring-1 ring-inset ring-milsaca-dourado/40"
                  title="Corretora verificada pela Milsaca"
                >
                  <BadgeCheck className="h-3 w-3" />
                  Verificada
                </span>
              ) : null}
            </div>
            {local ? (
              <p className="inline-flex items-center justify-center gap-1.5 text-sm text-milsaca-cream/75 sm:justify-start">
                <MapPin className="h-3.5 w-3.5" />
                {local}
              </p>
            ) : null}
            {c.descricao ? (
              <p className="text-sm leading-relaxed text-milsaca-cream/80 sm:text-base">
                {c.descricao}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto -mt-8 max-w-3xl px-6 pb-12 sm:px-0">
        <div className="rounded-card border border-milsaca-cream-escuro bg-white p-6 shadow-card-hover sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#25D366] px-5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
            {mailHref ? (
              <a
                href={mailHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-milsaca-cafezal px-5 text-sm font-semibold text-milsaca-cafezal transition-colors hover:bg-milsaca-cafezal hover:text-milsaca-cream"
              >
                <Mail className="h-4 w-4" />
                Mandar e-mail
              </a>
            ) : null}
          </div>

          {c.site_url ? (
            <div className="mt-6 border-t border-milsaca-cream-escuro pt-5">
              <Link
                href={c.site_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-milsaca-cafezal hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                {c.site_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-milsaca-verde-claro/70">
          Página oficial da {c.name} no Milsaca — sistema de corretagem de café.
        </p>
      </section>
    </main>
  );
}
