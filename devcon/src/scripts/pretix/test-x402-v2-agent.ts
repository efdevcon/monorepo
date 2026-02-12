/**
 * Test x402 v2 agent payment flow
 *
 * Tests spec compliance of the x402 v2 protocol implementation:
 *
 *   1. PAYMENT-REQUIRED header (base64-encoded PaymentRequired JSON)
 *   2. x402 body field (accepts[], resource, x402Version)
 *   3. Facilitator /supported endpoint
 *   4. Facilitator /verify (with signed payload — needs TEST_PAYER_PRIVATE_KEY)
 *   5. Full PAYMENT-SIGNATURE retry flow (needs funded wallet — pass --settle)
 *
 * Usage:
 *   pnpm x402:test-v2-agent                        # Protocol format tests only
 *   TEST_PAYER_PRIVATE_KEY=0x... pnpm x402:test-v2-agent           # + signature tests
 *   TEST_PAYER_PRIVATE_KEY=0x... pnpm x402:test-v2-agent --settle  # + full settlement
 *
 * Requires the dev server running: pnpm dev
 */
import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import { signTypedData } from 'viem/accounts'
import crypto from 'crypto'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL || 'x402-agent-test@example.com'
const SETTLE = process.argv.includes('--settle')

// ── Helpers ────────────────────────────────────────────────

