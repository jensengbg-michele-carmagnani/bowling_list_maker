import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "dist/**",
      "frontend/dist/**",
      "server/dist/**",
      ".next/**",
      "node_modules/**",
      "tsconfig.tsbuildinfo"
    ]
  },
  {
    files: [
      "frontend/src/hooks/useAsync.ts",
      "frontend/src/hooks/useDebouncedEffect.ts"
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/use-memo": "off"
    }
  }
];

export default config;
