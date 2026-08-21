/**
 * Ambient declaration for plain-CSS side-effect imports (e.g. layout.tsx's
 * `import "./globals.css"`). Next's own globals only declare `*.module.css`,
 * so editors whose tsserver checks side-effect imports (TS2882 /
 * noUncheckedSideEffectImports) flag plain .css imports as unresolvable —
 * the CLI `tsc` never did. Safe to match `*.css` broadly: this app uses no
 * CSS modules, so there's no typed declaration to shadow.
 */
declare module "*.css";
