import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'
import { EVENT, LINKS, META } from './src/terminal/event.ts'

// The Devcon IX announcement page, served by devcon.org at /lisbon/. Built by
// `pnpm build:lisbon` from the devcon package into public/lisbon/ (gitignored),
// which Next serves as static files; `pnpm dev:lisbon` runs it alone on Vite.
const ROOT = import.meta.dirname
const DEVCON = resolve(ROOT, '..')
const BASE = '/lisbon/'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default defineConfig(({ mode }) => {
  // Absolute origin for og:url, og:image and canonical. VITE_SITE_URL is the same
  // variable the app sees as import.meta.env.VITE_SITE_URL (devcon's .env files or
  // the Netlify environment); the config reads it through loadEnv.
  const ORIGIN = (loadEnv(mode, DEVCON, 'VITE_').VITE_SITE_URL || 'https://devcon.org').replace(/\/+$/, '')
  // {{SITE.url}} is the page's absolute URL without the trailing slash, so
  // `{{SITE.url}}/` is the canonical and `{{SITE.url}}/og.png` the image.
  // {{SITE.base}} is the path prefix for inline-script asset URLs.
  const FIELDS: Record<string, Record<string, string>> = {
    EVENT,
    META,
    LINKS,
    SITE: { url: ORIGIN + BASE.replace(/\/$/, ''), base: BASE },
  }

  return {
    root: ROOT,
    base: BASE,
    // VITE_* variables come from the devcon package's .env files, not a second set here.
    envDir: DEVCON,
    plugins: [
      {
        // {{EVENT.key}}, {{META.key}}, {{LINKS.key}}, {{SITE.url}} and {{SITE.base}} in
        // HTML → values from src/terminal/event.ts and the constants above.
        name: 'event-facts',
        transformIndexHtml: (html) => {
          html = html.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group: string, key: string) => {
            const value = FIELDS[group]?.[key]
            if (value === undefined) throw new Error(`Unknown placeholder: ${match}`)
            return escapeHtml(value)
          })
          if (html.includes('{{')) throw new Error('Unfilled {{ placeholder left in HTML')
          return html
        },
      },
    ],
    build: {
      outDir: resolve(DEVCON, 'public/lisbon'),
      emptyOutDir: true,
      // esbuild, not the default lightningcss: lightningcss rejects some of terminal.css.
      cssMinify: 'esbuild',
      rollupOptions: {
        input: resolve(ROOT, 'index.html'),
      },
    },
  }
})
