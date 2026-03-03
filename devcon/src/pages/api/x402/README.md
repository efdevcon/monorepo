# x402 Ticket Purchase API

This API implements the x402 payment protocol for purchasing Devcon tickets with crypto. It is aligned with **x402 v2**: multi-chain, CAIP-style asset IDs, and a v2-style payment block when the user reaches the crypto payment step.

## Last change recap

- Unified `payment_info` between `purchase.ts` and `verify.ts` (consistent shape, removed unused fields)
- Amount format: `0.000010119 ETH ($0.02)` or `0.02 USDC ($0.02)` — actual crypto amount + USD value
- Order API (`order/[code].ts`) now returns `payment_info` via Pretix REST API `details` field
- Confirmation page uses `payment_info` from API instead of URL query params
- Created `pretix-x402-payment` plugin for Pretix admin display and REST API exposure

## Database (Supabase)

Run migrations in **devcon-api** at `src/supabase/migrations/`

## File reference

| Area | Path |
|------|------|
| **API – tickets** | `src/pages/api/x402/tickets/index.ts`, `purchase.ts`, `fiat-purchase.ts`, `verify.ts`, `status.ts`, `order-status.ts`, `order/[code].ts`, `payment-options.ts`, `validate-voucher.ts` |
| **API – relayer** | `src/pages/api/x402/tickets/relayer/prepare-authorization.ts`, `execute-transfer.ts` |
| **API – facilitator** | `src/pages/api/x402/tickets/facilitator/supported.ts`, `verify.ts`, `settle.ts` |
| **Pages – store** | `src/pages/tickets/index.tsx`, `store/index.tsx`, `store/checkout.tsx`, `store/checkout.module.scss`, `store/redeem.tsx`, `store/order/[code]/[secret].tsx`, `store/order/[code]/confirmation.module.scss`, `tickets-landing.module.scss` |
| **Pages – test** | `src/pages/x402-test.tsx` |
| **Services** | `src/services/pretix.ts`, `src/services/relayer.ts`, `src/services/ticketStore.ts`, `src/services/x402.ts` |
| **Types** | `src/types/pretix.ts`, `src/types/x402.ts` |
| **Scripts** | `src/scripts/pretix/test-all.ts`, `test-categories.ts`, `test-event.ts`, `test-items.ts`, `test-questions.ts`, `test-quotas.ts`, `test-x402-flow.ts` |

## Overview

The x402 protocol uses HTTP 402 (Payment Required) responses to facilitate cryptocurrency payments. This implementation:

- Supports **USDC, USDT0, and ETH** on **Ethereum, Optimism, Arbitrum, Base** (mainnet) or **Base Sepolia** (testnet). USDT0 is available on Optimism and Arbitrum only.
- Returns a **v2-style payment block** with `paymentId`, `supportedAssets` (CAIP-19 style), and `Payment-Required` header
- Provides a **3% discount** for crypto payments
- Integrates with **Pretix** for ticket management
- Multi-chain verification: `verify.ts` accepts a `chainId` parameter to verify transactions on any supported chain. The gasless relayer operates on the configured default chain (Base / Base Sepolia).

## x402 libraries

