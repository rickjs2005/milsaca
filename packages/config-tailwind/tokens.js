/**
 * Design tokens Milsaca.
 * Reutilizado por web (Tailwind) e mobile (NativeWind).
 *
 * Convenção de cor:
 *   - `milsaca.verde` e `milsaca.cream` são as legacy keys (em uso desde 2026-05).
 *     Mantidas pra não quebrar UI existente.
 *   - `milsaca.cafezal`, `milsaca.folha`, `milsaca.preto` e `milsaca.cream-claro`
 *     são keys premium (Fase 2 redesign admin, 2026-05-20). Use nestas em
 *     componentes novos e ao refatorar telas críticas (admin shell, sidebar,
 *     hero pages).
 *
 *   Diferença principal — `milsaca.verde` (#2D3A2E) é mais oliva; `cafezal`
 *   (#0F3D2E) é mais escuro e premium, melhor pra fundo de sidebar dark.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TOKENS DE FUNDAÇÃO (proposta D1, 2026-05-30) — ADITIVOS, nada removido.
 *   - `success` / `warning` / `danger` / `info`: cores semânticas de estado,
 *     escalas sóbrias derivadas da marca (substituem emerald/amber/rose/sky soltos).
 *   - `neutral`: escala de cinza levemente quente/esverdeada (substitui slate-*).
 *   - `dourado-texto`: variante escura do dourado pra uso EM TEXTO (AA).
 *     O dourado #C9A961 NÃO passa AA sobre cream — use só em fundo/realce/borda;
 *     pra texto dourado use `dourado-texto` ou caia em cafezal/preto.
 *   Fora de `colors`: `fontSize` semântico, `spacing` de layout, `ringColor.DEFAULT`.
 * ──────────────────────────────────────────────────────────────────────────
 */
const colors = {
  milsaca: {
    // Legacy (manter por compat)
    verde: "#2D3A2E",
    "verde-claro": "#4A5C4C",
    dourado: "#C9A961",
    "dourado-claro": "#E0C68A",
    cream: "#FAF7F0",
    "cream-escuro": "#EFEADB",

    // Premium (Fase 2 — redesign admin)
    cafezal: "#0F3D2E",       // verde mais profundo, sidebar premium
    folha: "#1B5E3F",          // verde vivo, success / hover
    preto: "#1A1A1A",          // texto principal em fundo claro
    "cream-claro": "#F5E6C8",  // hover suave em cards

    // Fundação D1 — dourado seguro pra TEXTO sobre cream (AA ~4.7:1)
    "dourado-texto": "#8A6D2F",
  },

  // ── Cores semânticas de estado (Fundação D1) ──────────────────────────────
  // Derivadas da marca: success da folha/cafezal, warning âmbar quente que
  // conversa com o dourado, danger vermelho terroso (não rose puro), info
  // azul-acinzentado discreto (não sky vivo). Tons 50/100 pra bg suave,
  // 500 base, 600/700 pra texto/borda/ring com contraste AA sobre cream/branco.
  success: {
    50: "#ECF3EE",
    100: "#D2E4D8",
    500: "#2E7D52",
    600: "#1B5E3F", // = milsaca.folha
    700: "#134A31",
  },
  warning: {
    50: "#FBF3E2",
    100: "#F6E5C2",
    500: "#C98A1E",
    600: "#9C6A12",
    700: "#7A520C",
  },
  danger: {
    50: "#F8ECEA",
    100: "#F0D4CF",
    500: "#B23B2E",
    600: "#992F23",
    700: "#7A241A",
  },
  info: {
    50: "#EDF1F4",
    100: "#D6E0E7",
    500: "#4B6B82",
    600: "#3A5567",
    700: "#2C4150",
  },

  // ── Neutros de marca (Fundação D1) ────────────────────────────────────────
  // Cinza levemente quente/esverdeado (hue cafezal nas pontas) que substitui o
  // slate-* genérico. Não remove slate; é a alternativa de marca. Use `neutral`
  // no lugar de `slate` em texto/borda/fundo neutro.
  neutral: {
    50: "#FAF9F6",
    100: "#F2F1EC",
    200: "#E5E3DB",
    300: "#D3D1C6",
    400: "#A8A89C",
    500: "#7C7D72",
    600: "#5C5E54",
    700: "#44463E",
    800: "#2E302A",
    900: "#1C1D19",
  },
};

const fontFamily = {
  sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
};

// ── Tipografia semântica (Fundação D1) ───────────────────────────────────────
// Escala harmônica (~1.2 / major-third suavizada) com line-height e weight
// embutidos. Os tamanhos default do Tailwind (text-sm, text-base...) continuam
// funcionando — isto só ADICIONA nomes semânticos.
const fontSize = {
  display: ["2.5rem", { lineHeight: "1.1", fontWeight: "700" }],   // 40px — hero
  h1: ["2rem", { lineHeight: "1.15", fontWeight: "700" }],          // 32px
  h2: ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }],         // 24px
  h3: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],        // 20px
  "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],// 18px
  body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],         // 16px
  "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],// 14px
  label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],    // 14px — form labels
  caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],   // 12px — meta/hint
};

// ── Espaçamento semântico de layout (Fundação D1) ────────────────────────────
// Aliases mínimos pra reduzir improviso. A escala canônica continua sendo a do
// Tailwind (4/8/12/16/24/32/40 = p-1/2/3/4/6/8/10). Estes aliases nomeiam só os
// gaps recorrentes de card e seção.
const spacing = {
  card: "1.25rem",    // 20px — padding interno padrão de card
  section: "2.5rem",  // 40px — gap vertical entre seções de página
};

const borderRadius = {
  milsaca: "1rem",
  card: "1rem",       // 16px — cards padrão admin
  pill: "9999px",     // chips, badges, pílulas
};

const boxShadow = {
  // Sombras suaves, premium (baseado em Linear/Stripe/Vercel)
  card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05)",
  "card-hover":
    "0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.05)",
  elevated:
    "0 12px 32px rgba(15, 61, 46, 0.10), 0 4px 12px rgba(15, 23, 42, 0.06)",
};

// ── Estados / foco (Fundação D1) ─────────────────────────────────────────────
// Anel de foco padrão dourado. Aplicar como `focus-visible:ring-2 ring-offset-2`
// nos componentes (fase 2). Disabled: `opacity-50` + `cursor-not-allowed`.
const ringColor = {
  DEFAULT: "#C9A961", // dourado da marca
};

module.exports = {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  boxShadow,
  ringColor,
};
