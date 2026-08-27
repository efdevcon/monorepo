// Flat ESLint config (Next.js 16 removed `next lint`; the ESLint CLI runs
// this directly via `pnpm lint`). eslint-config-next@16 exports flat-config
// arrays natively, so no FlatCompat shim is needed.
import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...coreWebVitals,
  {
    ignores: [
      ".next/**",
      "out/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  {
    // eslint-config-next@16 turns on the React-Compiler-era react-hooks
    // rules; the codebase predates them and carries ~30 deliberate patterns
    // they flag (setMounted hydration guards, ref-driven measure loops).
    // Surfaced as warnings so `pnpm lint` gates on real errors while the
    // backlog stays visible — avoid these patterns in new code.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
