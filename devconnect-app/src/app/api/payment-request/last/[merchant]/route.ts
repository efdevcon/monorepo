import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchant: string }> }
) {
  try {
    const SIMPLEFI_API_AUTHORIZATION_BEARER = process.env.SIMPLEFI_API_AUTHORIZATION_BEARER;

    if (!SIMPLEFI_API_AUTHORIZATION_BEARER) {
      return NextResponse.json(
        { error: 'SIMPLEFI_API_AUTHORIZATION_BEARER environment variable not set' },
        { status: 500 }
      );
    }

    const { merchant } = await params;

    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.simplefi.tech/payment_requests/last/${merchant}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${SIMPLEFI_API_AUTHORIZATION_BEARER}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SimpleFi Last Payment Request API error:', response.status, errorText);
      return NextResponse.json(
        { error: `SimpleFi Last Payment Request API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching last payment request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last payment request' },
      { status: 500 }
    );
  }
}
