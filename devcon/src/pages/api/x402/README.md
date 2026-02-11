# x402 Ticket Purchase API

This API implements the x402 payment protocol for purchasing Devcon tickets with crypto. It is aligned with **x402 v2**: multi-chain, CAIP-style asset IDs, and a v2-style payment block when the user reaches the crypto payment step.

## Last change recap

**Commit:** dynamic checkout with x402 crypto payment + gas sponsoring — USDC on Base (3% discount), Pretix integration, gasless EIP-3009 relayer.

## Database (Supabase)

Run migrations in **devcon-api** at `src/supabase/migrations/`

## File reference

| Area | Path |
|------|------|
| **API – tickets** | `src/pages/api/x402/tickets/index.ts`, `purchase.ts`, `fiat-purchase.ts`, `verify.ts`, `status.ts`, `order-status.ts`, `order/[code].ts` |
| **API – relayer** | `src/pages/api/x402/tickets/relayer/prepare-authorization.ts`, `execute-transfer.ts` |
| **API – facilitator** | `src/pages/api/x402/tickets/facilitator/supported.ts`, `verify.ts` |
| **Pages – store** | `src/pages/tickets/index.tsx`, `store/index.tsx`, `store/checkout.tsx`, `store/checkout.module.scss`, `store/order/[code]/[secret].tsx`, `store/order/[code]/confirmation.module.scss`, `tickets-landing.module.scss` |
| **Pages – test** | `src/pages/x402-test.tsx` |
| **Services** | `src/services/pretix.ts`, `src/services/relayer.ts`, `src/services/ticketStore.ts`, `src/services/x402.ts` |
| **Types** | `src/types/pretix.ts`, `src/types/x402.ts` |
| **Scripts** | `src/scripts/pretix/test-all.ts`, `test-categories.ts`, `test-event.ts`, `test-items.ts`, `test-questions.ts`, `test-quotas.ts`, `test-x402-flow.ts` |

## Overview

The x402 protocol uses HTTP 402 (Payment Required) responses to facilitate cryptocurrency payments. This implementation:

- Supports **USDC and ETH** on **Ethereum, Optimism, Arbitrum, Base** (mainnet) or **Base Sepolia** (testnet)
- Returns a **v2-style payment block** with `paymentId`, `supportedAssets` (CAIP-19 style), and `Payment-Required` header
- Provides a **3% discount** for crypto payments
- Integrates with **Pretix** for ticket management
- Verification and relayer currently use the configured default chain (Base / Base Sepolia); multi-chain verify can be added later

## x402 libraries

