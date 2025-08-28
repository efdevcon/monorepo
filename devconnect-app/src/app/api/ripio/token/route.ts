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

    // Create Basic Auth header with Base64 encoded credentials
    const credentials = `${RIPIO_CONFIG.clientId}:${RIPIO_CONFIG.clientSecret}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    // Make request to Ripio OAuth2 token endpoint
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', RIPIO_CONFIG.clientId);
    formData.append('client_secret', RIPIO_CONFIG.clientSecret);

    const response = await fetch(`${RIPIO_CONFIG.baseUrl}/oauth2/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
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
    if (!data.access_token) {
      return NextResponse.json(
        { error: 'Invalid response from Ripio API' },
        { status: 500 }
      );
    }

    // Return the access token and related info
    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
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
