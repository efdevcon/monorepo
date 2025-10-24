import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  console.log('=== Payment Request by Order ID endpoint called ===');
  
  try {
    const SIMPLEFI_API_AUTHORIZATION_BEARER = process.env.SIMPLEFI_API_AUTHORIZATION_BEARER;

    if (!SIMPLEFI_API_AUTHORIZATION_BEARER) {
      console.error('SIMPLEFI_API_AUTHORIZATION_BEARER not set');
      return NextResponse.json(
        { error: 'SIMPLEFI_API_AUTHORIZATION_BEARER environment variable not set' },
        { status: 500 }
      );
    }

    const { order_id } = await params;
    console.log('Order ID received:', order_id);

    if (!order_id) {
      console.error('Order ID is missing');
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Create the filter parameter as a JSON string
    // Filter by memo instead of order_id
    const filter = JSON.stringify({ memo: order_id });
    console.log('Filter created:', filter);
    
    const url = new URL('https://api.simplefi.tech/payment_requests');
    url.searchParams.set('filter', filter);
    console.log('Full URL:', url.toString());

    console.log('Making fetch request...');
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${SIMPLEFI_API_AUTHORIZATION_BEARER}`,
      },
    });

    console.log('Fetch completed! Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SimpleFi Payment Request by Order ID API error:', response.status, errorText);
      return NextResponse.json(
        { error: `SimpleFi Payment Request by Order ID API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching payment request by order ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment request by order ID' },
      { status: 500 }
    );
  }
}