This implementation uses the official [x402](https://github.com/coinbase/x402) SDK types and is compatible with the ecosystem:

- **@x402/core** – We use and re-export protocol types: `PaymentRequired`, `PaymentRequirements`, `ResourceInfo`, `PaymentPayload`, `VerifyResponse`, `SettleResponse`, `SupportedResponse`, etc. (from `@x402/core/types`). The 402 response includes an `x402` field that is a `PaymentRequired` so spec-compliant and SDK-based clients can consume it.
- **@x402/evm** – Available for future use (e.g. ExactEvmScheme, client helpers).
- **Facilitator URL for buyers** – Our API acts as its own facilitator. Buyers or SDKs (e.g. `HTTPFacilitatorClient`, `@x402/fetch`) can point to this app’s facilitator base URL so that **verify**, **settle**, and **supported** are called on our server:
  - Base URL: `https://<your-app-origin>/api/x402/tickets/facilitator`
  - Endpoints: `POST .../verify`, `POST .../settle`, `GET .../supported`
  - Request/response shapes match the [x402 facilitator interface](https://docs.cdp.coinbase.com/x402/welcome) (e.g. verify/settle request body: `paymentPayload`, `paymentRequirements`).

## x402 v2 alignment

This API follows x402 v2 conventions where applicable:

- **Payment-Required header** – Responses that require payment set `Payment-Required: true` (and legacy `X-Payment-Required: true`).
- **Payment block** – When the user reaches the crypto payment step (402 from purchase), the body includes a `payment` object:
  - `paymentId` – Same as the payment reference (used to verify and complete the order).
  - `amount`, `currency`, `referenceId`, `status: "pending"`, `createdAt` (Unix time).
  - `supportedAssets` – Array of assets the user can pay with: **USDC** and **ETH** (native) on **Ethereum (1), Optimism (10), Arbitrum (42161), Base (8453)** (mainnet), or Base Sepolia (84532) in testnet. Each entry uses CAIP-style `asset` (e.g. `eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`) and `chainId` (`eip155:1`), plus `symbol`, `name`, `chain`, `decimals`.
- **GET /api/x402/tickets** – Includes `paymentInfo.supportedAssets` so clients can show supported chains and assets before starting a purchase.
- **Verify / relayer** – Still use the single configured chain (Base or Base Sepolia). Extending verify to accept `chainId` (and optionally asset) for multi-chain is a possible follow-up.

## x402 Protocol Specification v2 – alignment

This implementation is **not fully compliant** with the [X402 Protocol Specification (Protocol Version 2)](https://github.com/coinbase/x402). Below is what we follow and what we do differently.

### What we follow

| Spec area | Our implementation |
|-----------|---------------------|
| **Exact scheme (EIP-3009)** | We use EIP-3009 `transferWithAuthorization` for gasless USDC; authorization shape matches (from, to, value, validAfter, validBefore, nonce). |
| **EIP-3009 verification** | Relayer validates signature, amount, recipient, time window; we simulate/execute via `transferWithAuthorization`. |
| **Replay protection** | Per-auth nonce, time bounds, and signature verification. |
| **CAIP-style identifiers** | We use CAIP-style `asset` and `chainId` in `supportedAssets` (e.g. `eip155:8453`). |
| **Payment-Required signal** | We set `Payment-Required: true` (and legacy `X-Payment-Required`) on 402. |

### Where we differ from the spec

**1. PaymentRequired schema (§5.1)**  
The spec defines a single JSON payload for “payment required”:

- **Spec:** Top-level `x402Version: 2`, `error` (optional), `resource` (ResourceInfo: url, description, mimeType), **`accepts`** (array of PaymentRequirements), `extensions`.
- **Each PaymentRequirements in accepts:** `scheme`, `network` (CAIP-2 string, e.g. `eip155:84532`), `amount` (string, atomic), `asset` (address), `payTo`, `maxTimeoutSeconds`, `extra`.

We do **not** return that shape. We return:

- `success`, `paymentRequired`, **`payment`** (our v2-style block: paymentId, amount, currency, referenceId, status, createdAt, supportedAssets), **`paymentDetails`** (resource + nested `payment` with `network`, `chainId` (number), `tokenAddress`, `amount`, `recipient`, `paymentReference`, `expiresAt`, etc.), `orderSummary`.
- No top-level `x402Version`.
- No top-level `resource` as ResourceInfo.
- No **`accepts`** array of spec PaymentRequirements (we have one effective option in `paymentDetails` and list assets in `payment.supportedAssets`).

So a spec-compliant client expecting **PaymentRequired** (with `accepts[]`) would not find it.

**2. PaymentRequirements field names**  
Spec uses `payTo`, `network` (CAIP-2 string), `maxTimeoutSeconds`. We use `recipient`, `network` (e.g. `"base"`), `chainId` (number), `expiresAt` (Unix), and no `scheme` or `maxTimeoutSeconds`.

**3. PaymentPayload and retry flow (§5.2)**  
Spec: client retries the resource request with a **PaymentPayload** in the body (or transport-defined header): `x402Version`, `resource`, **`accepted`** (one PaymentRequirements), **`payload`** (e.g. `signature` + `authorization` for exact EVM).

We do **not** use that flow. We use a **multi-step** flow:

- POST purchase → 402 + payment details.
- POST **prepare-authorization** (paymentReference, from) → EIP-712 typed data.
- Client signs; POST **execute-transfer** (paymentReference, authorization, signature) → we settle and return txHash.
- Alternatively, client pays on-chain (USDC transfer) then POST **verify** (txHash, paymentReference, payer) to complete the order.

So we have no single “retry with PaymentPayload” request; we have separate prepare / execute / verify endpoints.

**4. Facilitator API (§7)**  
Spec defines a **facilitator** with:

- **POST /verify** – Request: `paymentPayload` + `paymentRequirements`. Response: **VerifyResponse** (`isValid`, `invalidReason?`, `payer?`). Verifies authorization **without** executing.
- **POST /settle** – Same request. Response: **SettlementResponse** (`success`, `transaction`, `network`, `payer`, `errorReason?`).
- **GET /supported** – Response: `kinds` (x402Version, scheme, network), `extensions`, `signers`.

We do **not** implement that facilitator interface:

- Our **verify** is different: it accepts **txHash + paymentReference + payer** (proof of an already-executed transfer), then verifies on-chain and creates the Pretix order. It is not “verify this PaymentPayload”.
- Our **execute-transfer** is similar to “settle” but takes our own request shape (paymentReference, authorization, signature), not `paymentPayload` + `paymentRequirements`. Response is `{ success, txHash }` (no `network` or `payer` in the spec shape).
- We have **no GET /supported** endpoint.

**5. SettlementResponse / VerifyResponse shapes (§5.3, 5.4)**  
Spec: SettlementResponse includes `transaction`, `network` (CAIP-2), `payer`. We return only `success` and `txHash`.  
Spec: VerifyResponse is `isValid`, `invalidReason?`, `payer?`. Our verify returns order + payment info, not that schema.

**6. Discovery (§8)**  
We do not implement **GET /discovery/resources** or any Bazaar discovery.

**7. Error codes (§9)**  
Spec defines standard codes (e.g. `insufficient_funds`, `invalid_exact_evm_payload_signature`). We return generic `error` strings, not these codes.

### Summary

We implement an **x402-inspired** ticket payment flow with EIP-3009, 402 signaling, and a v2-style payment block with `supportedAssets`, but we do **not** implement the spec’s exact **PaymentRequired** / **PaymentPayload** schemas, the single-retry-with-payload flow, or the facilitator **/verify**, **/settle**, **/supported** APIs. To align fully with the spec we would need to:

1. Add a spec-compliant **PaymentRequired** payload (e.g. `x402Version`, `resource`, `accepts[]` with scheme, network in CAIP-2, amount, asset, payTo, maxTimeoutSeconds, extra) alongside or instead of the current body.
2. Optionally support the **PaymentPayload** retry flow (client sends `accepted` + `payload` on retry) and/or expose facilitator-style **POST /verify** and **POST /settle** that accept and return the spec request/response shapes.
3. Add **GET /supported** and, if desired, discovery and spec error codes.

## Environment Variables

```bash
# Required - Pretix Configuration
PRETIX_BASE_URL=https://your-pretix-instance.com    # Base URL (api/v1/ is added automatically)
PRETIX_API_TOKEN=your_pretix_api_token              # API token from Pretix user settings
PRETIX_ORGANIZER=org                                 # Organizer slug
PRETIX_EVENT=test                                    # Event slug

# Required - Payment Configuration (one of these)
PAYMENT_RECIPIENT_ADDRESS=0x...                     # Explicit address to receive payments
ETH_RELAYER_PAYMENT_PRIVATE_KEY=0x...               # Private key for relayer (gas sponsorship + address derivation)

# Optional - Network Selection
NEXT_PUBLIC_CHAIN_ENV=mainnet  # Set to 'mainnet' for Base mainnet, otherwise uses Base Sepolia testnet
```

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
    "email": "attendee@example.com",
    "total": "581.03",
    "status": "paid",
    "ticketUrl": "https://ticketh.xyz/devcon/7/order/ABC12/secret/"
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
# Test individual endpoints (uses PRETIX_ORGANIZER and PRETIX_EVENT from .env)
pnpm pretix:test-event
pnpm pretix:test-items
pnpm pretix:test-questions
pnpm pretix:test-quotas

# Test all at once
pnpm pretix:test-all

# Or override organizer/event inline
PRETIX_ORGANIZER=org PRETIX_EVENT=test pnpm pretix:test-all

# Test the full x402 flow (requires running API)
pnpm dev  # In one terminal
pnpm x402:test-flow  # In another
```

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
