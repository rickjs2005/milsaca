// Espécie de café — slug canônico ("arabica"/"conillon"), igual ao enum
// `coffee_specie` usado em lotes/cotacoes/preferências de comprador.
//
// `leads.coffee_type` guarda o slug (ver migration 20260920000000); a exibição
// usa `coffeeLabel()`. As funções são tolerantes a valores legados em label
// ("Arábica"/"Conillón") pra não quebrar dado antigo que escape da migração.

const COFFEE_SLUGS = ["arabica", "conillon"] as const;
export type CoffeeSlug = (typeof COFFEE_SLUGS)[number];

const SLUG_TO_LABEL: Record<CoffeeSlug, string> = {
  arabica: "Arábica",
  conillon: "Conillón",
};

/** Opções pra <select> de café (value = slug canônico, label = exibição). */
export const COFFEE_OPTIONS: { value: CoffeeSlug; label: string }[] =
  COFFEE_SLUGS.map((value) => ({ value, label: SLUG_TO_LABEL[value] }));

/** Normaliza slug OU label legado → slug canônico; `null` se não reconhecer. */
function coffeeSlug(value: string | null | undefined): CoffeeSlug | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "arabica" || v.startsWith("aráb") || v.startsWith("arab")) {
    return "arabica";
  }
  if (v === "conillon" || v.startsWith("conil") || v === "robusta") {
    return "conillon";
  }
  return null;
}

/** slug (ou label legado) → label de exibição. Mantém o texto cru se desconhecido. */
export function coffeeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const slug = coffeeSlug(value);
  return slug ? SLUG_TO_LABEL[slug] : value;
}
