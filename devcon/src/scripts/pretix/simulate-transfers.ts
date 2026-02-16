/**
 * Simulate EIP-3009 transferWithAuthorization for all supported networks & tokens.
 *
 * For each gasless token (USDC, USDT0) on each chain:
 *   1. Check wallet balance
 *   2. Verify on-chain EIP-712 domain params match our config
 *   3. Sign an authorization (requires TEST_PAYER_PRIVATE_KEY)
 *   4. Simulate the transferWithAuthorization call via eth_call
 *
 * For native ETH assets: just check balance.
 *
 * Usage:
 *   pnpm run x402:simulate
 *   TEST_PAYER_PRIVATE_KEY=0x... pnpm run x402:simulate
 *
 * Env:
 *   TEST_WALLET – wallet address to check balances (default: 0xBD19a3F0A9CaCE18513A1e2863d648D13975CB30)
 *   TEST_PAYER_PRIVATE_KEY – private key for signing (enables signature + simulation tests)
 *   PAYMENT_RECIPIENT – recipient for simulated transfers (default: relayer address or zero)
 */
import 'dotenv/config'
import {
  createPublicClient,
  http,
  parseAbi,
  encodeFunctionData,
  type Chain,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, optimism, arbitrum, base, polygon, baseSepolia } from 'viem/chains'
import * as crypto from 'crypto'

import {
  SUPPORTED_ASSETS_MAINNET,
  GASLESS_CONFIGS_MAINNET,
  NATIVE_ETH_PLACEHOLDER,
  type GaslessTokenConfig,
  type SupportedAsset,
} from '../../types/x402'

// ── Config ──

const TEST_WALLET = process.env.TEST_WALLET || '0xBD19a3F0A9CaCE18513A1e2863d648D13975CB30'
const RECIPIENT = process.env.PAYMENT_RECIPIENT || '0x0000000000000000000000000000000000000001'
const PRIVATE_KEY = process.env.TEST_PAYER_PRIVATE_KEY
const SIMULATE_AMOUNT = '1000000' // 1 USDC/USDT0 (6 decimals)

// ── Chain helpers ──

const CHAIN_MAP: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [polygon.id]: polygon,
  [baseSepolia.id]: baseSepolia,
}

const RPC_OVERRIDES: Record<number, string | undefined> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
  [optimism.id]: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL,
  [arbitrum.id]: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
}

function getClient(chainId: number) {
  const chain = CHAIN_MAP[chainId]
  if (!chain) throw new Error(`Unknown chain ${chainId}`)
  const rpc = RPC_OVERRIDES[chainId]
  return createPublicClient({ chain, transport: http(rpc) })
}

// ── ABIs ──

const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

const eip712DomainAbi = parseAbi([
  'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
])

const transferWithAuthAbi = parseAbi([
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
])

// ── Helpers ──

let passes = 0
let failures = 0

function pass(msg: string) { console.log(`  ✅ ${msg}`); passes++ }
function fail(msg: string) { console.log(`  ❌ ${msg}`); failures++ }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }
function section(title: string) { console.log(`\n━━━ ${title} ━━━`) }

function formatBalance(raw: bigint, decimals: number): string {
  const whole = raw / BigInt(10 ** decimals)
  const frac = raw % BigInt(10 ** decimals)
  return `${whole}.${frac.toString().padStart(decimals, '0').slice(0, 4)}`
}

