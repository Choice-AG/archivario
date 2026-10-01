import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Portadas externas con <img>: next/image consumiría la cuota de
      // optimización de imágenes del plan Hobby de Vercel.
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      ".next-emulators/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "work/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
