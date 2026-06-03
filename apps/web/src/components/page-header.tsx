import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  /** Sem href = item atual (renderiza como texto). */
  href?: string;
};

type Props = {
  /** Título da página (h1). */
  title: string;
  /** Descrição curta abaixo do título (1-2 linhas). */
  description?: string;
  /** Migalhas de pão. Última geralmente sem href (página atual). */
  breadcrumbs?: Crumb[];
  /** Slot livre pra ações primárias (botões/links à direita). */
  actions?: React.ReactNode;
  /** Eyebrow text acima do título — ex.: "Admin · Gestão". */
  eyebrow?: string;
  className?: string;
};

/**
 * Header padrão de página admin/painel. Estilo Linear/Vercel — eyebrow
 * + breadcrumbs + título + descrição + ações. Não inclui margin top —
 * use dentro do container da rota.
 *
 * Boa prática:
 *   - título: 2-4 palavras
 *   - descrição: 1 frase honesta sobre o que a tela faz
 *   - ações: 1 primária no máximo (ex.: "+ Nova corretora")
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  eyebrow,
  className,
}: Props) {
  return (
    <header className={cn("mb-8 flex flex-col gap-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((c, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      className="rounded-sm px-0.5 hover:text-milsaca-cafezal hover:underline underline-offset-4"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={cn(
                        last && "font-medium text-slate-700",
                      )}
                    >
                      {c.label}
                    </span>
                  )}
                  {!last ? (
                    <ChevronRight
                      aria-hidden
                      className="h-3 w-3 text-slate-300"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-milsaca-dourado-texto">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-milsaca-preto sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
