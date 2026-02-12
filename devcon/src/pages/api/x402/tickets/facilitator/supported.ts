/**
 * x402 Facilitator GET /supported
 * Returns payment schemes, networks, and signers supported by this facilitator.
 * Spec §7.3
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getRelayerAddress } from 'services/relayer'
import { X402_VERSION, type SupportedResponse, getGaslessUsdcChainIds, getUsdcConfigForChainId } from 'types/x402'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SupportedResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  try {
    const relayerAddress = getRelayerAddress()
    const chainIds = getGaslessUsdcChainIds()

    const kinds = chainIds.map(chainId => {
      const config = getUsdcConfigForChainId(chainId)!
      return {
        x402Version: X402_VERSION,
        scheme: 'exact' as const,
        network: `eip155:${chainId}` as `${string}:${string}`,
        extra: { name: config.tokenSymbol, version: '2' },
      }
    })

    const response: SupportedResponse = {
      kinds,
      extensions: [],
      signers: {
        'eip155:*': [relayerAddress],
      },
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(response)
  } catch (error) {
    console.error('[Facilitator supported]', error)
    return res.status(500).json({
      kinds: [],
      extensions: [],
      signers: {},
    })
  }
}
