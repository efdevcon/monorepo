/**
 * Thin proxy: forwards to Pretix plugin /plugin/x402/admin/orders.
 * All business logic (order listing, stats) lives in the plugin now.
 *
 * Keep the existing ADMIN_SECRET check — devcon-next still enforces admin auth
 * at the public edge; the plugin uses Pretix API token auth.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { pluginFetch } from 'services/pretixPluginProxy'
import { TICKETING, TICKETING_ENV } from 'config/ticketing'
import { fetchEthPriceUsd } from 'services/ethPrice'
import { fetchWalletInfoFromZapper } from 'services/zapperWallet'

const ADMIN_SECRET = process.env.X402_ADMIN_SECRET || ''

const SUPPORTED_CHAIN_IDS = [1, 10, 8453, 42161, 137]

/** Display-only POL/USD price from Coinbase. Unlike the ETH oracle we don't
 *  need dual-source confirmation here — this drives the admin wallet panel's
 *  total estimate, not actual payment pricing. Returns null on failure. */
async function fetchPolPriceUsd(): Promise<number | null> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/POL-USD/spot', { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null
    const json = await res.json()
    const v = parseFloat(json?.data?.amount)
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  if (!ADMIN_SECRET) {
    return res.status(500).json({ success: false, error: 'X402_ADMIN_SECRET not configured' })
  }
  const provided = (req.headers['x-admin-key'] as string | undefined) || (req.query.secret as string | undefined) || ''
  if (provided !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'unauthorized' })
  }

  try {
    const { status, body } = await pluginFetch<{
      success: boolean
      stats?: {
        pending: number
        completed: number
        totalUsd: string
        x402Count?: number
        legacyCount?: number
      }
      completed?: Array<Record<string, unknown>>
      pending?: Array<Record<string, unknown>>
      error?: string
    }>('/plugin/x402/admin/orders/', { method: 'GET' })

    // Stamp env + base URL so the admin UI can label rows by environment
    // when multiple Pretix instances are proxied through the same build.
    if (body && body.success) {
      const envLabel = TICKETING_ENV
      const baseUrl = TICKETING.pretix.baseUrl
      const orgSlug = TICKETING.pretix.organizer
      const eventSlug = TICKETING.pretix.event
      body.completed = (body.completed || []).map(o => ({ ...o, env: envLabel }))
      body.pending = (body.pending || []).map(o => ({ ...o, env: envLabel }))
      ;(body as Record<string, unknown>).env = envLabel
      ;(body as Record<string, unknown>).pretixBaseUrl = baseUrl
      ;(body as Record<string, unknown>).pretixOrgSlug = orgSlug
      ;(body as Record<string, unknown>).pretixEventSlug = eventSlug

      // Enrich with two separate wallet panels — fetched here (not from the
      // Pretix plugin) because they need ZAPPER_API_KEY which lives in the
      // Vercel env. Best-effort: any failure returns null and the UI hides
      // the relevant panel.
      //
      // Two wallets, two responsibilities:
      //   - destinationWallet: receives payments → show every token (native
      //     + USDC + USDT0). No low-balance threshold; this wallet's job is
      //     to accumulate, not pay gas.
      //   - gasRelayerWallet: sponsors gas for EIP-3009 transfers → show
      //     only native (ETH/POL). Token balances on the relayer aren't
      //     relevant to operations. The native-balance threshold drives the
      //     red-flag UI in admin.tsx.
      const recipient = TICKETING.payment.recipientAddress
      const relayer = TICKETING.payment.relayerAddress
      const [ethPriceResult, polPrice] = await Promise.all([
        fetchEthPriceUsd().catch(() => null),
        fetchPolPriceUsd(),
      ])
      const ethPrice = ethPriceResult?.price ?? null
      const [destinationFull, gasRelayerFull] = await Promise.all([
        recipient
          ? fetchWalletInfoFromZapper({ address: recipient, chainIds: SUPPORTED_CHAIN_IDS, ethPrice, polPrice })
          : Promise.resolve(null),
        relayer
          ? fetchWalletInfoFromZapper({ address: relayer, chainIds: SUPPORTED_CHAIN_IDS, ethPrice, polPrice })
          : Promise.resolve(null),
      ])
      if (destinationFull) {
        // Filter ERC-20 rows to only the tokens we actually accept. Match by
        // contract address (canonical) instead of symbol — the on-chain
        // `symbol()` for USD₮0 returns the unicode tether glyph (U+20AE),
        // not the ASCII "USDT0" we use elsewhere, so a symbol-based filter
        // was silently dropping it. Native (ETH/POL) is preserved separately
        // via `ethBalance`.
        // address (lowercase) -> normalized symbol used by the rest of the
        // app (TOKEN_ICONS, displays, exports). Zapper's on-chain `symbol()`
        // for USD₮0 returns the unicode tether glyph; mapping by address lets
        // us both filter to supported tokens AND normalize the symbol so
        // icon lookups (TOKEN_ICONS['USDT0']) keep working.
        const SUPPORTED_TOKENS_BY_ADDRESS: Record<string, string> = {
          // USDC
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC', // mainnet
          '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'USDC', // optimism
          '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'USDC', // polygon
          '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC', // base
          '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC', // arbitrum
          // USD₮0
          '0x01bff41798a0bcf287b996046ca68b395dbc1071': 'USDT0', // optimism
          '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT0', // arbitrum
        }
        const destinationWallet = {
          ...destinationFull,
          balances: destinationFull.balances.map(c => ({
            ...c,
            tokens: c.tokens
              .map(t => {
                const canonicalSymbol = SUPPORTED_TOKENS_BY_ADDRESS[t.address.toLowerCase()]
                return canonicalSymbol ? { ...t, symbol: canonicalSymbol } : null
              })
              .filter((t): t is NonNullable<typeof t> => t !== null),
          })),
        }
        ;(body as Record<string, unknown>).destinationWallet = destinationWallet
      }
      if (gasRelayerFull) {
        // Strip ERC-20 tokens — the gas relayer panel is native-only since
        // gas is paid in native currency.
        const gasRelayerWallet = {
          ...gasRelayerFull,
          balances: gasRelayerFull.balances.map(c => ({ ...c, tokens: [] })),
        }
        ;(body as Record<string, unknown>).gasRelayerWallet = gasRelayerWallet
      }
    }
    return res.status(status).json(body)
  } catch (e) {
    console.error('[x402 proxy] orders error:', e)
    return res.status(502).json({ success: false, error: 'Pretix plugin unreachable' })
  }
}
