const milsacaPreset = require("@milsaca/config-tailwind");
const nativewindPreset = require("nativewind/preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [nativewindPreset, milsacaPreset],
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
