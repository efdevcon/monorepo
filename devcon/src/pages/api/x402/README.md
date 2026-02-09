# x402 Ticket Purchase API

This API implements the x402 payment protocol for purchasing Devcon tickets with USDC on Base network.

## Overview

The x402 protocol uses HTTP 402 (Payment Required) responses to facilitate cryptocurrency payments. This implementation:

- Accepts USDC payments on **Base mainnet** (production) or **Base Sepolia** (development)
- Provides a **3% discount** for crypto payments
- Integrates with **Pretix** for ticket management

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
      "discountForCrypto": "3%"
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

**Response (HTTP 402):**
```json
{
  "success": true,
  "paymentRequired": true,
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

// 2. Create purchase request
const purchaseRes = await fetch(`${API_BASE}/api/x402/tickets/purchase`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
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
