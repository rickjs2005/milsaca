// Estilos do UnidadeInput — separados do componente (regra do brief).
// Tokens milsaca-* / neutros de marca; sem hex hardcoded.

export const inputStyles = {
  root: "space-y-3",
  label: "block text-label text-milsaca-cafezal",

  // Seletor de unidade de ENTRADA (Bags | Sacas | Kg)
  group:
    "inline-flex items-center gap-0.5 rounded-pill bg-milsaca-cream p-0.5 ring-1 ring-inset ring-milsaca-cream-escuro",
  segBase:
    "rounded-pill px-4 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  segActive: "bg-milsaca-dourado text-milsaca-cafezal shadow-card",
  segInactive: "text-neutral-600 hover:text-milsaca-cafezal",

  // Campos numéricos
  fields: "flex flex-wrap items-end gap-3",
  field: "flex flex-col gap-1",
  fieldLabel: "text-caption text-neutral-600",
  input:
    "w-32 rounded-md border border-neutral-200 px-3 py-2 text-body text-milsaca-cafezal tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

  // Preview ao vivo (superfície cream)
  preview: "rounded-md bg-milsaca-cream/70 px-4 py-3",
  previewLabel: "text-caption text-neutral-500",
  previewRow: "mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-1",
  previewSaca: "text-h3 font-bold text-milsaca-cafezal tabular-nums",
  previewSec: "text-body-sm text-neutral-600 tabular-nums",
} as const;
