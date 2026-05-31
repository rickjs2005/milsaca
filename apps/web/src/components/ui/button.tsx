import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ── Variantes shadcn legadas (mantidas pra retrocompat) ──────────────
        // Realinhadas pras cores de marca: o token shadcn `--primary` já é o
        // cafezal/verde e `--ring` já é o dourado, então `default` continua
        // sendo o CTA de marca. outline/secondary/ghost usam neutros de marca.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-neutral-200 bg-transparent text-milsaca-preto hover:bg-neutral-50 hover:text-milsaca-cafezal",
        secondary:
          "border border-neutral-200 bg-neutral-50 text-milsaca-preto hover:bg-neutral-100",
        ghost: "text-milsaca-preto hover:bg-neutral-100 hover:text-milsaca-cafezal",
        link: "text-milsaca-cafezal underline-offset-4 hover:underline",

        // ── Variantes premium de marca (Fundação D1) ─────────────────────────
        // CTA principal de tela (criar/registrar): cafezal profundo, texto cream,
        // hover escurece o próprio cafezal (NÃO muda pra verde folha).
        primary:
          "bg-milsaca-cafezal text-milsaca-cream hover:bg-milsaca-cafezal/90",
        // Destaque dourado: fundo dourado, texto cafezal (NUNCA texto dourado),
        // hover dourado-claro. Dourado só em fundo/realce, conforme regra de AA.
        gold: "bg-milsaca-dourado text-milsaca-cafezal hover:bg-milsaca-dourado-claro",
        // Ação positiva: success (folha = success-600), hover escurece pra 700.
        success: "bg-success-600 text-milsaca-cream hover:bg-success-700",
        // Ação destrutiva de marca: danger terroso (não rose puro).
        danger: "bg-danger-600 text-milsaca-cream hover:bg-danger-700",
      },
      size: {
        // Touch-friendly: default confortável, lg pra mobile.
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
