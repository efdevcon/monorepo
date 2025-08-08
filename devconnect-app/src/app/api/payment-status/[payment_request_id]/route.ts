import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payment_request_id: string }> }
) {
  try {
    const SIMPLEFI_API_AUTHORIZATION_BEARER = process.env.SIMPLEFI_API_AUTHORIZATION_BEARER;
    
    if (!SIMPLEFI_API_AUTHORIZATION_BEARER) {
      return NextResponse.json(
        { error: 'SIMPLEFI_API_AUTHORIZATION_BEARER environment variable not set' },
        { status: 500 }
      );
    }

    const { payment_request_id } = await params;

    if (!payment_request_id) {
      return NextResponse.json(
        { error: 'Payment request ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.simplefi.tech/payment_requests/${payment_request_id}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${SIMPLEFI_API_AUTHORIZATION_BEARER}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SimpleFi API error:', response.status, errorText);
      return NextResponse.json(
        { error: `SimpleFi API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