This implementation uses the official [x402](https://github.com/coinbase/x402) SDK types and is compatible with the ecosystem:

- **@x402/core** – We use and re-export protocol types: `PaymentRequired`, `PaymentRequirements`, `ResourceInfo`, `PaymentPayload`, `VerifyResponse`, `SettleResponse`, `SupportedResponse`, etc. (from `@x402/core/types`). The 402 response includes an `x402` field that is a `PaymentRequired` so spec-compliant and SDK-based clients can consume it.
- **@x402/evm** – Available for future use (e.g. ExactEvmScheme, client helpers).
- **Facilitator URL for buyers** – Our API acts as its own facilitator. Buyers or SDKs (e.g. `HTTPFacilitatorClient`, `@x402/fetch`) can point to this app’s facilitator base URL so that **verify**, **settle**, and **supported** are called on our server:
  - Base URL: `https://<your-app-origin>/api/x402/tickets/facilitator`
  - Endpoints: `POST .../verify`, `POST .../settle`, `GET .../supported`
  - Request/response shapes match the [x402 facilitator interface](https://docs.cdp.coinbase.com/x402/welcome) (e.g. verify/settle request body: `paymentPayload`, `paymentRequirements`).

## x402 v2 compliance

This API is **dual-mode**: fully x402 v2 compliant for SDK/agent consumers while also providing a richer multi-step checkout flow for the frontend.

### Spec-compliant features

| Spec area | Implementation |
|-----------|----------------|
| **PAYMENT-REQUIRED header (§5.1)** | 402 responses set `PAYMENT-REQUIRED` header with base64-encoded `PaymentRequired` JSON (`x402Version: 2`, `resource`, `accepts[]`, `extensions`). Legacy `Payment-Required: true` and `X-Payment-*` headers are also set for backward compatibility. |
| **PaymentRequired body (§5.1)** | The 402 response body includes an `x402` field containing a spec-compliant `PaymentRequired` object with `accepts[]` array. Each entry has `scheme: "exact"`, `network` (CAIP-2, e.g. `eip155:8453`), `amount` (atomic string), `asset` (token address), `payTo`, `maxTimeoutSeconds`, and `extra` (includes `paymentReference`). |
| **PAYMENT-SIGNATURE retry flow (§5.2)** | SDK clients can retry the same `POST /purchase` with a `PAYMENT-SIGNATURE` header containing a base64-encoded `PaymentPayload`. The server verifies the EIP-712 signature, settles on-chain via the relayer, creates the Pretix order, and returns the resource with a `PAYMENT-RESPONSE` header. |
| **PAYMENT-RESPONSE header (§5.3)** | Success responses from verify, execute-transfer, and the PAYMENT-SIGNATURE flow include a `PAYMENT-RESPONSE` header with base64-encoded `SettlementResponse` (`success`, `transaction`, `network`, `payer`). |
| **Exact scheme (EIP-3009)** | Uses EIP-3009 `transferWithAuthorization` for gasless USDC; authorization shape matches spec (from, to, value, validAfter, validBefore, nonce). |
| **EIP-712 signature verification** | Relayer and facilitator verify EIP-712 typed data signatures before execution. |
| **Replay protection** | Per-auth nonce, time bounds (`validAfter`/`validBefore`), and blockchain-level nonce enforcement. |
| **CAIP-style identifiers** | `network` uses CAIP-2 (`eip155:8453`), `supportedAssets` use CAIP-19 (`eip155:8453/erc20:0x...`). |
| **Facilitator API (§7)** | Full facilitator at `/api/x402/tickets/facilitator/`: `POST /verify` (accepts `{ paymentPayload, paymentRequirements }`, returns `VerifyResponse` with spec error codes), `POST /settle` (same request, executes via relayer, returns `SettleResponse`), `GET /supported` (returns `kinds`, `extensions`, `signers`). |
| **Error codes (§9)** | Facilitator endpoints return spec error codes: `insufficient_funds`, `invalid_exact_evm_payload_signature`, `invalid_network`, etc. |

### Dual-mode design

The API serves two audiences:

1. **SDK/agent clients** (`@x402/fetch`, `HTTPFacilitatorClient`) — Use the standard x402 v2 flow:
   - `POST /purchase` → 402 + `PAYMENT-REQUIRED` header
   - Client signs → retries same POST + `PAYMENT-SIGNATURE` header
   - Server settles → 200 + `PAYMENT-RESPONSE` header + order resource

2. **Frontend checkout** — Uses the richer multi-step flow for better UX:
   - `POST /purchase` → 402 + payment details, order summary, supported assets
   - `POST /payment-options` → balances across chains
   - `POST /relayer/prepare-authorization` → EIP-712 typed data
   - Client signs → `POST /relayer/execute-transfer` → txHash
   - `POST /verify` → Pretix order created

Both flows produce the same result (a paid Pretix order) and share the same payment infrastructure.

### What is not implemented

| Spec area | Status |
|-----------|--------|
| **Discovery (§8)** | Not implemented (`GET /discovery/resources`, Bazaar). Optional in the spec. |
| **Multi-chain gasless relayer** | The gasless relayer (EIP-3009) only operates on the configured default chain (Base or Base Sepolia). Direct payments (ETH, USDC, USDT0) are verified on any supported chain via the `chainId` parameter in `verify.ts`. |
| **Permit2 scheme** | Not implemented. Only EIP-3009 exact scheme is supported. |
| **sign-in-with-x extension** | Not implemented. |

## Environment Variables

Pretix URLs, organizer/event slugs, payment addresses, and chain config are **not** env vars — they live in `src/config/ticketing.ts` and are selected by a single toggle:

```bash
NEXT_PUBLIC_PRETIX_ENV=development   # "development" or "production" — selects the config profile

# Pretix API tokens (one per environment)
PRETIX_API_TOKEN_DEV=...
PRETIX_API_TOKEN_PROD=...

# Relayer private key (gas sponsorship + fallback address derivation)
ETH_RELAYER_PAYMENT_PRIVATE_KEY=0x...
```

See `src/config/ticketing.ts` for all env-specific values (Pretix base URL, organizer, event, payment recipient, chain env, etc.).

## API Endpoints

### 1. Get Available Tickets

```
GET /api/x402/tickets
```

Returns complete ticket information including:
- Event details
- Available tickets with prices
- Required questions to answer
- Available addons
- Payment network information

**Query Parameters:**
- `locale` (optional): Language code (default: "en")

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "name": "Devcon 7",
      "currency": "USD",
      "dateFrom": "2026-11-03",
      "dateTo": "2026-11-06",
      "location": "Mumbai, India"
    },
    "tickets": [
      {
        "id": 1,
        "name": "General Admission",
        "price": "599.00",
        "available": true,
        "isAdmission": true,
        "variations": [],
        "addons": [
          {
            "categoryId": 2,
            "categoryName": "Workshops",
            "minCount": 0,
            "maxCount": 3,
            "items": [...]
          }
        ]
      }
    ],
    "questions": [
      {
        "id": 1,
        "question": "What is your role?",
        "type": "C",
        "required": true,
        "appliesToItems": [1],
        "options": [
          { "id": 1, "answer": "Developer" },
          { "id": 2, "answer": "Researcher" }
        ]
      }
    ],
    "paymentInfo": {
      "network": "base",
      "chainId": 8453,
      "tokenSymbol": "USDC",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "discountForCrypto": "3%",
      "supportedAssets": [
        { "asset": "eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "symbol": "USDC", "name": "USD Coin", "chain": "Ethereum", "chainId": "eip155:1", "decimals": 6 },
        { "asset": "eip155:1/erc20:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "symbol": "ETH", "name": "Ether", "chain": "Ethereum", "chainId": "eip155:1", "decimals": 18 }
      ]
    }
  }
}
```

### 2. Create Purchase (Get Payment Requirements)

```
POST /api/x402/tickets/purchase
```

Creates a pending order and returns payment requirements.

**Request Body:**
```json
{
  "email": "attendee@example.com",
  "intendedPayer": "0x...",
  "tickets": [
    { "itemId": 1, "variationId": null, "quantity": 1 }
  ],
  "addons": [
    { "itemId": 5, "quantity": 1 }
  ],
  "answers": [
    { "questionId": 1, "answer": "Developer" },
    { "questionId": 2, "answer": "US" }
  ],
  "attendee": {
    "name": {
      "given_name": "John",
      "family_name": "Doe"
    },
    "email": "attendee@example.com",
    "company": "Ethereum Foundation",
    "country": "US"
  }
}
```

`intendedPayer` (required) is the wallet address that will pay (must use EIP-55 mixed-case checksum); only this address can verify the payment (prevents tx reuse attack).

**Response (HTTP 402):**
```json
{
  "success": true,
  "paymentRequired": true,
  "payment": {
    "paymentId": "x402_abc123...",
    "amount": 581.03,
    "currency": "USD",
    "referenceId": "x402_abc123...",
    "status": "pending",
    "createdAt": 1770834183,
    "supportedAssets": [
      { "asset": "eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "symbol": "USDC", "name": "USD Coin", "chain": "Ethereum", "chainId": "eip155:1", "decimals": 6 },
      { "asset": "eip155:1/erc20:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "symbol": "ETH", "name": "Ether", "chain": "Ethereum", "chainId": "eip155:1", "decimals": 18 },
      { "asset": "eip155:10/erc20:0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", "symbol": "USDC", "name": "USD Coin", "chain": "Optimism", "chainId": "eip155:10", "decimals": 6 },
      { "asset": "eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "symbol": "USDC", "name": "USD Coin", "chain": "Arbitrum", "chainId": "eip155:42161", "decimals": 6 },
      { "asset": "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "symbol": "USDC", "name": "USD Coin", "chain": "Base", "chainId": "eip155:8453", "decimals": 6 }
    ]
  },
  "paymentDetails": {
    "resource": "/api/x402/tickets/purchase",
    "payment": {
      "network": "base",
      "chainId": 8453,
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "tokenSymbol": "USDC",
      "tokenDecimals": 6,
      "amount": "581070000",
      "amountFormatted": "581.07 USDC",
      "recipient": "0x...",
      "paymentReference": "x402_abc123...",
      "expiresAt": 1699999999
    }
  },
  "orderSummary": {
    "tickets": [{ "name": "General Admission", "price": "599.00", "quantity": 1 }],
    "addons": [],
    "subtotal": "599.00",
    "cryptoDiscount": "17.97",
    "total": "581.03",
    "currency": "USD"
  }
}
```

**Response Headers:**
```
Payment-Required: true
X-Payment-Required: true
X-Payment-Network: base
X-Payment-Token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
X-Payment-Amount: 581070000
X-Payment-Recipient: 0x...
X-Payment-Reference: x402_abc123...
```

### 3. Verify Payment & Complete Order

```
POST /api/x402/tickets/verify
```

Verifies the on-chain payment and creates the Pretix order.

**Request Body:**
```json
{
  "txHash": "0x...",
  "paymentReference": "x402_abc123...",
  "payer": "0x..."
}
```

**Validation:** `txHash` must be `0x` + 64 hex characters. `payer` must be a valid Ethereum address with EIP-55 mixed-case checksum (use `getAddress(addr)` from viem before sending).

**Response (Success):**
```json
{
  "success": true,
  "order": {
    "code": "ABC12",
    "secret": "orderSecret123",
    "email": "attendee@example.com",
    "total": "581.03",
    "status": "paid",
    "ticketUrl": "https://ticketh.xyz/devcon/7/order/ABC12/orderSecret123/"
  },
  "payment": {
    "txHash": "0x...",
    "payer": "0x...",
    "confirmedAt": 1699999999,
    "blockNumber": 12345678
  }
}
```

### 4. Check Order Status

```
GET /api/x402/tickets/status?paymentReference=xxx
GET /api/x402/tickets/status?orderCode=xxx
```

**Response:**
```json
{
  "success": true,
  "status": "pending|completed|expired|not_found",
  "order": {
    "code": "ABC12",
    "ticketUrl": "https://ticketh.xyz/devcon/7/order/ABC12/"
  },
  "payment": {
    "txHash": "0x...",
    "completedAt": 1699999999
  }
}
```

## Gas-Sponsored (Gasless) Payments

The API supports gasless USDC payments using EIP-3009 (TransferWithAuthorization). Users sign an authorization message, and the relayer executes the transaction, paying gas fees from `ETH_RELAYER_PAYMENT_PRIVATE_KEY`.

### Benefits
- **No ETH required**: Users only need USDC, no ETH for gas
- **Better UX**: Single signature instead of transaction confirmation
- **Same security**: On-chain verification still applies

### 5. Prepare Authorization (Gasless)

```
POST /api/x402/tickets/relayer/prepare-authorization
```

Generates EIP-712 typed data for the user to sign.

**Request Body:**
```json
{
  "paymentReference": "x402_abc123...",
  "from": "0x..."  // User's wallet address
}
```

**Response:**
```json
{
  "success": true,
  "typedData": {
    "domain": {
      "name": "USD Coin",
      "version": "2",
      "chainId": 8453,
      "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    "types": {
      "TransferWithAuthorization": [
        { "name": "from", "type": "address" },
        { "name": "to", "type": "address" },
        { "name": "value", "type": "uint256" },
        { "name": "validAfter", "type": "uint256" },
        { "name": "validBefore", "type": "uint256" },
        { "name": "nonce", "type": "bytes32" }
      ]
    },
    "primaryType": "TransferWithAuthorization",
    "message": {
      "from": "0x...",
      "to": "0x...",
      "value": "581070000",
      "validAfter": 0,
      "validBefore": 1699999999,
      "nonce": "0x..."
    }
  },
  "authorization": {
    "from": "0x...",
    "to": "0x...",
    "value": "581070000",
    "validAfter": 0,
    "validBefore": 1699999999,
    "nonce": "0x..."
  }
}
```

### 6. Execute Transfer (Gasless)

```
POST /api/x402/tickets/relayer/execute-transfer
```

Executes the authorized transfer. The relayer pays gas fees.

**Request Body:**
```json
{
  "paymentReference": "x402_abc123...",
  "authorization": {
    "from": "0x...",
    "to": "0x...",
    "value": "581070000",
    "validAfter": 0,
    "validBefore": 1699999999,
    "nonce": "0x..."
  },
  "signature": {
    "v": 28,
    "r": "0x...",
    "s": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x..."
}
```

After receiving the txHash, call `/api/x402/tickets/verify` as normal to complete the order.

## Client Integration Example

### JavaScript/TypeScript

```typescript
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';

const API_BASE = 'https://your-api.com';

// 1. Get available tickets
const ticketsRes = await fetch(`${API_BASE}/api/x402/tickets`);
const { data: ticketData } = await ticketsRes.json();

// 2. Create purchase request (intendedPayer = wallet that will pay)
const purchaseRes = await fetch(`${API_BASE}/api/x402/tickets/purchase`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    intendedPayer: userAddress, // wallet address that will send USDC
    tickets: [{ itemId: ticketData.tickets[0].id, quantity: 1 }],
    answers: [/* ... */],
    attendee: {
      name: { given_name: 'John', family_name: 'Doe' },
    },
  }),
});

const { paymentDetails, orderSummary } = await purchaseRes.json();

// 3. Send USDC payment
const usdcAbi = [
  'function transfer(address to, uint256 amount) returns (bool)',
];

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
});

const txHash = await walletClient.writeContract({
  address: paymentDetails.payment.tokenAddress,
  abi: usdcAbi,
  functionName: 'transfer',
  args: [
    paymentDetails.payment.recipient,
    BigInt(paymentDetails.payment.amount),
  ],
});

// 4. Verify payment
const verifyRes = await fetch(`${API_BASE}/api/x402/tickets/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash,
    paymentReference: paymentDetails.payment.paymentReference,
    payer: walletClient.account.address,
  }),
});

const { order } = await verifyRes.json();
console.log('Ticket URL:', order.ticketUrl);
```

### Gasless Payment Flow

```typescript
import { useSignTypedData } from 'wagmi';

const API_BASE = 'https://your-api.com';

// After creating purchase (step 2 above)...

// 3a. Prepare gasless authorization
const prepareRes = await fetch(`${API_BASE}/api/x402/tickets/relayer/prepare-authorization`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentReference: paymentDetails.payment.paymentReference,
    from: userAddress,
  }),
});

const { typedData, authorization } = await prepareRes.json();

// 3b. Sign the typed data (wagmi example)
const signature = await signTypedDataAsync({
  domain: typedData.domain,
  types: typedData.types,
  primaryType: 'TransferWithAuthorization',
  message: {
    from: typedData.message.from,
    to: typedData.message.to,
    value: BigInt(typedData.message.value),
    validAfter: BigInt(typedData.message.validAfter),
    validBefore: BigInt(typedData.message.validBefore),
    nonce: typedData.message.nonce,
  },
});

// 3c. Parse signature and execute
const r = signature.slice(0, 66);
const s = '0x' + signature.slice(66, 130);
const v = parseInt(signature.slice(130, 132), 16);

const executeRes = await fetch(`${API_BASE}/api/x402/tickets/relayer/execute-transfer`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentReference: paymentDetails.payment.paymentReference,
    authorization,
    signature: { v, r, s },
  }),
});

const { txHash } = await executeRes.json();

// 4. Verify payment (same as direct payment)
const verifyRes = await fetch(`${API_BASE}/api/x402/tickets/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    txHash,
    paymentReference: paymentDetails.payment.paymentReference,
    payer: userAddress,
  }),
});

