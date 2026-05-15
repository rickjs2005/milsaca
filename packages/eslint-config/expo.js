/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.js",
    "expo",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
};