function parseChainId(asset: string): number {
  const m = asset.match(/^eip155:(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function parseTokenAddress(asset: string): string {
  const m = asset.match(/\/erc20:(0x[a-fA-F0-9]+)$/)
  return m ? m[1] : ''
}

// ── Balance checks ──

async function checkErc20Balance(chainId: number, tokenAddress: string, symbol: string): Promise<bigint> {
  const client = getClient(chainId)
  try {
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [TEST_WALLET as `0x${string}`],
    })
    return balance
  } catch (e) {
    fail(`${symbol} balance check on chain ${chainId}: ${(e as Error).message}`)
    return BigInt(0)
  }
}

async function checkEthBalance(chainId: number): Promise<bigint> {
  const client = getClient(chainId)
  try {
    return await client.getBalance({ address: TEST_WALLET as `0x${string}` })
  } catch (e) {
    fail(`ETH balance check on chain ${chainId}: ${(e as Error).message}`)
    return BigInt(0)
  }
}

// ── On-chain EIP-712 domain verification ──

async function verifyEip712Domain(config: GaslessTokenConfig): Promise<boolean> {
  const client = getClient(config.chainId)
  const chainName = CHAIN_MAP[config.chainId]?.name ?? String(config.chainId)

  try {
    // Try EIP-5267 eip712Domain() first
    const result = await client.readContract({
      address: config.tokenAddress as `0x${string}`,
      abi: eip712DomainAbi,
      functionName: 'eip712Domain',
    })
    const [, onChainName, onChainVersion, onChainChainId] = result

    const nameMatch = onChainName === config.eip712Name
    const versionMatch = onChainVersion === config.eip712Version
    const chainIdMatch = Number(onChainChainId) === config.chainId

    if (nameMatch && versionMatch && chainIdMatch) {
      pass(`${config.tokenSymbol} on ${chainName}: domain matches (name="${onChainName}", version="${onChainVersion}", chainId=${onChainChainId})`)
      return true
    } else {
      if (!nameMatch) fail(`${config.tokenSymbol} on ${chainName}: name mismatch — config="${config.eip712Name}" vs on-chain="${onChainName}"`)
      if (!versionMatch) fail(`${config.tokenSymbol} on ${chainName}: version mismatch — config="${config.eip712Version}" vs on-chain="${onChainVersion}"`)
      if (!chainIdMatch) fail(`${config.tokenSymbol} on ${chainName}: chainId mismatch — config=${config.chainId} vs on-chain=${onChainChainId}`)
      return false
    }
  } catch {
    // Fallback: try reading name() and version() directly (USDC doesn't have eip712Domain())
    try {
      const onChainName = await client.readContract({
        address: config.tokenAddress as `0x${string}`,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name',
      })
      // Try version() — not all contracts have it
      let onChainVersion = '<unknown>'
      try {
        onChainVersion = await client.readContract({
          address: config.tokenAddress as `0x${string}`,
          abi: parseAbi(['function version() view returns (string)']),
          functionName: 'version',
        })
      } catch {
        // version() not available
      }

      const nameMatch = onChainName === config.eip712Name
      const versionMatch = onChainVersion === '<unknown>' || onChainVersion === config.eip712Version

      if (nameMatch && versionMatch) {
        if (onChainVersion === '<unknown>') {
          pass(`${config.tokenSymbol} on ${chainName}: name matches (name="${onChainName}"), version() not available (config="${config.eip712Version}" — verify via simulation)`)
        } else {
          pass(`${config.tokenSymbol} on ${chainName}: domain verified via name()/version() (name="${onChainName}", version="${onChainVersion}")`)
        }
        return true
      } else {
        if (!nameMatch) fail(`${config.tokenSymbol} on ${chainName}: name mismatch — config="${config.eip712Name}" vs on-chain="${onChainName}"`)
        if (!versionMatch) fail(`${config.tokenSymbol} on ${chainName}: version mismatch — config="${config.eip712Version}" vs on-chain="${onChainVersion}"`)
        return false
      }
    } catch (e2) {
      fail(`${config.tokenSymbol} on ${chainName}: could not read domain params: ${(e2 as Error).message}`)
      return false
    }
  }
}

// ── EIP-3009 Signature + Simulation ──

async function simulateTransferWithAuth(config: GaslessTokenConfig): Promise<void> {
  if (!PRIVATE_KEY) {
    info(`${config.tokenSymbol} on ${config.network}: skipping signature test (no TEST_PAYER_PRIVATE_KEY)`)
    return
  }

  const account = privateKeyToAccount(PRIVATE_KEY as Hex)
  const client = getClient(config.chainId)
  const chainName = CHAIN_MAP[config.chainId]?.name ?? config.network

  const nonce = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`
  const now = Math.floor(Date.now() / 1000)

  const domain = {
    name: config.eip712Name,
    version: config.eip712Version,
    chainId: config.chainId,
    verifyingContract: config.tokenAddress as `0x${string}`,
  }

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  } as const

  const message = {
    from: account.address,
    to: RECIPIENT as `0x${string}`,
    value: BigInt(SIMULATE_AMOUNT),
    validAfter: BigInt(0),
    validBefore: BigInt(now + 3600),
    nonce,
  }

  // Sign
  let signature: Hex
  try {
    signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    })
    pass(`${config.tokenSymbol} on ${chainName}: EIP-712 signature created`)
  } catch (e) {
    fail(`${config.tokenSymbol} on ${chainName}: EIP-712 signing failed: ${(e as Error).message}`)
    return
  }

  // Split signature into v, r, s
  const r = `0x${signature.slice(2, 66)}` as Hex
  const s = `0x${signature.slice(66, 130)}` as Hex
  const v = parseInt(signature.slice(130, 132), 16)

  info(`  sig: v=${v}, r=${r.slice(0, 10)}..., s=${s.slice(0, 10)}...`)

  // Simulate via eth_call
  try {
    const calldata = encodeFunctionData({
      abi: transferWithAuthAbi,
      functionName: 'transferWithAuthorization',
      args: [
        account.address,
        RECIPIENT as `0x${string}`,
        BigInt(SIMULATE_AMOUNT),
        BigInt(0),
        BigInt(now + 3600),
        nonce,
        v,
        r,
        s,
      ],
    })

    await client.call({
      to: config.tokenAddress as `0x${string}`,
      data: calldata,
    })
    pass(`${config.tokenSymbol} on ${chainName}: eth_call simulation succeeded`)
  } catch (e) {
    const msg = (e as Error).message || String(e)
    // Extract revert reason if available
    const revertMatch = msg.match(/reverted with reason string '([^']+)'/) ||
      msg.match(/reason: (.+?)(?:\n|$)/) ||
      msg.match(/execution reverted: (.+?)(?:\n|$)/)
    const reason = revertMatch ? revertMatch[1] : msg.slice(0, 200)

    if (msg.includes('insufficient') || msg.includes('balance')) {
      info(`${config.tokenSymbol} on ${chainName}: simulation reverted (insufficient balance) — signature is valid`)
    } else {
      fail(`${config.tokenSymbol} on ${chainName}: simulation failed — ${reason}`)
    }
  }
}

// ── Now also test the hex-chainId JSON approach (what the frontend wallet does) ──

async function simulateWalletStyleSigning(config: GaslessTokenConfig): Promise<void> {
  if (!PRIVATE_KEY) return

  const account = privateKeyToAccount(PRIVATE_KEY as Hex)
  const chainName = CHAIN_MAP[config.chainId]?.name ?? config.network
  const client = getClient(config.chainId)

  const nonce = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`
  const now = Math.floor(Date.now() / 1000)

  // This mirrors exactly what the checkout page sends to the wallet via eth_signTypedData_v4:
  // - hex chainId
  // - explicit EIP712Domain type
  // - string values for BigInt fields
  const jsonPayload = JSON.stringify({
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    domain: {
      name: config.eip712Name,
      version: config.eip712Version,
      chainId: `0x${config.chainId.toString(16)}`,
      verifyingContract: config.tokenAddress,
    },
    message: {
      from: account.address,
      to: RECIPIENT,
      value: SIMULATE_AMOUNT,
      validAfter: '0',
      validBefore: String(now + 3600),
      nonce: nonce,
    },
  })

  // viem account.signTypedData expects structured data, not raw JSON.
  // To truly simulate eth_signTypedData_v4, we parse the JSON back and use viem's signTypedData.
  const parsed = JSON.parse(jsonPayload)

  // Re-construct domain with numeric chainId (as viem needs it)
  const domain = {
    name: parsed.domain.name,
    version: parsed.domain.version,
    chainId: parseInt(parsed.domain.chainId, 16),
    verifyingContract: parsed.domain.verifyingContract as `0x${string}`,
  }

  const types = {
    TransferWithAuthorization: parsed.types.TransferWithAuthorization,
  } as const

  const message = {
    from: account.address,
    to: RECIPIENT as `0x${string}`,
    value: BigInt(parsed.message.value),
    validAfter: BigInt(parsed.message.validAfter),
    validBefore: BigInt(parsed.message.validBefore),
    nonce: parsed.message.nonce as `0x${string}`,
  }

  let signature: Hex
  try {
    signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    })
  } catch (e) {
    fail(`${config.tokenSymbol} on ${chainName} [wallet-style]: signing failed: ${(e as Error).message}`)
    return
  }

  const r = `0x${signature.slice(2, 66)}` as Hex
  const s = `0x${signature.slice(66, 130)}` as Hex
  const v = parseInt(signature.slice(130, 132), 16)

  // Simulate
  try {
    const calldata = encodeFunctionData({
      abi: transferWithAuthAbi,
      functionName: 'transferWithAuthorization',
      args: [
        account.address,
        RECIPIENT as `0x${string}`,
        BigInt(parsed.message.value),
        BigInt(parsed.message.validAfter),
        BigInt(parsed.message.validBefore),
        nonce,
        v,
        r,
        s,
      ],
    })

    await client.call({
      to: config.tokenAddress as `0x${string}`,
      data: calldata,
    })
    pass(`${config.tokenSymbol} on ${chainName} [wallet-style]: simulation succeeded`)
  } catch (e) {
    const msg = (e as Error).message || String(e)
    if (msg.includes('insufficient') || msg.includes('balance')) {
      info(`${config.tokenSymbol} on ${chainName} [wallet-style]: reverted (insufficient balance) — signature valid`)
    } else {
      fail(`${config.tokenSymbol} on ${chainName} [wallet-style]: simulation failed — ${msg.slice(0, 200)}`)
    }
  }
}