const { order } = await verifyRes.json();
console.log('Ticket URL:', order.ticketUrl);
```

## Question Types

When answering questions, use these formats based on the question type:

| Type | Code | Format |
|------|------|--------|
| String | S | `"text"` |
| Text (multi-line) | T | `"text"` |
| Number | N | `"123"` |
| Boolean | B | `"true"` or `"false"` |
| Choice (single) | C | `"option_id"` |
| Multiple Choice | M | `["id1", "id2"]` |
| Country Code | CC | `"US"` |
| Date | D | `"2024-01-15"` |
| Time | H | `"14:30"` |
| Datetime | W | `"2024-01-15T14:30:00"` |
| Phone | TEL | `"+1234567890"` |

## Testing

Run the test scripts to verify the Pretix API connection:

```bash
# Test individual Pretix endpoints (uses config from src/config/ticketing.ts)
pnpm pretix:test-event
pnpm pretix:test-items
pnpm pretix:test-questions
pnpm pretix:test-quotas

# Test all at once
pnpm pretix:test-all

# Test the full x402 flow (requires running API)
pnpm dev  # In one terminal
pnpm x402:test-flow  # In another
```

## Pretix Plugin: pretix-x402-payment

A minimal Pretix payment provider plugin (`pretix-x402-payment`) that stores and displays on-chain crypto payment details in the Pretix admin.

**Location:** `https://github.com/efdevcon/pretix-x402-payment`

