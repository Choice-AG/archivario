import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Patrones existentes de carga en efectos; se revisarán poco a poco.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "work/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
