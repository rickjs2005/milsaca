const milsacaPreset = require("@milsaca/config-tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [milsacaPreset],
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