### What it does

- Registers `x402_crypto` as a payment provider in Pretix
- Renders tx hash (linked to block explorer), network, token, amount, payer wallet, and block number in the admin order view
- Exposes payment details via the Pretix REST API `details` field (used by the order API)

### How payment_info flows

1. **purchase.ts / verify.ts** builds a `payment_info` object after on-chain verification
2. `createOrder()` includes `payment_info` in the order payload → stored as the payment's `info` JSON field in Pretix
3. `confirmOrderPayment()` confirms the `x402_crypto` payment with the same `payment_info` → updates the payment's `info` field
4. **Admin view**: Plugin's `payment_control_render()` reads `payment.info_data` and renders the HTML template
5. **REST API**: Plugin's `api_payment_details()` returns `payment.info_data`, populating the `details` field on the payment object
6. **Order API** (`order/[code].ts`): Reads `details` from the x402_crypto payment and returns it as `payment_info`
7. **Confirmation page** (`order/[code]/[secret].tsx`): Fetches order via API, uses `payment_info` to display crypto details (network, token, tx link, amount)

### payment_info shape

```json
{
  "tx_hash": "0x...",
  "chain_id": 8453,
  "token_symbol": "USDC",
  "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "amount": "0.02 USDC ($0.02)",
  "payer": "0x...",
  "payment_reference": "x402_abc123...",
  "block_number": 12345678
}
```

`token_address` is omitted for native ETH payments. `amount` always includes the crypto amount, symbol, and USD value in parentheses.

## Security Considerations

1. **Payment Reference**: Each payment reference is single-use and expires after 1 hour
2. **On-chain Verification**: Payments are verified directly on the blockchain
3. **Private Key**: The `ETH_RELAYER_PAYMENT_PRIVATE_KEY` derives the payment recipient address
4. **Rate Limiting**: Consider adding rate limiting in production

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:
- `400` - Bad request (validation error)
- `402` - Payment required (expected for purchase endpoint)
- `404` - Not found (invalid payment reference)
- `405` - Method not allowed
- `500` - Server error
