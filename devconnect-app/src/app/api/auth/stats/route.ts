import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';
import { createServerClient } from '../supabaseServerClient';
import { ethers } from 'ethers';

// Relayer addresses
import { PAYMENT_RELAYER, SEND_RELAYER } from '@/config/config';

// Worldfare.eth domains contract on Base
const WORLDFARE_CONTRACT = '0xd6a7dcdee200fa37f149323c0ad6b3698aa0e829';

// ERC-721 ABI for totalSupply function
const ERC721_ABI = [
  'function totalSupply() view returns (uint256)',
];

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

    // Get count of users who created accounts
    const { count: totalUsers, error: usersError } = await supabase
      .from('devconnect_app_user')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Error fetching users count:', usersError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch users count',
        },
        { status: 500 }
      );
    }

    // Get hourly user creation data (only after Nov 3, 2025)
    const nov3Date = '2025-11-03T00:00:00Z';
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('devconnect_app_user')
      .select('created_at')
      .gte('created_at', nov3Date)
      .order('created_at', { ascending: true });

    if (hourlyError) {
      console.error('Error fetching hourly user data:', hourlyError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch hourly user data',
        },
        { status: 500 }
      );
    }

    // Process hourly data into buckets
    const hourlyBuckets: { [key: string]: number } = {};
    hourlyData?.forEach((user) => {
      if (user.created_at) {
        const date = new Date(user.created_at);
        const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] || 0) + 1;
      }
    });

    // Convert to sorted array
    const hourlyUserCreation = Object.entries(hourlyBuckets)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

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

    // Fetch worldfare.eth domains count
    let worldfareDomains = undefined;
    try {
      const rpcUrl = process.env.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(WORLDFARE_CONTRACT, ERC721_ABI, provider);
      
      const totalSupply = await contract.totalSupply();
      worldfareDomains = Number(totalSupply);
    } catch (worldfareError) {
      console.error('Error fetching worldfare domains:', worldfareError);
      // Don't fail the whole request if worldfare stats fail
    }

    // Fetch quest completion stats with pagination to get ALL users
    let questCompletionStats: Record<string, number> = {};
    try {
      let allUsers: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all users with pagination
      while (hasMore) {
        const { data: users, error: questError } = await supabase
          .from('devconnect_app_user')
          .select('quests')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (questError) {
          console.error('Error fetching quest stats:', questError);
          break;
        }

        if (users && users.length > 0) {
          allUsers = allUsers.concat(users);
          hasMore = users.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`[Quest Stats] Fetched ${allUsers.length} users for quest completion stats`);

      // Count completions per quest ID
      allUsers.forEach((user) => {
        if (user.quests) {
          Object.keys(user.quests).forEach((questId) => {
            questCompletionStats[questId] = (questCompletionStats[questId] || 0) + 1;
          });
        }
      });

      console.log(`[Quest Stats] Found completions for ${Object.keys(questCompletionStats).length} unique quests`);
      console.log('[Quest Stats] Top 5 completed quests:', Object.entries(questCompletionStats).sort((a, b) => b[1] - a[1]).slice(0, 5));
    } catch (questStatsError) {
      console.error('Error fetching quest completion stats:', questStatsError);
      // Don't fail the whole request if quest stats fail
    }

    // Return stats
    return NextResponse.json({
      stats: {
        available_links: availableLinks ?? 0,
        claimed_links: claimedLinks ?? 0,
        total_links: (availableLinks ?? 0) + (claimedLinks ?? 0),
        total_users: totalUsers ?? 0,
        worldfare_domains: worldfareDomains,
      },
      hourly_user_creation: hourlyUserCreation,
      relayers: relayerStats,
      quest_completions: questCompletionStats,
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

