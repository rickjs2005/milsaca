import Link from "next/link";
import {
  Coffee,
  Sprout,
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  Smartphone,
  Globe2,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  LineChart,
  Lock,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSupportChannels } from "@/lib/support";

const WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP_CONTATO?.replace(/\D/g, "") ?? "";
const WHATSAPP_URL = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer o Milsaca.")}`
  : null;

export default async function Home() {
  const support = await getSupportChannels();
  const supportHref = support.waHref ?? support.mailHref;

  return (
    <main className="relative min-h-screen overflow-hidden bg-milsaca-cream">
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
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cafezal text-milsaca-dourado">
              <Coffee className="h-5 w-5" />
            </span>
            <span className="text-h3 font-semibold tracking-tight text-milsaca-preto">
              Milsaca
            </span>
          </div>
          <Badge
            variant="outline"
            className="gap-1 border-milsaca-dourado/50 text-milsaca-dourado-texto"
          >
            <Sprout className="h-3 w-3" />
            Beta
          </Badge>
        </header>

        {/* Hero — duas colunas: proposta à esquerda, produto à direita */}
        <section className="grid grid-cols-1 items-center gap-10 pt-14 md:grid-cols-2 md:gap-12 md:pt-20">
          <div className="ms-reveal text-center md:text-left">
            <Badge
              variant="outline"
              className="mb-6 border-milsaca-dourado/50 text-milsaca-cafezal"
            >
              Mercado do café · Zona da Mata · Minas Gerais
            </Badge>

            <h1 className="text-balance text-h1 leading-[1.05] tracking-tight text-milsaca-preto md:text-display md:text-[3.25rem]">
              A corretora de café{" "}
              <span className="text-milsaca-dourado-texto">inteira</span> num
              painel só.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-balance text-body text-neutral-700 md:mx-0 md:text-body-lg">
              Produtores, cotações, propostas, contratos e laudo digital num
              lugar — e o produtor acompanha tudo, e fala com você, direto do
              celular. Sem planilha, sem papelada, sem ligação perdida.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start">
              {WHATSAPP_URL ? (
                <Button asChild size="lg" variant="primary">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Agendar uma demo
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" variant="primary">
                  <Link href="/entrar">
                    Começar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link href="/entrar">Já tenho conta</Link>
              </Button>
            </div>

            <p className="mt-5 text-caption text-neutral-600">
              Demo de 20 minutos, sem cartão · Foco inicial em Manhuaçu e Matas
              de Minas.
            </p>
          </div>

          {/* Preview do produto — mock fiel à UI real (dado ilustrativo) */}
          <HeroPreview />
        </section>

        {/* Faixa de credibilidade — sinais reais, sem número inventado */}
        <section
          className="ms-reveal mt-section grid grid-cols-2 gap-3 pt-14 md:grid-cols-4"
          style={{ animationDelay: "220ms" }}
        >
          <TrustItem
            icon={<LineChart className="h-4 w-4" />}
            title="Cotação CEPEA/ESALQ"
            text="Referência oficial do mercado, ao lado do preço de cada corretora."
          />
          <TrustItem
            icon={<BadgeCheck className="h-4 w-4" />}
            title="Laudo COB auditável"
            text="Classificação pela IN 8/2003, com laudo público e QR."
          />
          <TrustItem
            icon={<Lock className="h-4 w-4" />}
            title="Isolamento por RLS"
            text="Cada corretora vê só os próprios dados — garantido no banco."
          />
          <TrustItem
            icon={<ShieldCheck className="h-4 w-4" />}
            title="LGPD desde o dia 1"
            text="Exportação e anonimização de dados previstas no produto."
          />
        </section>

        {/* Pra quem é */}
        <section className="mt-section grid grid-cols-1 gap-4 pt-16 md:grid-cols-2">
          <Card className="flex flex-col p-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-cafezal text-milsaca-cream">
              <Coffee className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-h3 text-milsaca-cafezal">Pra corretora</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-neutral-700">
              Mesa de operação completa: produtores, leads, contratos com
              espelho, lotes com laudo COB digital, cotações e canal direto via
              WhatsApp. Tudo num único painel.
            </p>
            <ul className="mt-4 space-y-2 text-body-sm text-neutral-700">
              <Item>CRM de produtores + modo sombra</Item>
              <Item>Lotes com laudo COB (IN 8/2003) auditável</Item>
              <Item>Contratos com espelho imprimível</Item>
              <Item>Multi-tenant seguro (RLS)</Item>
            </ul>
            <div className="mt-6 pt-2">
              <Link
                href="/entrar"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-milsaca-cafezal hover:underline"
              >
                Entrar como corretora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>

          <Card tone="premium" className="flex flex-col p-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-milsaca-dourado text-milsaca-cafezal">
              <Smartphone className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-h3 text-milsaca-cafezal">Pra produtor</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-neutral-700">
              App leve no celular pra acompanhar cotações, ver propostas das
              corretoras, contratos assinados e falar direto no WhatsApp. Sem
              papelada, sem ligação perdida.
            </p>
            <ul className="mt-4 space-y-2 text-body-sm text-neutral-700">
              <Item>Cotações com variação e histórico</Item>
              <Item>Propostas e contratos em uma tela</Item>
              <Item>Login simples por código de email</Item>
              <Item>WhatsApp 1-toque pra cada corretora</Item>
            </ul>
            <div className="mt-6 pt-2">
              <Link
                href="/entrar"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-milsaca-cafezal hover:underline"
              >
                Entrar como produtor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </section>

        {/* Diferenciais */}
        <section className="mt-section pt-12">
          <div className="text-center">
            <p className="text-caption font-semibold uppercase tracking-widest text-milsaca-dourado-texto">
              Diferenciais
            </p>
            <h2 className="mt-2 text-h2 text-milsaca-cafezal md:text-h1">
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
              tone="urgent"
              badge="Prazo dez/2026"
              icon={<Globe2 className="h-5 w-5" />}
              title="EUDR-ready"
              text="A UE vai exigir origem geográfica do café. O banco já guarda talhão com polígono e DDS — você chega pronto antes do prazo."
            />
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Multi-tenant"
              text="Cada corretora vê só seus dados. RLS no banco garante isolamento real, não só na aplicação."
            />
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-section rounded-card border border-milsaca-cafezal bg-milsaca-cafezal p-10 text-center text-milsaca-cream">
          <h2 className="text-h2 text-milsaca-cream md:text-h1">
            Pronto pra digitalizar sua corretora?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body-sm text-milsaca-cream/85">
            Cadastros novos são feitos junto com o time Milsaca — você sai da
            demo já operando. Marque 20 minutos no WhatsApp.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {WHATSAPP_URL ? (
              <Button asChild size="lg" variant="gold">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                </a>
              </Button>
            ) : (
              <Button asChild size="lg" variant="gold">
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
              className="border-milsaca-cream/40 bg-transparent text-milsaca-cream hover:bg-milsaca-cream hover:text-milsaca-cafezal"
            >
              <Link href="/entrar">Entrar como produtor</Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 flex flex-col items-center justify-between gap-3 text-caption text-neutral-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Milsaca</span>
          <nav className="flex items-center gap-4">
            <Link
              href="/termos"
              className="hover:text-milsaca-cafezal hover:underline"
            >
              Termos de Uso
            </Link>
            <Link
              href="/politica-privacidade"
              className="hover:text-milsaca-cafezal hover:underline"
            >
              Privacidade
            </Link>
            {supportHref ? (
              <a
                href={supportHref}
                target={support.waHref ? "_blank" : undefined}
                rel={support.waHref ? "noopener noreferrer" : undefined}
                className="hover:text-milsaca-cafezal hover:underline"
              >
                Suporte
              </a>
            ) : null}
          </nav>
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

function TrustItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cream-escuro text-milsaca-cafezal">
        {icon}
      </span>
      <p className="text-body-sm font-semibold text-milsaca-cafezal">{title}</p>
      <p className="text-caption leading-relaxed text-neutral-600">{text}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
  tone,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone?: "urgent";
  badge?: string;
}) {
  const urgent = tone === "urgent";
  return (
    <Card
      tone={urgent ? "premium" : "default"}
      className="flex flex-col p-5"
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-milsaca-cream-escuro text-milsaca-cafezal">
          {icon}
        </div>
        {badge ? (
          <span className="rounded-pill bg-milsaca-dourado/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-milsaca-dourado-texto">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-body font-semibold text-milsaca-cafezal">
        {title}
      </h3>
      <p className="mt-1 text-caption leading-relaxed text-neutral-600">
        {text}
      </p>
    </Card>
  );
}

/**
 * Preview do produto no hero. Mock fiel à UI real do painel do produtor
 * (card "melhor preço" + propostas), com dado ILUSTRATIVO — dá o impacto
 * visual que faltava sem depender de screenshot de dado real.
 */
function HeroPreview() {
  return (
    <div
      className="ms-reveal relative mx-auto w-full min-w-0 max-w-sm md:mx-0 md:max-w-md"
      style={{ animationDelay: "120ms" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-milsaca-dourado/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-milsaca-cream-escuro bg-white shadow-elevated">
        {/* Barra de janela */}
        <div className="flex items-center gap-1.5 border-b border-milsaca-cream-escuro bg-milsaca-cream/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-milsaca-cream-escuro" />
          <span className="h-2.5 w-2.5 rounded-full bg-milsaca-cream-escuro" />
          <span className="h-2.5 w-2.5 rounded-full bg-milsaca-cream-escuro" />
          <span className="ml-3 truncate text-[11px] font-medium text-neutral-500">
            Painel do produtor · Cotações
          </span>
        </div>

        <div className="space-y-3 p-4">
          {/* Melhor preço hoje */}
          <div className="rounded-card border border-milsaca-dourado/30 bg-white p-4 ring-1 ring-inset ring-milsaca-dourado/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-milsaca-dourado-texto">
              🔥 Melhor preço hoje
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
              <p className="text-h1 font-bold leading-none tracking-tight text-milsaca-cafezal">
                R$ 1.505
                <span className="text-body-sm font-normal text-neutral-500">
                  ,00
                </span>
              </p>
              <span className="inline-flex items-center gap-0.5 rounded-pill bg-success-50 px-2 py-0.5 text-caption font-semibold text-success-700">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +1,0% vs CEPEA
              </span>
            </div>
            <p className="mt-1 text-caption text-neutral-600">
              Corretora Demo Café · Arábica cereja descascado
            </p>
            {/* Sparkline ilustrativa */}
            <svg
              viewBox="0 0 320 56"
              className="mt-3 h-12 w-full"
              fill="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="hpArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#C9A961" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#C9A961" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 44 L46 40 L92 42 L138 30 L184 33 L230 20 L276 22 L320 8 L320 56 L0 56 Z"
                fill="url(#hpArea)"
              />
              <path
                className="ms-spark"
                d="M0 44 L46 40 L92 42 L138 30 L184 33 L230 20 L276 22 L320 8"
                stroke="#C9A961"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Duas propostas resumidas */}
          <div className="grid grid-cols-2 gap-3">
            <PreviewProposta
              nome="Corretora Demo"
              preco="R$ 1.510"
              total="R$ 135.900"
              melhor={false}
            />
            <PreviewProposta
              nome="Corretora Sul"
              preco="R$ 1.520"
              total="R$ 228.000"
              melhor
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewProposta({
  nome,
  preco,
  total,
  melhor,
}: {
  nome: string;
  preco: string;
  total: string;
  melhor: boolean;
}) {
  return (
    <div className="min-w-0 rounded-card border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-caption font-semibold text-milsaca-cafezal">
          {nome}
        </p>
        {melhor ? (
          <span className="shrink-0 rounded-pill bg-milsaca-dourado/20 px-1.5 py-0.5 text-[9px] font-semibold text-milsaca-cafezal">
            Melhor
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-body font-bold text-milsaca-cafezal">{preco}</p>
      <p className="text-[10px] text-neutral-500">/saca</p>
      <div className="mt-2 border-t border-neutral-100 pt-2">
        <p className="text-[10px] text-neutral-500">Total</p>
        <p className="text-caption font-semibold text-milsaca-cafezal">
          {total}
        </p>
      </div>
    </div>
  );
}
