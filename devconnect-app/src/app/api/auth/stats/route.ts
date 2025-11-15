import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';
import { createServerClient } from '../supabaseServerClient';
import { ethers } from 'ethers';

// Relayer addresses
const PAYMENT_RELAYER = '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD';
const SEND_RELAYER = '0xf1e26ea8b039F4f6440494D448bd817A55137F9c';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return authResult.error;
  }

  const { user } = authResult;
  const userEmail = user.email?.toLowerCase();

  if (!userEmail) {
    return NextResponse.json(
      {
        error: 'Authentication error',
        message: 'User email not found',
      },
      { status: 400 }
    );
  }

  // Restrict access to @ethereum.org emails only
  if (!userEmail.endsWith('@ethereum.org')) {
    return NextResponse.json(
      {
        error: 'Access denied',
        message: 'This endpoint is only accessible to @ethereum.org email addresses',
      },
      { status: 403 }
    );
  }

  // Create Supabase client
  const supabase = createServerClient();

  try {
    // Get count of available (unclaimed) links
    const { count: availableLinks, error: availableError } = await supabase
      .from('devconnect_app_claiming_links')
      .select('*', { count: 'exact', head: true })
      .is('claimed_by_user_email', null);

    if (availableError) {
      console.error('Error fetching available links:', availableError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch available links count',
        },
        { status: 500 }
      );
    }

    // Get count of claimed links
    const { count: claimedLinks, error: claimedError } = await supabase
      .from('devconnect_app_claiming_links')
      .select('*', { count: 'exact', head: true })
      .not('claimed_by_user_email', 'is', null);

    if (claimedError) {
      console.error('Error fetching claimed links:', claimedError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch claimed links count',
        },
        { status: 500 }
      );
    }

    // Fetch ETH price from CoinGecko
    let ethPriceUsd = null;
    try {
      const priceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        ethPriceUsd = priceData?.ethereum?.usd || null;
      }
    } catch (priceError) {
      console.error('Error fetching ETH price:', priceError);
    }

    // Fetch relayer data (balance and transaction count)
    let relayerStats = null;
    try {
      const rpcUrl = process.env.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Fetch data for both relayers in parallel
      const [paymentBalance, paymentNonce, sendBalance, sendNonce] = await Promise.all([
        provider.getBalance(PAYMENT_RELAYER),
        provider.getTransactionCount(PAYMENT_RELAYER),
        provider.getBalance(SEND_RELAYER),
        provider.getTransactionCount(SEND_RELAYER),
      ]);

      const paymentBalanceEth = ethers.formatEther(paymentBalance);
      const sendBalanceEth = ethers.formatEther(sendBalance);

      relayerStats = {
        payment: {
          address: PAYMENT_RELAYER,
          balance: paymentBalanceEth,
          balance_usd: ethPriceUsd ? (parseFloat(paymentBalanceEth) * ethPriceUsd).toFixed(2) : null,
          transaction_count: paymentNonce,
        },
        send: {
          address: SEND_RELAYER,
          balance: sendBalanceEth,
          balance_usd: ethPriceUsd ? (parseFloat(sendBalanceEth) * ethPriceUsd).toFixed(2) : null,
          transaction_count: sendNonce,
        },
        eth_price_usd: ethPriceUsd,
      };
    } catch (relayerError) {
      console.error('Error fetching relayer stats:', relayerError);
      // Don't fail the whole request if relayer stats fail
      relayerStats = {
        error: 'Failed to fetch relayer data',
      };
    }

    // Return stats
    return NextResponse.json({
      stats: {
        available_links: availableLinks ?? 0,
        claimed_links: claimedLinks ?? 0,
        total_links: (availableLinks ?? 0) + (claimedLinks ?? 0),
      },
      relayers: relayerStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error in stats endpoint:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