function pass(label: string) {
  console.log(`  ✅ ${label}`)
}
function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}${detail ? `: ${detail}` : ''}`)
  failures++
}
function info(label: string) {
  console.log(`  ℹ️  ${label}`)
}
function section(title: string) {
  console.log(`\n━━━ ${title} ━━━`)
}

let failures = 0

// ── Step 1: Fetch tickets ──────────────────────────────────

async function fetchTickets() {
  section('Step 1: GET /api/x402/tickets')

  const res = await fetch(`${API_BASE}/api/x402/tickets`)
  const data = await res.json()

  if (!data.success) {
    fail('Fetch tickets', data.error)
    return null
  }

  const ticket = data.data.tickets.find((t: any) => t.isAdmission && t.available)
  if (!ticket) {
    fail('No available admission tickets')
    return null
  }

  pass(`Event: ${data.data.event.name}`)
  pass(`Ticket: [${ticket.id}] ${ticket.name} — ${ticket.price} ${data.data.event.currency}`)
  pass(`Payment info: ${data.data.paymentInfo.tokenSymbol} on ${data.data.paymentInfo.network}`)

  if (data.data.paymentInfo.supportedAssets?.length > 0) {
    pass(`supportedAssets: ${data.data.paymentInfo.supportedAssets.length} entries (CAIP-19)`)
  } else {
    fail('supportedAssets missing from paymentInfo')
  }

  return data.data
}

// ── Step 2: POST /purchase → 402 + validate headers/body ──

async function createPurchase(ticketData: any, payerAddress: string) {
  section('Step 2: POST /api/x402/tickets/purchase → 402')

  const ticket = ticketData.tickets.find((t: any) => t.isAdmission && t.available)

  // Build answers
  const answers: { questionId: number; answer: string }[] = []
  for (const q of ticketData.questions.filter((q: any) => q.required)) {
    if (q.appliesToItems.length === 0 || q.appliesToItems.includes(ticket.id)) {
      let answer = ''
      switch (q.type) {
        case 'C':
        case 'M':
          answer = q.options.length > 0 ? String(q.options[0].id) : 'Test'
          break
        case 'CC':
          answer = 'US'
          break
        case 'B':
          answer = 'true'
          break
        case 'N':
          answer = '1'
          break
        default:
          answer = 'Test answer'
      }
      answers.push({ questionId: q.id, answer })
    }
  }

  const body = {
    email: TEST_EMAIL,
    intendedPayer: payerAddress,
    tickets: [{ itemId: ticket.id, quantity: 1 }],
    answers,
    attendee: {
      name: { given_name: 'Agent', family_name: 'Test' },
      email: TEST_EMAIL,
      country: 'US',
    },
  }

  const res = await fetch(`${API_BASE}/api/x402/tickets/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status !== 402) {
    fail(`Expected HTTP 402, got ${res.status}`)
    const errData = await res.json()
    info(JSON.stringify(errData, null, 2))
    return null
  }
  pass('HTTP 402 Payment Required')

  // ── Validate PAYMENT-REQUIRED header ──
  const paymentRequiredHeader = res.headers.get('payment-required') || res.headers.get('PAYMENT-REQUIRED')
  if (!paymentRequiredHeader) {
    fail('Missing PAYMENT-REQUIRED header')
  } else if (paymentRequiredHeader === 'true') {
    fail('PAYMENT-REQUIRED header is just "true" — should be base64-encoded JSON')
  } else {
    try {
      const decoded = JSON.parse(Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8'))
      if (decoded.x402Version !== 2) {
        fail(`PAYMENT-REQUIRED: x402Version is ${decoded.x402Version}, expected 2`)
      } else {
        pass('PAYMENT-REQUIRED header: base64 JSON with x402Version=2')
      }
      if (!decoded.resource?.url) {
        fail('PAYMENT-REQUIRED: missing resource.url')
      } else {
        pass(`PAYMENT-REQUIRED resource.url: ${decoded.resource.url}`)
      }
      if (!Array.isArray(decoded.accepts) || decoded.accepts.length === 0) {
        fail('PAYMENT-REQUIRED: missing or empty accepts[]')
      } else {
        pass(`PAYMENT-REQUIRED accepts[]: ${decoded.accepts.length} chain(s)`)
        for (let i = 0; i < decoded.accepts.length; i++) {
          const a = decoded.accepts[i]
          info(`  accepts[${i}]: network=${a.network}, asset=${a.asset?.slice(0, 10)}...`)
        }
        // Validate first entry structure (all entries share the same shape)
        const accept = decoded.accepts[0]
        const checks = [
          ['scheme', accept.scheme === 'exact'],
          ['network (CAIP-2)', typeof accept.network === 'string' && accept.network.startsWith('eip155:')],
          ['amount (string)', typeof accept.amount === 'string' && accept.amount.length > 0],
          ['asset', typeof accept.asset === 'string' && accept.asset.startsWith('0x')],
          ['payTo', typeof accept.payTo === 'string' && accept.payTo.startsWith('0x')],
          ['maxTimeoutSeconds', typeof accept.maxTimeoutSeconds === 'number' && accept.maxTimeoutSeconds > 0],
          ['extra.paymentReference', typeof accept.extra?.paymentReference === 'string'],
        ] as const
        for (const [name, ok] of checks) {
          if (ok) pass(`accepts[0].${name}`)
          else fail(`accepts[0].${name}`)
        }
      }
    } catch (e) {
      fail(`PAYMENT-REQUIRED header decode error: ${(e as Error).message}`)
    }
  }

  // ── Validate legacy headers ──
  // Note: Payment-Required is now the x402 v2 header (base64), so check X-Payment-Required for legacy
  const legacyPR = res.headers.get('X-Payment-Required')
  if (legacyPR === 'true') pass('Legacy X-Payment-Required: true')
  else fail('Legacy X-Payment-Required header missing')

  // ── Validate response body ──
  const data = await res.json()

  if (data.x402) {
    pass('Body has x402 field')
    if (data.x402.x402Version === 2) pass('x402.x402Version = 2')
    else fail(`x402.x402Version = ${data.x402.x402Version}`)
    if (Array.isArray(data.x402.accepts)) pass(`x402.accepts[]: ${data.x402.accepts.length} entries`)
    else fail('x402.accepts[] missing')
  } else {
    fail('Body missing x402 field')
  }

  if (data.paymentDetails?.payment) {
    pass('Body has paymentDetails.payment (legacy)')
  } else {
    fail('Body missing paymentDetails.payment')
  }

  if (data.orderSummary) {
    pass(`Order total: ${data.orderSummary.total} ${data.orderSummary.currency} (${data.orderSummary.cryptoDiscount} discount)`)
  }

  return { data, purchaseBody: body }
}

// ── Step 3: GET /facilitator/supported ─────────────────────

