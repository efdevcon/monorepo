import { NextRequest, NextResponse } from 'next/server';
import { PAYMENT_CONFIG } from '@/config/config';

export async function GET(request: NextRequest) {
  try {
    const SIMPLEFI_API_AUTHORIZATION_BEARER = process.env.SIMPLEFI_API_AUTHORIZATION_BEARER;

    if (!SIMPLEFI_API_AUTHORIZATION_BEARER) {
      return NextResponse.json(
        { error: 'SIMPLEFI_API_AUTHORIZATION_BEARER environment variable not set' },
        { status: 500 }
      );
    }

    // Get parameters from query string
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const ticker = searchParams.get('ticker') || 'USDC';
    const chainId = searchParams.get('chainId') || '8453';

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.simplefi.tech/payment_requests/${paymentId}/add_transaction`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${SIMPLEFI_API_AUTHORIZATION_BEARER}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ticker: ticker,
        chain_id: parseInt(chainId)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SimpleFi Payment Requests API error:', response.status, errorText);
      return NextResponse.json(
        { error: `SimpleFi Payment Requests API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding transaction to payment request:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction to payment request' },
      { status: 500 }
    );
  }
}

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
        amount: 8,
        currency: 'ARS',
        coins: [{ chain_id: 8453, ticker: 'USDC' }],
        reference: {
          _product_id: '688ba8db51fc6c100f32cd63',
          product_name: 'Devconnect Test',
        },
        card_payment: false,
        merchant_id: PAYMENT_CONFIG.MERCHANT_ID,
        // memo: 'DEVCONNECT-TEST-1-11',
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
