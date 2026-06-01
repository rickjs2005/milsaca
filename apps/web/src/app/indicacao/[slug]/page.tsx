import Link from "next/link";
import Image from "next/image";
import { MapPin, Coffee, TrendingUp, Star } from "lucide-react";
import { MilsacaLogo } from "@/components/milsaca-logo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Landing PÚBLICA de indicação. A corretora compartilha /indicacao/{slug} com
 * produtores; ao criar conta por aqui, ela já entra como favorita do produtor
 * (o slug viaja como `ref` até o trigger handle_new_user — ver migration
 * 20260930).
 *
 * Rota fora do PROTECTED_PREFIX do middleware → acessível sem login. A corretora
 * é resolvida server-side via secret key (server-only, não expõe nada a anon);
 * se não der pra resolver o nome, a landing fica genérica MAS o link ainda
 * favorita no cadastro (o `ref` segue no CTA).
 */

type Props = { params: Promise<{ slug: string }> };

type CorretoraRef = {
  name: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
};

async function getCorretora(slug: string): Promise<CorretoraRef | null> {
  const supabase = createAdminClient();
  if (!supabase) return null; // sem secret key: degrada pra landing genérica
  const { data } = await supabase
    .from("corretoras")
    .select("name, city, state, logo_url")
    .eq("slug", slug)
    .maybeSingle<CorretoraRef>();
  return data ?? null;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const c = await getCorretora(slug);
  return {
    title: c
      ? `${c.name} te convidou — Milsaca`
      : "Crie sua conta grátis — Milsaca",
    description:
      "Acompanhe o mercado de café e converse com as corretoras da sua região, de graça, pelo celular.",
  };
}

export default async function IndicacaoPage({ params }: Props) {
  const { slug } = await params;
  const corretora = await getCorretora(slug);
  const cadastroHref = `/cadastrar?role=produtor&ref=${encodeURIComponent(slug)}`;
  const local = corretora
    ? [corretora.city, corretora.state].filter(Boolean).join(" / ")
    : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-milsaca-cream px-5 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <MilsacaLogo size={150} priority />
        </div>

        <div className="rounded-card border border-milsaca-cream-escuro bg-white p-card shadow-elevated">
          {/* Quem indicou */}
          <div className="flex items-center gap-3">
            {corretora?.logo_url ? (
              <Image
                src={corretora.logo_url}
                alt={corretora.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-milsaca-cafezal/10">
                <Coffee className="h-6 w-6 text-milsaca-cafezal" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-caption uppercase tracking-wide text-neutral-500">
                Você foi convidado por
              </p>
              <p className="truncate text-h3 text-milsaca-cafezal">
                {corretora?.name ?? "uma corretora parceira"}
              </p>
              {local ? (
                <p className="flex items-center gap-1 text-caption text-neutral-500">
                  <MapPin className="h-3 w-3" /> {local}
                </p>
              ) : null}
            </div>
          </div>

          <h1 className="mt-6 text-h2 text-milsaca-preto">
            Crie sua conta grátis e acompanhe o mercado do café
          </h1>

          <ul className="mt-4 space-y-2.5 text-body-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-cafezal" />
              Cotações do café atualizadas, direto no celular.
            </li>
            <li className="flex items-start gap-2">
              <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-cafezal" />
              Todas as corretoras da sua região num lugar só.
            </li>
            <li className="flex items-start gap-2">
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-milsaca-dourado" />
              {corretora?.name ? (
                <span>
                  A <strong className="text-milsaca-cafezal">{corretora.name}</strong>{" "}
                  já fica entre as suas favoritas.
                </span>
              ) : (
                "Quem te convidou já fica entre as suas favoritas."
              )}
            </li>
          </ul>

          <Link
            href={cadastroHref}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-milsaca-cafezal text-body font-semibold text-milsaca-cream transition-colors hover:bg-milsaca-cafezal/90"
          >
            Criar conta grátis
          </Link>

          <p className="mt-4 text-center text-body-sm text-neutral-600">
            Já tem conta?{" "}
            <Link
              href="/entrar"
              className="font-semibold text-milsaca-cafezal hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-caption text-neutral-500">
          É grátis pro produtor. Sem custo, sem compromisso.
        </p>
      </div>
    </main>
  );
}
