import { NextRequest, NextResponse } from 'next/server';

// Configuration - these should be environment variables on the server
const RIPIO_CONFIG = {
  clientId: process.env.RIPIO_CLIENT_ID || 'your_client_id_here',
  clientSecret: process.env.RIPIO_CLIENT_SECRET || 'your_client_secret_here',
  baseUrl: process.env.RIPIO_ENV === 'production' 
    ? 'https://b2b-widget-onramp-api.ripio.com'
    : 'https://b2b-widget-onramp-api.sandbox.ripio.com',
};

export async function POST(request: NextRequest) {
  try {
    const { externalRef } = await request.json();

    if (!externalRef) {
      return NextResponse.json(
        { error: 'externalRef is required' },
        { status: 400 }
      );
    }

    // Create username as client_id:external_ref (as per Ripio docs)
    const username = `${RIPIO_CONFIG.clientId}:${externalRef}`;

    // Make request to Ripio auth endpoint
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', RIPIO_CONFIG.clientSecret);

    const response = await fetch(`${RIPIO_CONFIG.baseUrl}/api/v1/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ripio token request failed:', response.status, errorText);
      return NextResponse.json(
        { 
          error: 'Failed to generate Ripio token',
          details: `HTTP ${response.status}: ${errorText}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Validate the response
    if (!data.succeed || !data.token) {
      return NextResponse.json(
        { error: 'Invalid response from Ripio API' },
        { status: 500 }
      );
    }

    // Return the access token and related info
    return NextResponse.json({
      access_token: data.token,
      token_type: data.token_type,
      succeed: data.succeed,
    });

  } catch (error) {
    console.error('Error generating Ripio token:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
