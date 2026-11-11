import { alchemyWalletTransport, createSmartWalletClient } from '@alchemy/wallet-apis'
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { MEMORY_CHAIN, MEMORY_CHAINS, MEMORY_EDITION, MEMORY_SENDER, type MemoryChain } from './memory'
import type { Sponsor } from './queue'

/**
 * Everything onchain for the memory (server only): the sender, chosen by
 * MEMORY_SENDER, and contract reads. Sponsored: Alchemy Wallet APIs (the
 * minter key is an EOA delegated to Alchemy's smart account via EIP-7702, so
 * it is msg.sender and the contract's minter). Direct: plain transactions from
 * the same key, which pays the gas. Env: ALCHEMY_API_KEY, MINTER_PRIVATE_KEY,
 * and ALCHEMY_GAS_POLICY_ID when sponsored.
 */

export const MEMORY_ABI = parseAbi([
  'function mintBatch(uint256 editionId, address[] to, bytes32[] ticketKeys) returns (uint256 minted)',
  'function editionOfTicket(bytes32 ticketKey) view returns (uint256)',
])

const VIEM_CHAINS = { sepolia, mainnet } as const
const ALCHEMY_HOSTS: Record<MemoryChain, string> = { sepolia: 'eth-sepolia', mainnet: 'eth-mainnet' }

export interface MemoryChainConfig {
  chain: MemoryChain
  chainId: number
  contract: Address
  apiKey: string
  /** Empty when MEMORY_SENDER is 'direct'. */
  policyId: string
  minterKey: Hex
}

/** Null until the contract is deployed and the env is set (the route answers 503). */
export function memoryChainConfig(chain: MemoryChain = MEMORY_CHAIN): MemoryChainConfig | null {
  const apiKey = process.env.ALCHEMY_API_KEY
  const policyId = process.env.ALCHEMY_GAS_POLICY_ID
  const minterKey = process.env.MINTER_PRIVATE_KEY as Hex | undefined
  const { id, contract } = MEMORY_CHAINS[chain]
  if (!apiKey || !minterKey || !contract) return null
  if (MEMORY_SENDER === 'sponsored' && !policyId) return null
  return { chain, chainId: id, contract, apiKey, policyId: policyId ?? '', minterKey }
}

function alchemyRpc(chain: MemoryChain, apiKey: string): string {
  return `https://${ALCHEMY_HOSTS[chain]}.g.alchemy.com/v2/${apiKey}`
}

export function memorySponsor(cfg: MemoryChainConfig): Sponsor {
  const client = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: cfg.apiKey }),
    chain: VIEM_CHAINS[cfg.chain],
    signer: privateKeyToAccount(cfg.minterKey),
    paymaster: { policyId: cfg.policyId },
  })
  return {
    async send(entries, lane) {
      const { id } = await client.sendCalls({
        calls: [
          {
            to: cfg.contract,
            data: encodeFunctionData({
              abi: MEMORY_ABI,
              functionName: 'mintBatch',
              args: [BigInt(MEMORY_EDITION), entries.map(e => e.to), entries.map(e => e.key)],
            }),
          },
        ],
        // A fixed 2D nonce lane per batch in flight (queue.ts NONCE_LANES):
        // parallel batches never share a nonce, and reusing a lane updates an
        // existing EntryPoint nonce slot instead of creating a new one.
        capabilities: { nonceOverride: { nonceKey: BigInt(lane) } },
      })
      return id
    },
    async status(id) {
      const s = await client.getCallsStatus({ id })
      const status = s.status === 'success' ? 'success' : s.status === 'failure' ? 'failure' : 'pending'
      const receipt = s.receipts?.[0]
      return {
        status,
        txHash: receipt?.transactionHash,
        blockNumber: receipt?.blockNumber == null ? undefined : Number(receipt.blockNumber),
      }
    },
  }
}

/** The token minted for each ticket key: in ERC-1155 the token id is the edition id (zero when none). */
const DIRECT = 'tx:'

/** Plain transactions from the minter key, which pays the gas (MEMORY_SENDER 'direct'). Ids are "tx:<hash>". */
export function memoryDirectSender(cfg: MemoryChainConfig): Sponsor {
  const transport = http(alchemyRpc(cfg.chain, cfg.apiKey))
  const pub = createPublicClient({ chain: VIEM_CHAINS[cfg.chain], transport })
  const wallet = createWalletClient({
    chain: VIEM_CHAINS[cfg.chain],
    transport,
    account: privateKeyToAccount(cfg.minterKey),
  })
  return {
    // Lanes are a sponsored-nonce idea; a plain account just takes its next nonce.
    async send(entries) {
      const hash = await wallet.sendTransaction({
        to: cfg.contract,
        data: encodeFunctionData({
          abi: MEMORY_ABI,
          functionName: 'mintBatch',
          args: [BigInt(MEMORY_EDITION), entries.map(e => e.to), entries.map(e => e.key)],
        }),
      })
      return `${DIRECT}${hash}`
    },
    async status(id) {
      const hash = id.slice(DIRECT.length) as Hex
      const receipt = await pub.getTransactionReceipt({ hash }).catch(() => null)
      if (receipt) {
        return {
          status: receipt.status === 'success' ? 'success' : 'failure',
          txHash: hash,
          blockNumber: Number(receipt.blockNumber),
        }
      }
      // Still in the mempool, or dropped (then the queue retries it; the
      // contract skips a ticket that already has a token).
      const pending = await pub.getTransaction({ hash }).catch(() => null)
      return { status: pending ? 'pending' : 'failure' }
    },
  }
}

/**
 * The sender the queue uses: sends the MEMORY_SENDER way; reads each batch's
 * status the way it was sent, so a switch never strands one in flight.
 */
export function memorySender(cfg: MemoryChainConfig): Sponsor {
  const direct = memoryDirectSender(cfg)
  let sponsored: Sponsor | null = null
  const sponsor = () => (sponsored ??= memorySponsor(cfg))
  return {
    send: (entries, lane) => (MEMORY_SENDER === 'direct' ? direct.send(entries, lane) : sponsor().send(entries, lane)),
    status: id => (id.startsWith(DIRECT) ? direct.status(id) : sponsor().status(id)),
  }
}

export function tokenOfTicketReader(cfg: MemoryChainConfig) {
  const client = createPublicClient({
    chain: VIEM_CHAINS[cfg.chain],
    transport: http(alchemyRpc(cfg.chain, cfg.apiKey)),
  })
  return async (keys: Hex[]): Promise<bigint[]> => {
    if (!keys.length) return []
    return client.multicall({
      allowFailure: false,
      contracts: keys.map(k => ({
        address: cfg.contract,
        abi: MEMORY_ABI,
        functionName: 'editionOfTicket' as const,
        args: [k] as const,
      })),
    })
  }
}
