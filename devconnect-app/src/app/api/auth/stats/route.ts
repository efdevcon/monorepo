import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../middleware';
import { createServerClient } from '../supabaseServerClient';
import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';

// Relayer addresses
import { PAYMENT_RELAYER, SEND_RELAYER } from '@/config/config';

// Worldfare.eth domains contract on Base
const WORLDFARE_CONTRACT = '0xd6a7dcdee200fa37f149323c0ad6b3698aa0e829';

// ERC-721 ABI for totalSupply function
const ERC721_ABI = [
  'function totalSupply() view returns (uint256)',
];

const RELAYER_FILE = path.join(process.cwd(), 'src', 'data', 'relayer.json');

async function loadRelayerData(): Promise<any | null> {
  try {
    const raw = await fs.readFile(RELAYER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[Relayer Stats] No precomputed relayer data available:', error instanceof Error ? error.message : error);
    return null;
  }
}

type ProcessedTransfer = {
  from?: string;
  to?: string;
  value: bigint;
  timestamp?: string;
  blockNumber?: string | number;
  transactionHash?: string;
};

function convertRelayerTxs(txs?: any[]): ProcessedTransfer[] {
  if (!Array.isArray(txs)) {
    return [];
  }

  const transfers: ProcessedTransfer[] = [];

  txs.forEach((tx) => {
    const logs = tx?.usdcLogs;
    if (!Array.isArray(logs) || logs.length === 0) {
      return;
    }

    logs.forEach((log: any) => {
      if (!log) return;
      try {
        const value = BigInt(log.value ?? '0');
        transfers.push({
          from: log.from?.toLowerCase?.() ?? log.from,
          to: log.to?.toLowerCase(),
          value,
          timestamp: tx?.timestamp,
          blockNumber: tx?.blockNumber,
          transactionHash: tx?.hash,
        });
      } catch (relayerError) {
        console.warn('[Relayer Stats] Failed to parse relayer log entry:', relayerError);
      }
    });
  });

  return transfers;
}

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

    // Get hourly user creation data (fetch all records with pagination, after Nov 14, 2024)
    const nov14Date = '2025-11-14T00:00:00Z';
    let hourlyData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: hourlyError } = await supabase
        .from('devconnect_app_user')
        .select('created_at')
        .gte('created_at', nov14Date)
        .order('created_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

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

      if (pageData && pageData.length > 0) {
        hourlyData = hourlyData.concat(pageData);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`[Stats] Fetched ${hourlyData.length} user records (${page} pages)`);
    if (hourlyData.length > 0) {
      const lastUser = hourlyData[hourlyData.length - 1];
      console.log(`[Stats] Latest user created_at: ${lastUser.created_at}`);
    }

    // Process hourly data into buckets (using UTC)
    const hourlyBuckets: { [key: string]: number } = {};
    hourlyData.forEach((user) => {
      if (user.created_at) {
        const date = new Date(user.created_at);
        const hourKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:00`;
        hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] || 0) + 1;
      }
    });

    // Convert to sorted array
    const hourlyUserCreation = Object.entries(hourlyBuckets)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    if (hourlyUserCreation.length > 0) {
      console.log(`[Stats] User creation buckets: ${hourlyUserCreation[0].hour} to ${hourlyUserCreation[hourlyUserCreation.length - 1].hour}`);
    }

    // Get hourly claimed link data (fetch all records with pagination)
    let claimedLinksData: any[] = [];
    page = 0;
    hasMore = true;

    while (hasMore) {
      const { data: pageData, error: claimedLinksError } = await supabase
        .from('devconnect_app_claiming_links')
        .select('claimed_date')
        .not('claimed_date', 'is', null)
        .order('claimed_date', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (claimedLinksError) {
        console.error('Error fetching claimed links data:', claimedLinksError);
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to fetch claimed links data',
          },
          { status: 500 }
        );
      }

      if (pageData && pageData.length > 0) {
        claimedLinksData = claimedLinksData.concat(pageData);
        hasMore = pageData.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`[Stats] Fetched ${claimedLinksData.length} claimed link records (${page} pages)`);
    if (claimedLinksData.length > 0) {
      const lastLink = claimedLinksData[claimedLinksData.length - 1];
      console.log(`[Stats] Latest link claimed_date: ${lastLink.claimed_date}`);
    }

    // Process claimed links into hourly buckets (using UTC)
    const claimedLinksBuckets: { [key: string]: number } = {};
    claimedLinksData.forEach((link) => {
      if (link.claimed_date) {
        const date = new Date(link.claimed_date);
        const hourKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:00`;
        claimedLinksBuckets[hourKey] = (claimedLinksBuckets[hourKey] || 0) + 1;
      }
    });

    // Convert to sorted array
    const hourlyClaimedLinks = Object.entries(claimedLinksBuckets)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    if (hourlyClaimedLinks.length > 0) {
      console.log(`[Stats] Claimed links buckets: ${hourlyClaimedLinks[0].hour} to ${hourlyClaimedLinks[hourlyClaimedLinks.length - 1].hour}`);
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
    let dailyRelayerTransactions = null;
    let transactionsByAddress = null;
    let suspiciousAddresses: Array<{
      address: string;
      payment: number;
      send: number;
      payment_test: number;
      send_test: number;
      total: number;
      total_test: number;
    }> = [];

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

      // Fetch historical transaction data for both relayers using Basescan API
      try {
        console.log('[Relayer Stats] Using Basescan API for transaction history...');

        // Use Basescan's tokentx endpoint to get ERC-20 token transfers
        const basescanApiKey = process.env.BASESCAN_API_KEY;

        if (!basescanApiKey) {
          console.warn('[Relayer Stats] BASESCAN_API_KEY not set - showing aggregate counts only');

          // Fallback: show aggregate counts
          const today = new Date().toISOString().split('T')[0];
          dailyRelayerTransactions = [{
            date: today,
            payment: paymentNonce,
            send: sendNonce,
            payment_test: 0,
            send_test: 0,
            total: paymentNonce + sendNonce,
            total_test: 0,
          }];
          transactionsByAddress = [];
        } else {
          console.log('[Relayer Stats] Querying Basescan for USDC transfers...');

          // Minimum amount: 1 USDC = 1000000 (6 decimals)
          const MIN_USDC_AMOUNT = 1000000;

          // Process transactions by day
          type DailyCounts = {
            payment: number;
            send: number;
            payment_test: number;
            send_test: number;
            payment_value: number;
            send_value: number;
          };
          const dailyTxMap: Record<string, DailyCounts> = {};
          type AddressCounts = {
            payment: number;
            send: number;
            payment_test: number;
            send_test: number;
            payment_value: number;
            send_value: number;
          };
          const addressTxMap: Record<string, AddressCounts> = {};
          const suspiciousAddressMap: Record<string, AddressCounts> = {};
          const SUSPICIOUS_THRESHOLD = 10;
          type TransferRecord = {
            from?: string;
            to?: string;
            dateKey: string;
            type: 'payment' | 'send';
            isTest: boolean;
            valueUsdc: number;
          };
          const transferRecords: TransferRecord[] = [];

          // USDC contract address on Base
          const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
          const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const RELAYER_HISTORY_START_BLOCK = process.env.RELAYER_HISTORY_START_BLOCK
            ? Number(process.env.RELAYER_HISTORY_START_BLOCK)
            : 0;
          const startBlockParam = Number.isFinite(RELAYER_HISTORY_START_BLOCK) && RELAYER_HISTORY_START_BLOCK > 0
            ? RELAYER_HISTORY_START_BLOCK
            : 0;
          const RELAYER_FALLBACK_LOOKBACK_BLOCKS = process.env.RELAYER_FALLBACK_LOOKBACK_BLOCKS
            ? Number(process.env.RELAYER_FALLBACK_LOOKBACK_BLOCKS)
            : 0; // 0 = full history
          const fallbackLookbackBlocks = Number.isFinite(RELAYER_FALLBACK_LOOKBACK_BLOCKS) && RELAYER_FALLBACK_LOOKBACK_BLOCKS > 0
            ? RELAYER_FALLBACK_LOOKBACK_BLOCKS
            : 0;
          console.log(`[Relayer Stats] Basescan history start block: ${startBlockParam}`);

          // Basescan API V2 base URL (Base mainnet)
          const BASESCAN_API_URL = 'https://api.basescan.org/v2/api';
          const BASESCAN_CHAIN_ID = '8453'; // Base mainnet chain id
          const BASESCAN_PAGE_SIZE = 1000; // V2 max offset
          const BASESCAN_MAX_PAGES = 50; // Safeguard to avoid runaway loops
          const BASESCAN_RATE_LIMIT_DELAY = 300; // ms between calls

          const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

          // Fetch ERC-20 token transfers using Basescan API V2 with pagination + retry
          let basescanHealthy = true;

          const fetchTokenTransfersByAddress = async (address: string): Promise<any[] | null> => {
            if (!basescanHealthy) {
              console.warn('[Relayer Stats] Basescan already marked unhealthy, skipping request...');
              return null;
            }
            console.log(`[Relayer Stats] Fetching token transfers from ${address} via Basescan V2 API...`);

            const sanitizedAddress = address.toLowerCase();
            const transfers: any[] = [];
            let page = 1;
            let retries = 0;
            const MAX_RETRIES = 3;

            while (page <= BASESCAN_MAX_PAGES) {
              const url = `${BASESCAN_API_URL}?chainid=${BASESCAN_CHAIN_ID}&module=account&action=tokentx&address=${address}&contractaddress=${USDC_ADDRESS}&startblock=${startBlockParam}&endblock=99999999&page=${page}&offset=${BASESCAN_PAGE_SIZE}&sort=asc&apikey=${basescanApiKey}`;
              console.log(`[Relayer Stats] Basescan V2 URL (page ${page}): ${url.replace(basescanApiKey, 'API_KEY_HIDDEN')}`);

              try {
                const response = await fetch(url, {
                  headers: {
                    Accept: 'application/json',
                    'User-Agent': 'devconnect-app/1.0 (+https://github.com/ethereum/devconnect-app)',
                    'X-API-Key': basescanApiKey,
                  },
                });
                const rawBody = await response.text();
                let data: any;

                try {
                  data = JSON.parse(rawBody);
                } catch (parseError) {
                  retries++;
                  const backoff = BASESCAN_RATE_LIMIT_DELAY * retries * 5;
                  const preview = rawBody.slice(0, 180);
                  console.warn(
                    `[Relayer Stats] Basescan returned non-JSON response on page ${page} (retry ${retries}/${MAX_RETRIES}) - backing off ${backoff}ms... Preview: ${preview}`
                  );
                  if (retries > MAX_RETRIES) {
                    console.error(
                      `[Relayer Stats] Aborting Basescan fetch for ${sanitizedAddress} after repeated non-JSON responses`
                    );
                    basescanHealthy = false;
                    return null;
                  }
                  await delay(backoff);
                  continue;
                }

                console.log(`[Relayer Stats] Basescan V2 response status: ${data.status}, message: ${data.message}, page=${page}, count=${Array.isArray(data.result) ? data.result.length : 0}`);

                if (data.status === '1' && Array.isArray(data.result)) {
                  if (page === 1 && data.result.length > 0) {
                    console.log(`[Relayer Stats] Relayer transfer:`, JSON.stringify(data.result[0], null, 2));
                  }

                  transfers.push(...data.result);

                  if (data.result.length < BASESCAN_PAGE_SIZE) {
                    console.log(`[Relayer Stats] Completed fetching transfers for ${sanitizedAddress} in ${page} pages (total ${transfers.length})`);
                    break;
                  }

                  page++;
                  retries = 0;
                  await delay(BASESCAN_RATE_LIMIT_DELAY);
                } else if (
                  data.status === '0' &&
                  typeof data.result === 'string' &&
                  data.result.toLowerCase().includes('max rate limit reached') &&
                  retries < MAX_RETRIES
                ) {
                  retries++;
                  const backoff = BASESCAN_RATE_LIMIT_DELAY * retries * 4;
                  console.warn(`[Relayer Stats] Basescan rate limit hit (retry ${retries}/${MAX_RETRIES}) - backing off ${backoff}ms...`);
                  await delay(backoff);
                } else if (
                  data.status === '0' &&
                  typeof data.result === 'string' &&
                  data.result.toLowerCase().includes('no transactions found')
                ) {
                  console.log(`[Relayer Stats] Basescan reports no transfers for ${sanitizedAddress}`);
                  break;
                } else {
                  console.error(`[Relayer Stats] Basescan API V2 error on page ${page}:`, data);
                  basescanHealthy = false;
                  return null;
                }
              } catch (pageError) {
                retries++;
                if (retries > MAX_RETRIES) {
                  console.error(
                    `[Relayer Stats] Basescan request failed after ${MAX_RETRIES} retries for page ${page}:`,
                    pageError
                  );
                  basescanHealthy = false;
                  return null;
                }
                const backoff = BASESCAN_RATE_LIMIT_DELAY * retries * 5;
                console.warn(`[Relayer Stats] Basescan fetch error (retry ${retries}/${MAX_RETRIES}) - backing off ${backoff}ms...`, pageError);
                await delay(backoff);
              }
            }

            console.log(`[Relayer Stats] Total transfers fetched for ${sanitizedAddress}: ${transfers.length}`);
            return transfers;
          };

          const fetchTransfersFromRpcLogs = async (address: string): Promise<ProcessedTransfer[] | null> => {
            try {
              console.log(`[Relayer Stats] Falling back to RPC log scan for ${address}...`);
              const currentBlock = await provider.getBlockNumber();
              const senderTopic = `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;
              const rangeStart =
                startBlockParam > 0
                  ? Math.min(startBlockParam, currentBlock)
                  : fallbackLookbackBlocks > 0
                    ? Math.max(0, currentBlock - fallbackLookbackBlocks)
                    : 0;

              console.log(`[Relayer Stats] RPC log scan range: blocks ${rangeStart} - ${currentBlock}`);

              const fetchLogsInChunks = async () => {
                const logs: any[] = [];
                const CHUNK_SIZE = 4000;
                for (let fromBlock = rangeStart; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
                  const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
                  const chunk = await provider.getLogs({
                    address: USDC_ADDRESS,
                    topics: [TRANSFER_TOPIC, senderTopic],
                    fromBlock,
                    toBlock,
                  });
                  logs.push(...chunk);
                }
                return logs;
              };

              let logs: any[] = [];
              try {
                logs = await provider.getLogs({
                  address: USDC_ADDRESS,
                  topics: [TRANSFER_TOPIC, senderTopic],
                  fromBlock: rangeStart,
                  toBlock: 'latest',
                });
              } catch (rangeError) {
                console.warn('[Relayer Stats] RPC log query too large, chunking...', rangeError);
                logs = await fetchLogsInChunks();
              }

              console.log(`[Relayer Stats] RPC log scan found ${logs.length} entries for ${address}`);

              const blockTimestampCache: Map<number, string> = new Map();
              const getTimestamp = async (blockNumber: number) => {
                if (!blockTimestampCache.has(blockNumber)) {
                  const block = await provider.getBlock(blockNumber);
                  if (!block) {
                    return null;
                  }
                  blockTimestampCache.set(blockNumber, new Date(block.timestamp * 1000).toISOString());
                }
                return blockTimestampCache.get(blockNumber) ?? null;
              };

              const transfers: ProcessedTransfer[] = [];
              for (const log of logs) {
                try {
                  if (!log.topics[2]) continue;
                  const to = ethers.getAddress(`0x${log.topics[2].slice(26)}`);
                  const from = ethers.getAddress(`0x${log.topics[1].slice(26)}`);
                  const blockNumber = typeof log.blockNumber === 'bigint' ? Number(log.blockNumber) : log.blockNumber;
                  const timestamp = await getTimestamp(blockNumber);
                  if (!timestamp) continue;
                  transfers.push({
                    from,
                    to,
                    value: BigInt(log.data),
                    timestamp,
                    blockNumber,
                    transactionHash: log.transactionHash,
                  });
                } catch (logError) {
                  console.error('[Relayer Stats] Error processing RPC log entry:', logError);
                }
              }

              return transfers;
            } catch (rpcError) {
              console.error(`[Relayer Stats] RPC fallback failed for ${address}:`, rpcError);
              return null;
            }
          };

          let paymentTransfers: ProcessedTransfer[] = [];
          let sendTransfers: ProcessedTransfer[] = [];
          let transferSource: 'relayer' | 'basescan' | 'rpc' | 'none' = 'none';
          const relayerData = await loadRelayerData();

          let paymentTxs: any[] | null = null;
          let sendTxs: any[] | null = null;

          if (!relayerData) {
            console.log('[Relayer Stats] Fetching payment relayer token transfers...');
            paymentTxs = await fetchTokenTransfersByAddress(PAYMENT_RELAYER);

            console.log('[Relayer Stats] Fetching send relayer token transfers...');
            sendTxs = await fetchTokenTransfersByAddress(SEND_RELAYER);
          }

          if (relayerData) {
            console.log('[Relayer Stats] Using precomputed relayer data');
            paymentTransfers = convertRelayerTxs(relayerData.payment);
            sendTransfers = convertRelayerTxs(relayerData.send);
            transferSource = 'relayer';
          } else if (paymentTxs && sendTxs) {
            console.log(`[Relayer Stats] Found ${paymentTxs.length} payment transfers, ${sendTxs.length} send transfers (Basescan)`);

            paymentTransfers = paymentTxs
              .filter((tx: any) => tx.from.toLowerCase() === PAYMENT_RELAYER.toLowerCase())
              .map((tx: any) => ({
                to: tx.to,
                value: BigInt(tx.value),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                blockNumber: tx.blockNumber,
                transactionHash: tx.hash
              }));

            sendTransfers = sendTxs
              .filter((tx: any) => tx.from.toLowerCase() === SEND_RELAYER.toLowerCase())
              .map((tx: any) => ({
                to: tx.to,
                value: BigInt(tx.value),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                blockNumber: tx.blockNumber,
                transactionHash: tx.hash
              }));

            transferSource = 'basescan';

            console.log(`[Relayer Stats] Filtered to ${paymentTransfers.length} payment transfers, ${sendTransfers.length} send transfers (sent from relayers)`);
          } else {
            console.warn('[Relayer Stats] Basescan transfer fetch failed - will attempt RPC fallback...');
          }

          const ensureTransferData = async () => {
            if (transferSource !== 'none') {
              return;
            }

            const paymentFallback = await fetchTransfersFromRpcLogs(PAYMENT_RELAYER);
            const sendFallback = await fetchTransfersFromRpcLogs(SEND_RELAYER);

            if (paymentFallback && sendFallback) {
              paymentTransfers = paymentFallback;
              sendTransfers = sendFallback;
              transferSource = 'rpc';
              console.log(`[Relayer Stats] RPC fallback produced ${paymentTransfers.length} payment transfers, ${sendTransfers.length} send transfers`);
            }
          };

          await ensureTransferData();

          if (transferSource === 'none') {
            console.warn('[Relayer Stats] No relayer transfer data available after Basescan + RPC fallback - using aggregate counts only');
            const today = new Date().toISOString().split('T')[0];
            dailyRelayerTransactions = [{
              date: today,
              payment: paymentNonce,
              send: sendNonce,
              payment_test: 0,
              send_test: 0,
              total: paymentNonce + sendNonce,
              total_test: 0,
            }];
            transactionsByAddress = [];
          }

          if (transferSource !== 'none') {
            let transfersFound = 0;

            // Process payment relayer transfers
            for (const transfer of paymentTransfers) {
              try {
                // transfer.value is a BigInt with raw USDC amount (6 decimals)
                const valueRaw = Number(transfer.value);
                const isTest = valueRaw < MIN_USDC_AMOUNT;

                // Get timestamp
                const timestamp = transfer.timestamp;
                if (!timestamp) continue;

                const date = new Date(timestamp);
                const dateKey = date.toISOString().split('T')[0];

                const fromAddr = transfer.from?.toLowerCase();
                const toAddr = transfer.to?.toLowerCase();
                if (!fromAddr) continue;

                const valueUsdc = Number(transfer.value) / 1_000_000;

                transferRecords.push({
                  from: fromAddr,
                  to: toAddr,
                  dateKey,
                  type: 'payment',
                  isTest,
                  valueUsdc,
                });

                transfersFound++;
              } catch (error) {
                console.error('[Relayer Stats] Error processing payment transfer:', error);
              }
            }

            // Process send relayer transfers
            for (const transfer of sendTransfers) {
              try {
                // transfer.value is a BigInt with raw USDC amount (6 decimals)
                const valueRaw = Number(transfer.value);
                const isTest = valueRaw < MIN_USDC_AMOUNT;

                // Get timestamp
                const timestamp = transfer.timestamp;
                if (!timestamp) continue;

                const date = new Date(timestamp);
                const dateKey = date.toISOString().split('T')[0];

                const fromAddr = transfer.from?.toLowerCase();
                const toAddr = transfer.to?.toLowerCase();
                if (!fromAddr) continue;

                const valueUsdc = Number(transfer.value) / 1_000_000;

                transferRecords.push({
                  from: fromAddr,
                  to: toAddr,
                  dateKey,
                  type: 'send',
                  isTest,
                  valueUsdc,
                });

                transfersFound++;
              } catch (error) {
                console.error('[Relayer Stats] Error processing send transfer:', error);
              }
            }

            const senderCounts: Record<string, number> = {};
            const recipientCounts: Record<string, number> = {};
            transferRecords.forEach((record) => {
              if (record.isTest) return;
              if (record.from) {
                senderCounts[record.from] = (senderCounts[record.from] || 0) + 1;
              }
              if (record.to) {
                recipientCounts[record.to] = (recipientCounts[record.to] || 0) + 1;
              }
            });

            const suspiciousSet = new Set<string>();
            Object.entries(senderCounts).forEach(([addr, count]) => {
              if (count > SUSPICIOUS_THRESHOLD) {
                suspiciousSet.add(addr);
              }
            });
            Object.entries(recipientCounts).forEach(([addr, count]) => {
              if (count > SUSPICIOUS_THRESHOLD) {
                suspiciousSet.add(addr);
              }
            });

            transferRecords.forEach((record) => {
              const { from, to, dateKey, type, isTest } = record;
              const dailyKey = type === 'payment' ? 'payment' : 'send';
              const dailyTestKey = type === 'payment' ? 'payment_test' : 'send_test';
              const suspiciousAddr =
                (from && suspiciousSet.has(from) ? from : undefined) ||
                (to && suspiciousSet.has(to) ? to : undefined);

              if (suspiciousAddr) {
                if (!suspiciousAddressMap[suspiciousAddr]) {
                  suspiciousAddressMap[suspiciousAddr] = {
                    payment: 0,
                    send: 0,
                    payment_test: 0,
                    send_test: 0,
                    payment_value: 0,
                    send_value: 0,
                  };
                }
                if (isTest) {
                  suspiciousAddressMap[suspiciousAddr][dailyTestKey]++;
                } else {
                  suspiciousAddressMap[suspiciousAddr][dailyKey]++;
                  const valueKey = type === 'payment' ? 'payment_value' : 'send_value';
                  suspiciousAddressMap[suspiciousAddr][valueKey] += record.valueUsdc;
                }
                return;
              }

              if (!from) return;

              if (!dailyTxMap[dateKey]) {
                dailyTxMap[dateKey] = {
                  payment: 0,
                  send: 0,
                  payment_test: 0,
                  send_test: 0,
                  payment_value: 0,
                  send_value: 0,
                };
              }
              if (isTest) {
                dailyTxMap[dateKey][dailyTestKey]++;
              } else {
                dailyTxMap[dateKey][dailyKey]++;
                const valueKey = type === 'payment' ? 'payment_value' : 'send_value';
                dailyTxMap[dateKey][valueKey] += record.valueUsdc;
              }

              if (!addressTxMap[from]) {
                addressTxMap[from] = {
                  payment: 0,
                  send: 0,
                  payment_test: 0,
                  send_test: 0,
                  payment_value: 0,
                  send_value: 0,
                };
              }
              if (isTest) {
                addressTxMap[from][dailyTestKey]++;
              } else {
                addressTxMap[from][dailyKey]++;
                const valueKey = type === 'payment' ? 'payment_value' : 'send_value';
                addressTxMap[from][valueKey] += record.valueUsdc;
              }
            });

            // Convert to arrays sorted by date/count for non-suspicious addresses
            dailyRelayerTransactions = Object.entries(dailyTxMap)
              .map(([date, counts]) => ({
                date,
                payment: counts.payment,
                send: counts.send,
                payment_test: counts.payment_test,
                send_test: counts.send_test,
                total: counts.payment + counts.send,
                total_test: counts.payment_test + counts.send_test,
                payment_value: counts.payment_value,
                send_value: counts.send_value,
                total_value: counts.payment_value + counts.send_value,
              }))
              .sort((a, b) => a.date.localeCompare(b.date));

            transactionsByAddress = Object.entries(addressTxMap)
              .map(([address, counts]) => ({
                address,
                payment: counts.payment,
                send: counts.send,
                payment_test: counts.payment_test,
                send_test: counts.send_test,
                total: counts.payment + counts.send,
                total_test: counts.payment_test + counts.send_test,
                payment_value: counts.payment_value,
                send_value: counts.send_value,
                total_value: counts.payment_value + counts.send_value,
              }))
              .sort((a, b) => b.total - a.total);

            suspiciousAddresses = Object.entries(suspiciousAddressMap)
              .map(([address, counts]) => ({
                address,
                payment: counts.payment,
                send: counts.send,
                payment_test: counts.payment_test,
                send_test: counts.send_test,
                total: counts.payment + counts.send,
                total_test: counts.payment_test + counts.send_test,
                payment_value: counts.payment_value,
                send_value: counts.send_value,
                total_value: counts.payment_value + counts.send_value,
              }))
              .sort((a, b) => b.total - a.total);

            console.log(`[Relayer Stats] Processed ${transfersFound} USDC transfers via ${transferSource}`);
            console.log(`[Relayer Stats] Aggregated ${dailyRelayerTransactions.length} days of transaction data`);
            console.log(`[Relayer Stats] Found ${transactionsByAddress.length} unique recipient addresses`);

            const totalTxs = dailyRelayerTransactions.reduce((sum, day) => sum + day.total, 0);
            const totalTestTxs = dailyRelayerTransactions.reduce((sum, day) => sum + day.total_test, 0);
            console.log(`[Relayer Stats] Total: ${totalTxs} transactions (${totalTestTxs} test txs < 1 USDC)`);

            console.log(`[Relayer Stats] Total: ${totalTxs} transactions (${totalTestTxs} test txs < 1 USDC)`);
          }
        }
      } catch (historyError) {
        console.error('Error fetching relayer transaction history:', historyError);
        // Fallback to aggregate counts
        const today = new Date().toISOString().split('T')[0];
        dailyRelayerTransactions = [{
          date: today,
          payment: paymentNonce,
          send: sendNonce,
          payment_test: 0,
          send_test: 0,
          total: paymentNonce + sendNonce,
          total_test: 0,
          payment_value: 0,
          send_value: 0,
          total_value: 0,
        }];
        transactionsByAddress = [];
      }
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
      hourly_claimed_links: hourlyClaimedLinks,
      relayers: relayerStats,
      daily_relayer_transactions: dailyRelayerTransactions,
      transactions_by_address: transactionsByAddress,
      suspicious_addresses: suspiciousAddresses,
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