// ── Main ──

async function main() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   Simulate Transfers – All Networks & Tokens   ║')
  console.log('╚════════════════════════════════════════════════╝')

  info(`Wallet: ${TEST_WALLET}`)
  if (PRIVATE_KEY) {
    const account = privateKeyToAccount(PRIVATE_KEY as Hex)
    info(`Signer: ${account.address}`)
    if (account.address.toLowerCase() !== TEST_WALLET.toLowerCase()) {
      info(`⚠  Signer address differs from TEST_WALLET — balance checks use TEST_WALLET, signing uses signer`)
    }
  } else {
    info('No TEST_PAYER_PRIVATE_KEY — balance + domain checks only (no signing/simulation)')
  }
  info(`Recipient: ${RECIPIENT}`)
  info(`Simulate amount: ${SIMULATE_AMOUNT} (smallest unit)`)

  // ── 1. Balance overview ──
  section('Balances')

  for (const asset of SUPPORTED_ASSETS_MAINNET) {
    const chainId = parseChainId(asset.asset)
    const tokenAddr = parseTokenAddress(asset.asset)
    const chainName = CHAIN_MAP[chainId]?.name ?? String(chainId)

    if (tokenAddr.toLowerCase() === NATIVE_ETH_PLACEHOLDER.toLowerCase()) {
      const bal = await checkEthBalance(chainId)
      info(`${asset.symbol} on ${chainName}: ${formatBalance(bal, 18)} ETH`)
    } else {
      const bal = await checkErc20Balance(chainId, tokenAddr, asset.symbol)
      info(`${asset.symbol} on ${chainName}: ${formatBalance(bal, asset.decimals)} ${asset.symbol}`)
    }
  }

  // ── 2. Domain verification ──
  section('EIP-712 Domain Verification')

  for (const config of GASLESS_CONFIGS_MAINNET) {
    await verifyEip712Domain(config)
  }

  // ── 3. Signature + Simulation (viem signTypedData — "canonical" approach) ──
  section('EIP-3009 Signature + Simulation (viem signTypedData)')

  for (const config of GASLESS_CONFIGS_MAINNET) {
    await simulateTransferWithAuth(config)
  }

  // ── 4. Wallet-style signing (hex chainId, string values — mirrors frontend) ──
  section('EIP-3009 Signature + Simulation (wallet-style eth_signTypedData_v4)')

  for (const config of GASLESS_CONFIGS_MAINNET) {
    await simulateWalletStyleSigning(config)
  }

  // ── Summary ──
  section('Summary')
  console.log(`\n  ${passes} passed, ${failures} failed\n`)
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error('\nFatal error:', err.message || err)
  process.exit(1)
})
