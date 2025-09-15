import { NextRequest, NextResponse } from 'next/server';

// Configuration - these should be environment variables on the server
const RIPIO_CONFIG = {
  clientId: process.env.RIPIO_CLIENT_ID || 'your_client_id_here',
  clientSecret: process.env.RIPIO_CLIENT_SECRET || 'your_client_secret_here',
  baseUrl: 'https://skala-sandbox.ripio.com',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const externalRef = searchParams.get('externalRef');
    const cvu = searchParams.get('cvu');

    if (!externalRef) {
      return NextResponse.json(
        { error: 'externalRef is required' },
        { status: 400 }
      );
    }

    if (!cvu) {
      return NextResponse.json(
        { error: 'cvu is required' },
        { status: 400 }
      );
    }
    console.log('Using form data approach as per curl example');

    const credentialString = `${RIPIO_CONFIG.clientId}:${RIPIO_CONFIG.clientSecret}`;
    console.log('Credential string: ', credentialString);
    const encodedCredential = Buffer.from(credentialString, 'utf8').toString('base64');
    console.log('Using base64 encoded credentials from environment variables: ', encodedCredential);

    // Make request to Ripio OAuth2 token endpoint
    const tokenUrl = `${RIPIO_CONFIG.baseUrl}/oauth2/token/`;
    console.log('Attempting to get token from:', tokenUrl);
    
    const formData = new FormData();
    formData.append('grant_type', 'client_credentials');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredential}`,
      },
      body: formData,
    });

    console.log('Ripio token request response status:', response.status);

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
    console.log('Ripio token response data:', data);

    // Validate the response
    if (!data.access_token) {
      return NextResponse.json(
        { error: 'Invalid response from Ripio API' },
        { status: 500 }
      );
    }

    // Call simulate deposit before returning the token
    
    let simulateData = null;
    let simulateError = null;
    
    try {
      const simulateUrl = `${RIPIO_CONFIG.baseUrl}/api/v1/simulateDeposit/`;
      console.log('Attempting simulate deposit at:', simulateUrl);
      console.log('Using access token:', data.access_token);
      
      const simulateResponse = await fetch(simulateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method_type: 'bank_transfer',
          amount: 2100,
          alias_or_cvu: cvu
        }),
      });

      console.log('Simulate deposit response status:', simulateResponse.status);
      console.log('Simulate deposit response headers:', Object.fromEntries(simulateResponse.headers.entries()));
      
      const responseText = await simulateResponse.text();
      console.log('Simulate deposit response body:', responseText);
      
      if (!simulateResponse.ok) {
        console.error('Simulate deposit request failed:', simulateResponse.status, responseText);
        simulateError = {
          status: simulateResponse.status,
          message: responseText
        };
      } else {
        try {
          simulateData = responseText ? JSON.parse(responseText) : null;
          console.log('Simulate deposit successful:', simulateData);
        } catch (parseError) {
          console.error('Failed to parse simulate deposit response:', parseError);
          simulateError = {
            message: 'Invalid JSON response from simulate deposit',
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          };
        }
      }
    } catch (error) {
      console.error('Error calling simulate deposit:', error);
      simulateError = {
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Return the access token and simulate data
    return NextResponse.json({
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
      simulateData: simulateData,
      simulateError: simulateError,
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
