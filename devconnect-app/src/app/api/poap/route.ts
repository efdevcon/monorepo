import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to verify POAP ownership
 * POST /api/poap
 * Body: { addresses: string[], dropId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { addresses, dropId } = await request.json();

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing addresses' },
        { status: 400 }
      );
    }

    if (!dropId || typeof dropId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing dropId' },
        { status: 400 }
      );
    }

    const result = await checkPoapOwnership(addresses, dropId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('POAP verification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if user owns the specified POAP
 * @param addresses - Array of user addresses to check
 * @param dropId - POAP drop ID to verify
 * @returns Promise<{hasPoap: boolean, mintedOn?: string}> - Result with ownership status and minting date
 */
async function checkPoapOwnership(addresses: string[], dropId: string): Promise<{ hasPoap: boolean, mintedOn?: string }> {
  const POAP_API_URL = 'https://public.compass.poap.tech/v1/graphql';
  
  const query = `query GetPOAPs($addresses: [String!]!, $dropIds: [bigint!]!) {
  poaps(
    where: {
      collector_address: {_in: $addresses}, 
      drop_id: {_in: $dropIds}
    }
  ) {
    id
    collector_address
    drop_id
    chain
    minted_on
  }
}`;

  const variables = {
    addresses: addresses.map(addr => addr.toLowerCase()),
    dropIds: [parseInt(dropId)]
  };

  try {
    const requestBody = {
      query,
      variables
    };
    
    const response = await fetch(POAP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('POAP API error response:', errorText);
      throw new Error(`POAP API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('POAP API errors:', data.errors);
      return { hasPoap: false };
    }

    // Check if any POAPs were found for the user addresses
    const poaps = data.data?.poaps || [];
    const hasPoap = poaps.length > 0;
    
    // Get the minted_on timestamp from the first POAP found
    const mintedOn = hasPoap && poaps[0]?.minted_on ? poaps[0].minted_on : undefined;

    console.log(`POAP check result: ${hasPoap ? 'Found' : 'Not found'} POAP ${dropId} for addresses:`, addresses);
    if (mintedOn) {
      console.log(`POAP minted on: ${mintedOn}`);
    }
    
    return { hasPoap, mintedOn };
  } catch (error) {
    console.error('Error checking POAP ownership:', error);
    return { hasPoap: false };
  }
}