async function testFacilitatorSupported() {
  section('Step 3: GET /facilitator/supported')

  const res = await fetch(`${API_BASE}/api/x402/tickets/facilitator/supported`)
  if (res.status !== 200) {
    fail(`HTTP ${res.status}`)
    return
  }

  const data = await res.json()

  if (Array.isArray(data.kinds) && data.kinds.length > 0) {
    pass(`kinds[]: ${data.kinds.length} chain(s)`)
    for (const k of data.kinds) {
      info(`  kind: x402Version=${k.x402Version}, scheme=${k.scheme}, network=${k.network}`)
    }
  } else {
    fail('kinds[] empty or missing')
  }

  if (data.signers && Object.keys(data.signers).length > 0) {
    pass(`signers: ${JSON.stringify(data.signers)}`)
  } else {
    fail('signers missing')
  }

  if (Array.isArray(data.extensions)) pass('extensions present')
  else fail('extensions missing')
}

// ── Step 4: Facilitator /verify with signed payload ────────

async function testFacilitatorVerify(purchaseData: any, privateKey: string) {
  section('Step 4: POST /facilitator/verify (signed payload)')

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const x402 = purchaseData.x402
  const accept = x402.accepts[0]
  const paymentRef = accept.extra.paymentReference

  // Build EIP-3009 authorization
  const nonce = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`
  const now = Math.floor(Date.now() / 1000)
  const authorization = {
    from: account.address,
    to: accept.payTo,
    value: accept.amount,
    validAfter: '0',
    validBefore: String(now + 3600),
    nonce,
  }

  // Build EIP-712 domain for USDC
  const domain = {
    name: accept.extra.name || 'USD Coin',
    version: accept.extra.version || '2',
    chainId: parseInt(accept.network.replace('eip155:', ''), 10),
    verifyingContract: accept.asset as `0x${string}`,
  }

  const types = {
    ReceiveWithAuthorization: [
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
    to: accept.payTo as `0x${string}`,
    value: BigInt(accept.amount),
    validAfter: BigInt(0),
    validBefore: BigInt(now + 3600),
    nonce,
  }

  // Sign EIP-712
  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'ReceiveWithAuthorization',
    message,
  })
  pass(`Signed EIP-712 payload (from ${account.address})`)

  // Build PaymentPayload for facilitator
  const paymentPayload = {
    x402Version: 2,
    resource: x402.resource,
    accepted: accept,
    payload: { signature, authorization },
    extensions: {},
  }

  // Call facilitator /verify
  const res = await fetch(`${API_BASE}/api/x402/tickets/facilitator/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: accept,
    }),
  })

  const verifyData = await res.json()

  if (verifyData.isValid) {
    pass(`Facilitator verify: isValid=true, payer=${verifyData.payer}`)
  } else {
    fail(`Facilitator verify: isValid=false, reason=${verifyData.invalidReason}`)
  }

  return { paymentPayload, signature, authorization, accept }
}

// ── Step 5: Full PAYMENT-SIGNATURE retry flow ──────────────

