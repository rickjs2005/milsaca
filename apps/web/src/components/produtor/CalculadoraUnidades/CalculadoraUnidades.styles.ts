// Estilos da CalculadoraUnidades — separados do componente (regra do brief).
export const calcStyles = {
  root: "space-y-4",
  group:
    "inline-flex items-center gap-0.5 rounded-pill bg-milsaca-cream p-0.5 ring-1 ring-inset ring-milsaca-cream-escuro",
  seg: "rounded-pill px-4 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  segActive: "bg-milsaca-dourado text-milsaca-cafezal shadow-card",
  segInactive: "text-neutral-600 hover:text-milsaca-cafezal",

  fields: "flex flex-wrap items-end gap-3",
  field: "flex flex-col gap-1",
  fieldLabel: "text-caption text-neutral-600",
  input:
    "w-36 rounded-md border border-neutral-200 px-3 py-2 text-body text-milsaca-cafezal tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",

  out: "grid grid-cols-3 gap-2",
  outCell: "rounded-md bg-milsaca-cream/60 px-3 py-2 text-center",
  outLabel: "text-caption uppercase tracking-wider text-neutral-500",
  outValue: "mt-0.5 text-body-sm font-bold text-milsaca-cafezal tabular-nums",
} as const;
