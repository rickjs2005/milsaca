import Link from "next/link";
import { Coffee, Sprout, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Fundo sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-milsaca-cream-escuro via-milsaca-cream to-milsaca-cream"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/2 h-96 w-96 translate-x-1/2 rounded-full bg-milsaca-dourado/15 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
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
            Em construção
          </Badge>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <Badge variant="outline" className="mb-6 border-milsaca-dourado text-milsaca-verde">
            Corretagem digital de café
          </Badge>

          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Milsaca
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-lg text-milsaca-verde-claro md:text-xl">
            Corretagem de café que conecta{" "}
            <span className="font-medium text-milsaca-verde">produtor</span>,{" "}
            <span className="font-medium text-milsaca-verde">corretora</span> e{" "}
            <span className="font-medium text-milsaca-verde">mercado</span>.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-milsaca-verde text-milsaca-cream hover:bg-milsaca-verde-claro"
            >
              <Link href="/entrar">
                Entrar como produtor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-milsaca-verde text-milsaca-verde hover:bg-milsaca-verde hover:text-milsaca-cream"
            >
              <Link href="/entrar/corretora">Sou corretora</Link>
            </Button>
          </div>

          <p className="mt-12 text-sm text-milsaca-verde-claro/80">
            Plataforma em desenvolvimento — primeiras corretoras em onboarding.
          </p>
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
