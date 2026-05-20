import Link from "next/link";
import {
  Coffee,
  Sprout,
  ArrowRight,
  FileCheck2,
  Smartphone,
  Globe2,
  MessageCircle,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP_CONTATO?.replace(/\D/g, "") ?? "";
const WHATSAPP_URL = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer o Milsaca.")}`
  : null;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-milsaca-cream-escuro via-milsaca-cream to-milsaca-cream"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/2 h-96 w-96 translate-x-1/2 rounded-full bg-milsaca-dourado/15 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-dourado">
              <Coffee className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Milsaca
            </span>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sprout className="h-3 w-3" />
            Beta
          </Badge>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center pt-16 text-center md:pt-24">
          <Badge
            variant="outline"
            className="mb-6 border-milsaca-dourado text-milsaca-verde"
          >
            Mercado do café · Brasil
          </Badge>

          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Corretagem de café{" "}
            <span className="text-milsaca-dourado">cloud-nativa</span>
            <br className="hidden md:block" /> pra nova geração.
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-base text-milsaca-verde-claro md:text-lg">
            O Milsaca é o sistema que conecta corretora, produtor e mercado —
            com COB digital, laudo público com QR, NFP-e e EUDR no horizonte, e
            app no celular do produtor.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/entrar">
                Sou corretora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-milsaca-verde text-milsaca-verde hover:bg-milsaca-verde hover:text-milsaca-cream"
            >
              <Link href="/entrar">Sou produtor</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-milsaca-verde-claro/70">
            Foco inicial: Zona da Mata · Matas de Minas · Manhuaçu/MG.
          </p>
        </section>

        {/* Pra quem é */}
        <section className="mt-24 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-milsaca-verde/10 bg-white p-8 shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-verde text-milsaca-cream">
              <Coffee className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-milsaca-verde">
              Pra corretora
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-milsaca-verde-claro">
              Mesa de operação completa: produtores, leads, contratos com
              espelho, lotes com laudo COB digital, cotações e canal direto via
              WhatsApp. Tudo num único painel.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-milsaca-verde-claro">
              <Item>CRM de produtores + modo sombra</Item>
              <Item>Lotes com laudo COB (IN 8/2003) auditável</Item>
              <Item>Contratos com espelho imprimível</Item>
              <Item>Multi-tenant seguro (RLS)</Item>
            </ul>
          </div>

          <div className="rounded-3xl border border-milsaca-dourado/30 bg-milsaca-cream-escuro/40 p-8 shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-dourado text-milsaca-verde">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-milsaca-verde">
              Pra produtor
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-milsaca-verde-claro">
              App leve no celular pra acompanhar cotações, ver propostas das
              corretoras, contratos assinados e falar direto no WhatsApp. Sem
              papelada, sem ligação perdida.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-milsaca-verde-claro">
              <Item>Cotações com variação e histórico</Item>
              <Item>Propostas e contratos em uma tela</Item>
              <Item>Login simples por código de email</Item>
              <Item>WhatsApp 1-toque pra cada corretora</Item>
            </ul>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="mt-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-milsaca-dourado">
              Diferenciais
            </p>
            <h2 className="mt-2 text-2xl font-bold text-milsaca-verde md:text-3xl">
              O que outras corretoras ainda não têm
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Feature
              icon={<FileCheck2 className="h-5 w-5" />}
              title="COB digital"
              text="Classificação pela IN 8/2003 com cálculo determinístico, schema versionado e laudo público com QR."
            />
            <Feature
              icon={<ScrollText className="h-5 w-5" />}
              title="NFP-e ready"
              text="Arquitetura preparada pra emissão eletrônica de Nota Fiscal de Produtor quando a homologação SEFAZ entrar."
            />
            <Feature
              icon={<Globe2 className="h-5 w-5" />}
              title="EUDR-ready"
              text="Banco preparado pra talhões com polígono geográfico e DDS — vai estar pronto antes do prazo de dez/2026."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Multi-tenant"
              text="Cada corretora vê só seus dados. RLS no banco garante isolamento real, não só na aplicação."
            />
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-24 rounded-3xl border border-milsaca-verde bg-milsaca-verde p-10 text-center text-milsaca-cream">
          <h2 className="text-2xl font-bold md:text-3xl">
            Pronto pra digitalizar sua corretora?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-milsaca-cream/85">
            Cadastros novos hoje são feitos junto com o time Milsaca. Fale
            comigo no WhatsApp e marcamos uma demo de 20 minutos.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {WHATSAPP_URL ? (
              <Button
                asChild
                size="lg"
                className="bg-milsaca-dourado text-milsaca-verde hover:bg-milsaca-dourado-claro"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-milsaca-dourado text-milsaca-verde hover:bg-milsaca-dourado-claro"
              >
                <Link href="/entrar">
                  Entrar como corretora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-milsaca-cream/40 bg-transparent text-milsaca-cream hover:bg-milsaca-cream hover:text-milsaca-verde"
            >
              <Link href="/entrar">Entrar como produtor</Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 flex flex-col items-center justify-between gap-2 text-xs text-milsaca-verde-claro/70 sm:flex-row">
          <span>© {new Date().getFullYear()} Milsaca</span>
          <span>Mercado do café · Brasil</span>
        </footer>
      </div>
    </main>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-milsaca-dourado" />
      <span>{children}</span>
    </li>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-milsaca-verde/10 bg-white p-5 shadow-sm">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cream-escuro text-milsaca-verde">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-milsaca-verde">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-milsaca-verde-claro">
        {text}
      </p>
    </div>
  );
}
