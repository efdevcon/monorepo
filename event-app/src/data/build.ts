/**
 * The bundle's identity, inlined at build time by next.config.ts `env`:
 * short commit (or "dev"), build time and Netlify context. Shown to everyone
 * at the bottom of My Devcon (BuildFooter) and in the EF internal tools, so
 * "which version is this device on?" is one glance. Stored timestamps, not
 * "now", so plain viewer-local formatting is fine.
 */
export function buildInfo(): { build: string; time: number | null; context: string } {
  const at = process.env.APP_BUILD_TIME ? Date.parse(process.env.APP_BUILD_TIME) : NaN;
  return {
    build: process.env.APP_BUILD || "dev",
    time: Number.isFinite(at) ? at : null,
    context: process.env.APP_BUILD_CONTEXT || "local",
  };
}

export function buildLabel(): string {
  const { build, time, context } = buildInfo();
  const when = time
    ? new Date(time).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "unknown time";
  return `Build ${build} · ${when} · ${context}`;
}
