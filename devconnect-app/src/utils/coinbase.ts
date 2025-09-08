interface SessionTokenRequest {
  addresses: Array<{
    address: string
    blockchains: string[]
  }>
  assets?: string[]
}

interface SessionTokenResponse {
  sessionToken: string
  channel_id?: string
}

/**
 * Example usage for developers
 * 
 * ```typescript
 * // Generate a session token for onramp
 * const token = await generateSessionToken({
 *   addresses: [{
 *     address: "0x1234567890123456789012345678901234567890",
 *     blockchains: ["ethereum", "base"]
 *   }],
 *   assets: ["ETH", "USDC"]
 * });
 * 
 * // Use the token in onramp URL
 * const onrampUrl = generateOnrampURL({
 *   sessionToken: token,
 *   // ... other params
 * });
 * ```
 */

/**
 * Generates a session token for secure onramp/offramp initialization
 * @param params - The parameters for session token generation
 * @returns The session token or null if generation fails
 */
export async function generateSessionToken(
  params: SessionTokenRequest
): Promise<string | null> {
  try {
    const response = await fetch('/api/coinbase/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Session token generation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      
      throw new Error(errorData.error || errorData.details || 'Failed to generate session token')
    }

    const data: SessionTokenResponse = await response.json()
    return data.sessionToken
  } catch (error) {
    console.error('Error generating session token:', error)
    throw error // Re-throw to let the component handle it
  }
}

/**
 * Helper function to format addresses for session token request
 * @param address - The wallet address
 * @param networks - Array of blockchain networks
 * @returns Formatted addresses array
 */
export function formatAddressesForToken(
  address: string,
  networks: string[]
): Array<{ address: string; blockchains: string[] }> {
  return [
    {
      address,
      blockchains: networks,
    },
  ]
}
