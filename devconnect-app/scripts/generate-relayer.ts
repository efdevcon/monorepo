#!/usr/bin/env tsx

/**
 * Fetch Base relayer transactions via Zapper, decode USDC logs from receipts,
 * and cache the results so the API can reuse them without hitting the chain.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-relayer.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { PAYMENT_RELAYER, SEND_RELAYER } from '../src/config/config';
import { ethers } from 'ethers';

// Load environment variables from .env.local if it exists
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_APIKEY;
const ALCHEMY_RPC_URL =
  process.env.ALCHEMY_RPC_URL ||
  (ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : null);

if (!ALCHEMY_RPC_URL) {
  console.error('Missing ALCHEMY_RPC_URL or ALCHEMY_API_KEY/NEXT_PUBLIC_ALCHEMY_APIKEY');
  process.exit(1);
}

const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY;
if (!ZAPPER_API_KEY) {
  console.error('Missing ZAPPER_API_KEY for Zapper GraphQL access');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MAX_TRANSACTIONS_PER_RELAYER = Number(process.env.RELAYER_MAX_TRANSACTIONS || 200);
const MIN_USDC_VALUE_WEI = BigInt(1_000_000); // 1 USDC (6 decimals)
const ZAPPER_ENDPOINT = 'https://public.zapper.xyz/graphql';
const BASE_CHAIN_ID = 8453;
const TRANSACTION_HISTORY_QUERY = `
  query TransactionDescriptionExample($subjects: [Address!]!, $perspective: TransactionHistoryV2Perspective, $first: Int, $filters: TransactionHistoryV2FiltersArgs, $after: String) {
    transactionHistoryV2(subjects: $subjects, perspective: $perspective, first: $first, filters: $filters, after: $after) {
      edges {
        cursor
        node {
          ... on TimelineEventV2 {
            interpretation {
              processedDescription
              description
            }
            transaction {
              hash
              timestamp
              network
            }
          }
          ... on ActivityTimelineEventDelta {
            transactionHash
            transactionBlockTimestamp
            network
            subject
            from {
              address
              isContract
            }
            to {
              address
              isContract
            }
            networkObject {
              chainId
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

type TxSummary = {
  hash: string;
  timestamp?: string;
};

type UsdcLog = {
  from: string;
  to: string;
  value: string;
};

type StoredTx = {
  hash: string;
  timestamp?: string;
  blockNumber?: number;
  usdcLogs: UsdcLog[];
};

type RelayerFile = {
  fetchedAt: string;
  payment?: StoredTx[];
  send?: StoredTx[];
  meta?: {
    payment?: { historyComplete?: boolean };
    send?: { historyComplete?: boolean };
  };
};

function deriveChainId(node: any): number | null {
  if (typeof node?.transaction?.network === 'number') return node.transaction.network;
  if (typeof node?.networkObject?.chainId === 'number') return node.networkObject.chainId;
  if (typeof node?.network === 'number') return node.network;

  const networkString =
    typeof node?.transaction?.network === 'string'
      ? node.transaction.network
      : typeof node?.network === 'string'
        ? node.network
        : null;

  if (networkString) {
    const normalized = networkString.toUpperCase();
    if (normalized.includes('BASE')) {
      return BASE_CHAIN_ID;
    }
  }

  return null;
}

async function fetchRelayerTxs(
  address: string,
  existingHashes: Set<string>,
  historyComplete: boolean
): Promise<{ summaries: TxSummary[]; exhaustedHistory: boolean }> {
  console.log(
    `[Relayer] Fetching new hashes for ${address} (existing=${existingHashes.size}, historyComplete=${historyComplete})`
  );
  const summaries: TxSummary[] = [];
  const seen = new Set<string>();
  let afterCursor: string | null = null;
  let exhaustedHistory = historyComplete;
  let iteration = 0;

  while (summaries.length < MAX_TRANSACTIONS_PER_RELAYER) {
    const remaining = MAX_TRANSACTIONS_PER_RELAYER - summaries.length;
    const first = Math.min(20, remaining);
    console.log(
      `[Relayer] Querying Zapper for ${address}: first=${first}, after=${afterCursor ?? 'null'} (iteration ${
        iteration + 1
      })`
    );
    iteration++;

    const response = await fetch(ZAPPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zapper-api-key': ZAPPER_API_KEY as string,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        operationName: 'TransactionDescriptionExample',
        query: TRANSACTION_HISTORY_QUERY,
        variables: {
          subjects: [address],
          perspective: 'All',
          first,
          filters: {
            chainIds: [BASE_CHAIN_ID],
          },
          after: afterCursor,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Zapper GraphQL error ${response.status} ${response.statusText}: ${errorBody}`);
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (parseError) {
      const text = await response.text();
      throw new Error(`Zapper GraphQL parse error: ${text}`);
    }

    if (payload.errors) {
      throw new Error(`Zapper GraphQL returned errors: ${JSON.stringify(payload.errors)}`);
    }

    const connection = payload.data?.transactionHistoryV2;
    const edges = connection?.edges ?? [];
    console.log(`[Relayer] Received ${edges.length} edges for ${address}`);

    for (const edge of edges) {
      const node = edge?.node;
      if (!node) continue;

      const hash = node.transaction?.hash || node.transactionHash;
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);

      if (existingHashes.has(hash)) {
        console.log(`[Relayer] Skipping existing hash ${hash}`);
        continue;
      }

      const chainId = deriveChainId(node);
      if (chainId !== BASE_CHAIN_ID) continue;

      const timestamp = node.transaction?.timestamp || node.transactionBlockTimestamp;

      summaries.push({
        hash,
        timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
      });
      console.log(`[Relayer] Added new hash ${hash} (${summaries.length}/${MAX_TRANSACTIONS_PER_RELAYER})`);

      if (summaries.length >= MAX_TRANSACTIONS_PER_RELAYER) {
        break;
      }
    }

    const hasNext = connection?.pageInfo?.hasNextPage;
    if (!hasNext || summaries.length >= MAX_TRANSACTIONS_PER_RELAYER || historyComplete) {
      console.log(`[Relayer] Stopping fetch for ${address} (hasNextPage=${hasNext}, historyComplete=${historyComplete})`);
      if (!hasNext) {
        exhaustedHistory = true;
      }
      break;
    }

    afterCursor = connection.pageInfo.endCursor;
    if (!afterCursor) {
      console.log(`[Relayer Sample] No endCursor returned for ${address}, stopping pagination`);
      break;
    }
  }
  console.log(
    `[Relayer Sample] Finished fetching new hashes for ${address}: ${summaries.length} new entries (exhaustedHistory=${exhaustedHistory})`
  );

  return { summaries, exhaustedHistory };
}

function decodeAddress(topic: string): string {
  return `0x${topic.slice(26)}`.toLowerCase();
}

function extractUsdcLogs(receipt: ethers.TransactionReceipt | null): UsdcLog[] {
  if (!receipt?.logs) return [];

  return receipt.logs
    .filter(
      (log) =>
        log.address?.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics?.[0] === TRANSFER_TOPIC &&
        log.topics[1]
    )
    .map((log) => ({
      from: decodeAddress(log.topics[1]),
      to: decodeAddress(log.topics[2]),
      value: BigInt(log.data || '0x0').toString(),
    }))
}

async function loadExistingRelayerData(): Promise<{
  payment: Record<string, StoredTx>;
  send: Record<string, StoredTx>;
  paymentHistoryComplete: boolean;
  sendHistoryComplete: boolean;
}> {
  const relayerPath = path.join(__dirname, '..', 'src', 'data', 'relayer.json');
  try {
    const raw = await fs.readFile(relayerPath, 'utf-8');
    const parsed: RelayerFile = JSON.parse(raw);
    const toMap = (entries?: StoredTx[]) => {
      const map: Record<string, StoredTx> = {};
      entries?.forEach((tx) => {
        if (tx?.hash) {
          map[tx.hash] = tx;
        }
      });
      return map;
    };
    return {
      payment: toMap(parsed.payment),
      send: toMap(parsed.send),
      paymentHistoryComplete: !!parsed.meta?.payment?.historyComplete,
      sendHistoryComplete: !!parsed.meta?.send?.historyComplete,
    };
  } catch {
    return { payment: {}, send: {}, paymentHistoryComplete: false, sendHistoryComplete: false };
  }
}

async function buildRelayerData(
  address: string,
  cache: Record<string, StoredTx>,
  historyComplete: boolean
): Promise<{ entries: StoredTx[]; historyComplete: boolean }> {
  const existingHashes = new Set<string>(Object.keys(cache));
  const { summaries: newTxs, exhaustedHistory } = await fetchRelayerTxs(address, existingHashes, historyComplete);
  console.log(`[Relayer Sample] Need receipts for ${newTxs.length} txs for ${address}`);
  const blockTimestampCache = new Map<number, string>();

  const getBlockTimestamp = async (blockNumber?: number) => {
    if (typeof blockNumber !== 'number' || blockNumber <= 0) return undefined;
    if (!blockTimestampCache.has(blockNumber)) {
      const block = await provider.getBlock(blockNumber);
      if (block) {
        blockTimestampCache.set(blockNumber, new Date(block.timestamp * 1000).toISOString());
      }
    }
    return blockTimestampCache.get(blockNumber);
  };

  for (const tx of newTxs) {
    try {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      const blockNumber = receipt?.blockNumber;
      const timestamp = tx.timestamp ?? (await getBlockTimestamp(blockNumber));
      const stored: StoredTx = {
        hash: tx.hash,
        timestamp,
        blockNumber,
        usdcLogs: extractUsdcLogs(receipt),
      };
      cache[tx.hash] = stored;
      console.log(`[Relayer Sample] Processed ${address} tx ${tx.hash}`);
    } catch (error) {
      console.error(`[Relayer Sample] Failed to load receipt for ${tx.hash}`, error);
    }
  }

  return { entries: Object.values(cache), historyComplete: historyComplete || exhaustedHistory };
}

function sortTransactions(txs: StoredTx[]): StoredTx[] {
  return txs
    .slice()
    .sort((a, b) => {
      if (a.blockNumber !== undefined && b.blockNumber !== undefined && a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      const timeA = a.timestamp ?? '';
      const timeB = b.timestamp ?? '';
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }
      return a.hash.localeCompare(b.hash);
    });
}

async function main() {
  console.log('[Relayer] Fetching relayer txs + decoding USDC logs...');

  const existing = await loadExistingRelayerData();
  const [paymentResult, sendResult] = await Promise.all([
    buildRelayerData(PAYMENT_RELAYER, existing.payment, existing.paymentHistoryComplete),
    buildRelayerData(SEND_RELAYER, existing.send, existing.sendHistoryComplete),
  ]);

  const payment = sortTransactions(paymentResult.entries);
  const send = sortTransactions(sendResult.entries);

  const redactedRpcUrl = ALCHEMY_API_KEY ? (ALCHEMY_RPC_URL as string).replace(ALCHEMY_API_KEY, '***') : ALCHEMY_RPC_URL;

  const output = {
    fetchedAt: new Date().toISOString(),
    sampleTxCount: {
      payment: payment.length,
      send: send.length,
    },
    payment,
    send,
    meta: {
      payment: { historyComplete: paymentResult.historyComplete },
      send: { historyComplete: sendResult.historyComplete },
    },
  };

  const outputPath = path.join(__dirname, '..', 'src', 'data', 'relayer.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log(`[Relayer] Wrote ${outputPath}`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('[Relayer] Failed:', error);
  process.exit(1);
});

