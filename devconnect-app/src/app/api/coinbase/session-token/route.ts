import { NextRequest, NextResponse } from 'next/server'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

export async function POST(request: NextRequest) {
  try {
    const { addresses, assets } = await request.json()

    // Validate required parameters
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Addresses array is required' },
        { status: 400 }
      )
    }

    // Get CDP API credentials from environment variables
    const cdpApiKeyId = process.env.CDP_API_KEY_ID
    const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET
    
    if (!cdpApiKeyId || !cdpApiKeySecret) {
      console.error('CDP_API_KEY_ID or CDP_API_KEY_SECRET environment variables are not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Generate JWT token for authentication
    const requestMethod = 'POST'
    const requestHost = 'api.developer.coinbase.com'
    const requestPath = '/onramp/v1/token'
    
    let jwtToken: string
    try {
      jwtToken = await generateJwt({
        apiKeyId: cdpApiKeyId,
        apiKeySecret: cdpApiKeySecret,
        requestMethod: requestMethod,
        requestHost: requestHost,
        requestPath: requestPath,
        expiresIn: 120 // 2 minutes expiration
      })
    } catch (jwtError) {
      console.error('Error generating JWT:', jwtError)
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
        },
        { status: 500 }
      )
    }

    // Prepare the request payload
    const payload = {
      addresses: addresses.map((addr: any) => ({
        address: addr.address,
        blockchains: addr.blockchains || ['ethereum', 'base', 'optimism']
      })),
      assets: assets || ['ETH', 'USDC']
    }

    // Make request to Coinbase CDP API with JWT authentication
    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Coinbase API error:', response.status, errorData)
      return NextResponse.json(
        { 
          error: 'Failed to generate session token',
          details: errorData,
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      sessionToken: data.token // Note: Coinbase API returns 'token' not 'sessionToken'
    })

  } catch (error) {
    console.error('Error generating session token:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
