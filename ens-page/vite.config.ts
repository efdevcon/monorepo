import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const ENS_NAME = process.env.VITE_ENS_NAME ?? 'd.krux.eth'

// Bake the correct "Nickname (name.eth)" title into the static HTML so the
// tab and crawlers see it before any JS runs; the app re-resolves records at
// runtime and keeps the title fresh (App.tsx uses the same format).
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
      return nickname && nickname !== ENS_NAME ? `${nickname} (${ENS_NAME})` : ENS_NAME
    } catch {
      return ENS_NAME
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

// base './' makes all asset paths relative so the bundle works from any IPFS
// gateway path (/ipfs/<cid>/) as well as the eth.limo root.
export default defineConfig({
  base: './',
  plugins: [react(), svgr(), ensTitle()],
})