async function testPaymentSignatureFlow(
  purchaseBody: any,
  purchaseData: any,
  privateKey: string
) {
  section('Step 5: PAYMENT-SIGNATURE retry flow (full settlement)')

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const x402 = purchaseData.x402
  const accept = x402.accepts[0]

  // Build a fresh authorization
  const nonce = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`
  const now = Math.floor(Date.now() / 1000)

  const domain = {
    name: accept.extra.name || 'USD Coin',
    version: accept.extra.version || '2',
    chainId: parseInt(accept.network.replace('eip155:', ''), 10),
    verifyingContract: accept.asset as `0x${string}`,
  }

  const types = {
    ReceiveWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  } as const

  const authorization = {
    from: account.address,
    to: accept.payTo,
    value: accept.amount,
    validAfter: '0',
    validBefore: String(now + 3600),
    nonce,
  }

  const message = {
    from: account.address,
    to: accept.payTo as `0x${string}`,
    value: BigInt(accept.amount),
    validAfter: BigInt(0),
    validBefore: BigInt(now + 3600),
    nonce,
  }

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'ReceiveWithAuthorization',
    message,
  })

  // Build PaymentPayload
  const paymentPayload = {
    x402Version: 2,
    resource: x402.resource,
    accepted: accept,
    payload: { signature, authorization },
    extensions: {},
  }

  // Base64-encode for PAYMENT-SIGNATURE header
  const paymentSigHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
  info(`PAYMENT-SIGNATURE header length: ${paymentSigHeader.length} chars`)

  // Retry same POST with PAYMENT-SIGNATURE header
  const res = await fetch(`${API_BASE}/api/x402/tickets/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-SIGNATURE': paymentSigHeader,
    },
    body: JSON.stringify(purchaseBody),
  })

  info(`Response status: ${res.status}`)

  // Check PAYMENT-RESPONSE header
  const paymentResponseHeader = res.headers.get('payment-response') || res.headers.get('PAYMENT-RESPONSE')
  if (paymentResponseHeader) {
    try {
      const decoded = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString('utf-8'))
      pass(`PAYMENT-RESPONSE header: success=${decoded.success}, tx=${decoded.transaction?.slice(0, 18)}..., network=${decoded.network}, payer=${decoded.payer}`)
    } catch {
      fail('PAYMENT-RESPONSE header: failed to decode base64 JSON')
    }
  } else if (res.status === 200) {
    fail('Missing PAYMENT-RESPONSE header on 200')
  }

  const data = await res.json()

  if (res.status === 200 && data.success && data.order) {
    pass(`Order created: code=${data.order.code}, status=${data.order.status}`)
    pass(`Ticket URL: ${data.order.ticketUrl}`)
    if (data.payment?.txHash) {
      pass(`txHash: ${data.payment.txHash}`)
    }
  } else if (res.status === 402) {
    fail(`Settlement failed (402): ${data.error}`)
    info('This usually means insufficient USDC balance on the test wallet')
  } else {
    fail(`Unexpected response: ${res.status} — ${data.error || JSON.stringify(data)}`)
  }

  return data
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   x402 v2 Agent Payment Flow Test        ║')
  console.log('╚══════════════════════════════════════════╝')

  const privateKey = process.env.TEST_PAYER_PRIVATE_KEY
  let payerAddress: string

  if (privateKey) {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    payerAddress = account.address
    info(`Test wallet: ${payerAddress}`)
    if (SETTLE) info('--settle flag: will attempt full settlement')
  } else {
    // Use a deterministic dummy address for protocol format tests
    payerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
    info('No TEST_PAYER_PRIVATE_KEY — running protocol format tests only')
    info('Set TEST_PAYER_PRIVATE_KEY to enable signature & settlement tests')
  }

  // Step 1: Fetch tickets
  const ticketData = await fetchTickets()
  if (!ticketData) {
    console.error('\nMake sure the dev server is running: pnpm dev')
    process.exit(1)
  }

  // Step 2: Create purchase → validate 402 response
  const result = await createPurchase(ticketData, payerAddress)
  if (!result) process.exit(1)

  // Step 3: Facilitator /supported
  await testFacilitatorSupported()

  // Step 4: Facilitator /verify (needs private key)
  if (privateKey) {
    await testFacilitatorVerify(result.data, privateKey)
  } else {
    section('Step 4: POST /facilitator/verify — SKIPPED (no private key)')
  }

  // Step 5: Full PAYMENT-SIGNATURE settlement (needs private key + --settle + funds)
  if (privateKey && SETTLE) {
    // Need a fresh purchase for settlement (the first one's reference is already used)
    info('Creating fresh purchase for settlement test...')
    const freshResult = await createPurchase(ticketData, payerAddress)
    if (freshResult) {
      await testPaymentSignatureFlow(freshResult.purchaseBody, freshResult.data, privateKey)
    }
  } else if (privateKey && !SETTLE) {
    section('Step 5: PAYMENT-SIGNATURE settlement — SKIPPED (pass --settle to enable)')
  } else {
    section('Step 5: PAYMENT-SIGNATURE settlement — SKIPPED (no private key)')
  }

  // ── Summary ──
  section('Summary')
  if (failures === 0) {
    console.log('\n  🎉 All tests passed!\n')
  } else {
    console.log(`\n  ⚠️  ${failures} test(s) failed\n`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message || err)
  process.exit(1)
})
