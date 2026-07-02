import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Variantes do Card (Fundação D2, 2026-05-30) — ADITIVAS e retrocompatíveis.
 *
 * Base elevada: borda em `neutral-200` (marca, no lugar do slate), `rounded-card`
 * (16px), `shadow-card` e fundo branco. Tudo continua sobrescrevível por
 * `className` — os ~141 usos atuais de `<Card className=...>` seguem intactos.
 *
 *   - `tone`:
 *       · "default" — card neutro padrão (branco, borda neutra).
 *       · "premium" — leve realce dourado (borda + anel sutil) pra KPI primário
 *                     / cards principais.
 *       · "muted"   — fundo cream sutil, pra blocos secundários/sumários.
 *   - `interactive`: adiciona hover de card clicável
 *       (`shadow-card-hover` + borda dourada suave + transição).
 */
const cardVariants = cva(
  "rounded-card border bg-card text-card-foreground shadow-card",
  {
    variants: {
      tone: {
        default: "border-neutral-200 bg-white",
        premium:
          "border-milsaca-dourado/30 bg-white ring-1 ring-inset ring-milsaca-dourado/15",
        muted: "border-neutral-200 bg-milsaca-cream",
      },
      interactive: {
        true: "transition-[box-shadow,border-color,transform] duration-200 hover:shadow-card-hover hover:border-milsaca-dourado/40 motion-safe:hover:-translate-y-0.5",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      interactive: false,
    },
  },
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ tone, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-h3 tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-body-sm text-neutral-600", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
};
