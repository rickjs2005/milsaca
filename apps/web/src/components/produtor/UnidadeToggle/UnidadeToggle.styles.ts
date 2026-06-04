// Estilos do UnidadeToggle — separados do componente (regra do brief).
// Só tokens milsaca-* / neutros de marca; sem hex hardcoded.

export const toggleStyles = {
  root: "inline-flex flex-col gap-2",

  // Segmented control (Sacas | Bags | Kg)
  group:
    "inline-flex items-center gap-0.5 rounded-pill bg-milsaca-cream p-0.5 ring-1 ring-inset ring-milsaca-cream-escuro",

  btnBase:
    "rounded-pill px-3 py-1 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40",
  btnActive: "bg-milsaca-dourado text-milsaca-cafezal shadow-card",
  btnInactive: "text-neutral-600 hover:text-milsaca-cafezal",

  // Valor formatado na unidade ativa
  value: "text-h3 font-bold text-milsaca-cafezal tabular-nums",
  hint: "text-caption text-neutral-500",
} as const;
