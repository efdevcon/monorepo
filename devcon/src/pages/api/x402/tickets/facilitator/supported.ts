/**
 * x402 Facilitator GET /supported
 * Returns payment schemes, networks, and signers supported by this facilitator.
 * Spec §7.3
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getRelayerAddress } from 'services/relayer'
import { X402_VERSION, type SupportedResponse, getAllGaslessConfigs } from 'types/x402'

const FACILITATOR_API_KEY = process.env.X402_FACILITATOR_API_KEY

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SupportedResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end()
  }

  if (FACILITATOR_API_KEY && req.headers['x-facilitator-key'] !== FACILITATOR_API_KEY) {
    return res.status(401).json({ kinds: [] } as any)
  }

  try {
    const relayerAddress = getRelayerAddress()
    const configs = getAllGaslessConfigs()

    const kinds = configs.map(config => ({
      x402Version: X402_VERSION,
      scheme: 'exact' as const,
      network: `eip155:${config.chainId}` as `${string}:${string}`,
      extra: { name: config.eip712Name, version: config.eip712Version },
    }))

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
