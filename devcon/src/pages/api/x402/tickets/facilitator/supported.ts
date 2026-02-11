/**
 * x402 Facilitator GET /supported
 * Returns payment schemes, networks, and signers supported by this facilitator.
 * Spec §7.3
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getRelayerAddress, getUsdcConfig } from 'services/relayer'
import { X402_VERSION, type SupportedResponse } from 'types/x402'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SupportedResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  try {
    const usdcConfig = getUsdcConfig()
    const relayerAddress = getRelayerAddress()
    const network = `eip155:${usdcConfig.chainId}`

    const response: SupportedResponse = {
      kinds: [
        {
          x402Version: X402_VERSION,
          scheme: 'exact',
          network: network as `${string}:${string}`,
          extra: { name: usdcConfig.tokenSymbol, version: '2' },
        },
      ],
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
