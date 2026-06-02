import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tokens de tamanho de fonte semânticos (packages/config-tailwind/tokens.js).
// Sem isto, o tailwind-merge não reconhece `text-caption`/`text-h1`/etc. como
// font-size e os trata como cor de texto — então um `text-caption` passado no
// className DESCARTA a cor da variante (ex.: `text-milsaca-cream` do botão
// primary), e o texto herda a cor do redor (fica "apagado"). Registrar esses
// tokens no grupo font-size mantém cor e tamanho convivendo. NÃO remover.
const FONT_SIZE_TOKENS = [
  "display",
  "h1",
  "h2",
  "h3",
  "body-lg",
  "body",
  "body-sm",
  "label",
  "caption",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
