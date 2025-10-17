# Coinbase CDP v2 Smart Account Setup

Gasless USDC transfers using CDP Smart Account (ERC-4337) + Paymaster.

**Benefits:**
- 🔐 CDP secures keys in AWS Nitro Enclave
- 🔄 Accounts persist automatically by name
- 💰 Coinbase sponsors gas via CDP Paymaster (up to $10k/month in credits)
- 🚀 No private key management needed
- ⚡ Bundler handles efficient transaction submission

## Setup

### 1. Get CDP Credentials

**API Keys:**
- Go to https://portal.cdp.coinbase.com/
- Navigate to **API Keys** → Create **Secret API Key**
- Copy `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`

**Wallet Secret:**
- Go to **Server Wallet** (sidebar) → **Configuration**
- Click **Generate new secret** → Complete 2FA
- Copy `CDP_WALLET_SECRET`

### 2. Configure Environment

Add to `.env.local`:
```bash
NEXT_PUBLIC_USE_COINBASE_SMART_WALLET=true
CDP_API_KEY_ID="your-key-id"
CDP_API_KEY_SECRET="your-key-secret"
CDP_WALLET_SECRET="your-wallet-secret"
CDP_NETWORK_ID="base-mainnet"  # or base-sepolia for testnet
CDP_PAYMASTER_URL="https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY"
```

### 3. Setup Gas Sponsorship (Required!)

Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster

1. Click **Create Policy**
2. Set spending limits
3. **Add to allowlist:**
   - Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC on Base)
   - Function: `transferWithAuthorization`

Without this, you'll get `contract address is not allowed` error.

### 4. Create Smart Account

```bash
pnpm create-wallet
```

Copy the smart account address from output.

**Current Smart Account:** `0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7` (Base Mainnet)

### 5. Fund Smart Account

Smart account needs ETH for EntryPoint collateral (even with Paymaster sponsoring gas).

The EntryPoint contract (`0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`) manages the ERC-4337 account abstraction flow and requires a small ETH balance for validation.

**Mainnet:**
```bash
# Minimum: 0.001 ETH (~$3) - good for ~100 transactions
# Recommended: 0.01 ETH (~$30) - rarely need to refill
```

**Testnet:**
```bash
# Get free ETH: https://www.coinbase.com/faucets/base-sepolia-faucet
# Send to your smart account address
```

### 6. Test

- Make a transfer
- Monitor at https://portal.cdp.coinbase.com/

## How It Works

All USDC payment transactions are now fully sponsored by Coinbase via CDP infrastructure:

```
Frontend (Para Wallet)
  → Signs EIP-3009 message (transferWithAuthorization)
    → Backend receives signed message
      → CDP Smart Account (ERC-4337) relays transaction
        → Bundler submits UserOperation to EntryPoint
          → Paymaster sponsors gas fees
            → USDC transfer executes on Base
```

**Key Components:**

- **Smart Account** (`0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7`): ERC-4337 smart contract wallet managed by CDP
- **EntryPoint** (`0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`): Standard ERC-4337 contract that orchestrates UserOperations
- **Bundler**: CDP service that collects and submits UserOperations to the blockchain
- **Paymaster**: CDP service that sponsors gas fees (up to $10k/month in credits)
- **USDC Contract** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`): Base mainnet USDC token

Instead of managing private keys and sponsoring gas via an EOA, Coinbase handles everything through their secure CDP infrastructure.

## Monitoring

**CDP Dashboard:** <https://portal.cdp.coinbase.com/>

- UserOperation history and status
- Gas usage & sponsorship tracking
- Success rates and error logs
- Paymaster policy configuration
- Export CSV logs with UserOpHash, Sender, TransactionHash, etc.

**Bundler & Paymaster Endpoint:**
The CDP Paymaster URL provides unified access to both Bundler and Paymaster services:

```
https://api.developer.coinbase.com/rpc/v1/base/YOUR_KEY
```

## Tracking Transactions Onchain

### Block Explorer Queries

To track sponsored USDC transactions onchain, query by Smart Account address:

**Basescan:**

```
https://basescan.org/address/0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7
```

**Filter for EntryPoint interactions:**

- **From:** `0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7` (Smart Account)
- **To:** `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789` (EntryPoint)
- **Method:** `handleOps` (batches UserOperations)

### Understanding the Transaction Flow

Each sponsored transaction creates multiple related hashes:

1. **UserOperation Hash** (`userOpHash`): Unique identifier for the UserOperation
2. **Transaction Hash** (`transactionHash`): Actual onchain transaction hash

The onchain transaction shows:

- **From:** Smart Account (`0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7`)
- **To:** EntryPoint contract (`0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`)
- **Internal Call:** EntryPoint → USDC contract (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)

### Getting the Transaction Hash

Each UserOperation results in an onchain transaction. There are two ways to get the transaction hash:

**1. From CDP API Response:**

```typescript
const result = await cdp.evm.sendUserOperation({
  smartAccount,
  network: "base-mainnet",
  calls: [...]
});

// Wait for confirmation
const userOp = await cdp.evm.waitForUserOperation({
  smartAccountAddress: smartAccount.address,
  userOpHash: result.userOpHash,
});

console.log("Transaction Hash:", userOp.transactionHash);
// View on Basescan: https://basescan.org/tx/${userOp.transactionHash}
```

**2. From CDP Dashboard:**

- Go to <https://portal.cdp.coinbase.com/> → Paymaster → Logs
- Find your UserOperation by timestamp or UserOpHash
- Copy the `TransactionHash` column
- View on Basescan: `https://basescan.org/tx/[TRANSACTION_HASH]`

### Handling Bundled Transactions (Multiple UserOps)

When the bundler batches **multiple UserOperations** in a single `handleOps` transaction, each UserOp gets its own set of events:

**On Basescan:**

1. Open the transaction → "Logs" tab
2. Look for `UserOperationEvent` (emitted by EntryPoint)
3. Filter by your `userOpHash` or Smart Account address (`0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7`)
4. Each UserOperation has its own `UserOperationEvent` with:
   - `userOpHash`: Your unique operation ID
   - `sender`: Your Smart Account address
   - `success`: Whether it succeeded

**Note:** Multiple UserOps in one transaction share the same `transactionHash` but have different `userOpHash` values. Use your `userOpHash` to identify your specific operation within the bundle.

### CDP Logs Export

The easiest way to track transactions is via CDP Dashboard → Paymaster → Logs:

**CSV Export includes:**

- `Sender`: Smart Account address
- `UserOpHash`: UserOperation identifier  
- `TransactionHash`: Onchain transaction hash
- `GasCost` & `GasUsed`: Sponsored gas details
- `Status`: completed/failed

This provides a complete audit trail without manual onchain parsing.

## Docs & Resources

- **CDP v2 Smart Accounts**: <https://docs.cdp.coinbase.com/server-wallets/v2/>
- **Paymaster & Bundler**: <https://docs.cdp.coinbase.com/paymaster/introduction/welcome>
- **ERC-4337 Account Abstraction**: <https://docs.cdp.coinbase.com/paymaster/need-to-knows/account-abstraction-basics>
- **Gas Credits**: <https://www.coinbase.com/developer-platform/gas-credits> (up to $10k/month free)
