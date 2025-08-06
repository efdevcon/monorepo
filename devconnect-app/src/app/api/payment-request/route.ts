import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const SIMPLEFI_API_AUTHORIZATION_BEARER = process.env.SIMPLEFI_API_AUTHORIZATION_BEARER;
    
    if (!SIMPLEFI_API_AUTHORIZATION_BEARER) {
      return NextResponse.json(
        { error: 'SIMPLEFI_API_AUTHORIZATION_BEARER environment variable not set' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.simplefi.tech/payment_requests', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${SIMPLEFI_API_AUTHORIZATION_BEARER}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: 0.01,
        currency: 'USD',
        coins: [{ chain_id: 8453, ticker: 'USDC' }],
        reference: {
          _product_id: '688ba8db51fc6c100f32cd63',
          product_name: 'Devconnect Test',
        },
        card_payment: false,
        merchant_id: '6603276727aaa6386588474d',
      }),
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
    console.error('Error fetching payment request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment request' },
      { status: 500 }
    );
  }
} 
