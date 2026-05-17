"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-milsaca-verde px-4 py-2 text-xs font-medium text-milsaca-cream hover:bg-milsaca-verde-claro"
    >
      Imprimir
    </button>
  );
}
