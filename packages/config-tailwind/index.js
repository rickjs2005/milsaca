/**
 * Preset Tailwind compartilhado.
 * Importe via `presets: [require("@milsaca/config-tailwind")]`.
 */
const tokens = require("./tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.boxShadow,
    },
  },
  plugins: [],
};
