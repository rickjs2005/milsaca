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
  },
};

const fontFamily = {
  sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
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

module.exports = { colors, fontFamily, borderRadius, boxShadow };
