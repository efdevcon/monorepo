import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }

const ENS_NAME = process.env.VITE_ENS_NAME ?? 'd.krux.eth'

// Bake the correct "Nickname (name.eth)" title into the static HTML so the
// tab and crawlers see it before any JS runs; the app re-resolves records at
// runtime and keeps the title fresh (App.tsx uses the same format).
// VITE_ENS_NICKNAME is the fallback when the name record isn't set on-chain
// yet (bootstrap: the pin must exist before the records get created); the
// on-chain record wins whenever present.
const FALLBACK_NICKNAME = process.env.VITE_ENS_NICKNAME?.trim()

function formatTitle(nickname: string | undefined): string {
  return nickname && nickname !== ENS_NAME ? `${nickname} (${ENS_NAME})` : ENS_NAME
}

let cachedTitle: Promise<string> | null = null
function buildTitle(): Promise<string> {
  cachedTitle ??= (async () => {
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: fallback([
          http('https://ethereum-rpc.publicnode.com'),
          http('https://eth.llamarpc.com'),
          http('https://cloudflare-eth.com'),
        ]),
      })
      const nickname = (await client.getEnsText({ name: normalize(ENS_NAME), key: 'name' }))?.trim()
      return formatTitle(nickname || FALLBACK_NICKNAME)
    } catch {
      return formatTitle(FALLBACK_NICKNAME)
    }
  })()
  return cachedTitle
}

function ensTitle(): Plugin {
  return {
    name: 'ens-title',
    transformIndexHtml: async html => html.replace(/<title>.*<\/title>/, `<title>${await buildTitle()}</title>`),
  }
}

// Stamp each build with its time so every pin has a unique CID: identical
// rebuilds otherwise produce the identical CID, which makes "which pin is
// this" ambiguous on Pinata and prevents forcing a fresh contenthash.
function buildStamp(): Plugin {
  return {
    name: 'build-stamp',
    transformIndexHtml: html => html.replace('</head>', `  <meta name="build" content="${new Date().toISOString()}" />\n  </head>`),
  }
}

// base './' makes all asset paths relative so the bundle works from any IPFS
// gateway path (/ipfs/<cid>/) as well as the eth.limo root.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), svgr(), ensTitle(), buildStamp()],
})
