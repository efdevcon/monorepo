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
CDP_NETWORK_ID="base-mainnet"
CDP_PAYMASTER_URL="https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID"
```

### 3. Setup Gas Sponsorship

You MUST configure Paymaster policy:

Go to https://portal.cdp.coinbase.com/products/bundler-and-paymaster

1. Select **Base Mainnet** in the network dropdown (top right)
2. Click **Enable Paymaster** toggle
3. Click **Configuration** tab
4. Copy your **Paymaster & Bundler endpoint URL** (add to `CDP_PAYMASTER_URL`)
5. Click **Add** to create contract allowlist:
   - **Contract Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC on Base)
   - **Contract Name** (optional): `USDC`
   - Click **Add Function** (CRITICAL - do not skip!)
   - **Function Signature**: `transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)`
   - **Function Selector**: `0xe3ee160e` (auto-calculated from signature)
   - Click **Save**

   ⚠️ **IMPORTANT**: If you skip adding the function, you'll get error: `called method not in allowlist: 0xe3ee160e`

   💡 **Alternative**: Leave functions empty to allow ALL functions on this contract (less secure but simpler)
6. Set **spending limits**:
   - **Per UserOperation**: `0.01` USD (per transaction)
   - **Per Address**: `10` USD (per sender daily)
   - **Global**: `100` USD (total daily)

**Why is this needed?**

- Without the allowlist, Paymaster rejects transactions with error: `target address not in allowed contracts`
- Smart account will fall back to paying gas itself (not sponsored by Coinbase)
- The allowlist prevents unauthorized contracts from draining your gas credits

### 4. Get Paymaster URL

After completing step 3:

1. Go to <https://portal.cdp.coinbase.com/products/bundler-and-paymaster>
2. Click **Configuration** tab
3. Select **Base Mainnet** network
4. Copy the **Paymaster & Bundler endpoint**:

   ```
   https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
   ```

5. Add to `.env.local` as `CDP_PAYMASTER_URL`

### 5. Create Smart Account

```bash
pnpm create-wallet
```

Copy the smart account address from output.

**Smart Accounts (2 for payment/send tracking):**
- Payment: `0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7` (PaymentModal)
- Send: `0x407AC50a73F1649D4939c2b12697b418873f6896` (Send page)

### 6. Fund Smart Account

**Important**: Even though Coinbase sponsors gas via credits, the smart account still needs a small ETH balance for EntryPoint collateral.

The EntryPoint contract (`0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`) manages the ERC-4337 account abstraction flow and requires a small ETH deposit for validation. This is **separate from gas fees** - think of it as a security deposit.

```bash
# Fund both accounts with 0.001+ ETH each
# Minimum: 0.001 ETH (~$3) - good for ~100 transactions
# Recommended: 0.01 ETH (~$30) - rarely need to refill

# Gas fees are sponsored by Coinbase credits (up to $10k/month free)
# This ETH is only for EntryPoint collateral, not gas payments
```

### 7. Test

- Make a transfer
- Monitor at <https://portal.cdp.coinbase.com/>
- Check console logs to confirm sponsorship mode

## How It Works

All USDC payment transactions are now fully sponsored by Coinbase via CDP infrastructure:

```
Frontend (Para Wallet)
  → Signs EIP-3009 message (transferWithAuthorization)
    → Backend receives signed message
      → CDP Smart Account (ERC-4337) relays transaction
        → CDP Bundler submits UserOperation to EntryPoint
          → CDP Paymaster sponsors gas fees (automatic!)
            → USDC transfer executes on Base
```

**Key Components:**

- **Smart Accounts**: Payment (`0xd127...76c7`) and Send (`0x407A...6896`) - ERC-4337 smart contract wallets managed by CDP
- **EntryPoint** (`0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`): Standard ERC-4337 contract that orchestrates UserOperations
- **CDP Bundler**: Coinbase service that collects and submits UserOperations to the blockchain
- **CDP Paymaster**: Coinbase service that automatically sponsors gas fees (up to $10k/month in credits)
- **USDC Contract** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`): Base mainnet USDC token

**Gas Sponsorship:**

Requires explicit Paymaster URL and contract allowlist configuration:

```typescript
// Send user operation with Paymaster sponsorship
await smartAccount.sendUserOperation({
  network: "base",
  calls: [...],
  paymasterUrl: process.env.CDP_PAYMASTER_URL  // Required for sponsorship
});
```

Without `paymasterUrl`, the smart account pays gas itself (not sponsored by Coinbase).

## Monitoring

**CDP Dashboard:** <https://portal.cdp.coinbase.com/>

- UserOperation history and status
- Gas usage & sponsorship tracking (tracks credits used from your $10k/month allocation)
- Success rates and error logs
- Paymaster policy configuration
- Export CSV logs with UserOpHash, Sender, TransactionHash, etc.

The CDP SDK automatically handles Bundler and Paymaster integration - no manual endpoint configuration required!

## Tracking Transactions Onchain

### Block Explorer Queries

To track sponsored USDC transactions onchain, query by Smart Account address:

**Basescan:**

```
Payment: https://basescan.org/address/0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7
Send:    https://basescan.org/address/0x407AC50a73F1649D4939c2b12697b418873f6896
```

**Filter for EntryPoint interactions:**

- **From:** Smart Account address
- **To:** `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789` (EntryPoint)
- **Method:** `handleOps` (batches UserOperations)

### Understanding the Transaction Flow

Each sponsored transaction creates multiple related hashes:

1. **UserOperation Hash** (`userOpHash`): Unique identifier for the UserOperation
2. **Transaction Hash** (`transactionHash`): Actual onchain transaction hash

The onchain transaction shows:

- **From:** Smart Account
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
3. Filter by your `userOpHash` or Smart Account address
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

## Quick Reference: Required Configuration

Copy these exact values into your CDP Paymaster configuration:

| Field | Value |
|-------|-------|
| **Network** | Base Mainnet |
| **Contract Address** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Contract Name** | USDC (optional) |
| **Function Signature** | `transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)` |
| **Function Selector** | `0xe3ee160e` (auto-calculated) |

**Environment Variables:**

```bash
CDP_PAYMASTER_URL="https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID"
```

---

## Troubleshooting

### Smart Account is Paying Gas Instead of Coinbase

**Symptoms:**

- Smart account ETH balance decreases after transactions
- Console logs show: `⚠️ [CDP] No Paymaster configured for mainnet!`
- Transactions succeed but gas is not sponsored

**Diagnosis:**

**Check Configuration:**

1. **Verify Paymaster URL is set:**

   ```bash
   # Check .env.local
   CDP_PAYMASTER_URL="https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID"
   ```

2. **Verify allowlist configuration:**
   - Go to <https://portal.cdp.coinbase.com/products/bundler-and-paymaster>
   - Click **Configuration** tab
   - Select **Base Mainnet** network
   - Confirm USDC contract is in allowlist:
     - Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
     - Status: ✅ Enabled

3. **Check spending limits:**
   - Per UserOperation limit not exceeded
   - Per Address limit not exceeded
   - Global limit not exceeded

4. **Verify Paymaster is enabled:**
   - Toggle should be ON (blue)
   - If disabled, transactions won't be sponsored

5. **Restart your app:**
   - Changes to `.env.local` require app restart

### Common Errors

#### `called method not in allowlist: 0xe3ee160e` 🔴 MOST COMMON

**Cause:** The `transferWithAuthorization` function is NOT in your Paymaster allowlist

**Error in CDP Logs:**

```
Error code: -32002
Error message: request denied - called method not in allowlist: 0xe3ee160e
Method: pm_getPaymasterStubData
```

**Solution - Add Function to Allowlist:**

1. Go to <https://portal.cdp.coinbase.com/products/bundler-and-paymaster>
2. Select **Base Mainnet** network
3. Click **Configuration** tab
4. Find your USDC contract entry (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
5. Click **Edit** or **Add Function**
6. Enter function signature (exact match required):

   ```
   transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)
   ```

7. Verify function selector shows: `0xe3ee160e`
8. Click **Save**
9. Try your transaction again

**Quick Fix (Less Secure):**

- Remove all functions from the contract entry to allow ALL functions
- This is simpler but less secure (allows any function on USDC contract)

#### `target address not in allowed contracts`

**Cause:** USDC contract not in Paymaster allowlist

**Solution:**

1. Go to <https://portal.cdp.coinbase.com/products/bundler-and-paymaster>
2. Select **Base Mainnet** network
3. Click **Add** and add: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
4. Add the function (see error above)
5. Click **Save**

#### `rejected due to max per user op spend limit exceeded`

**Cause:** Transaction gas cost exceeds per-operation limit

**Solution:**

1. Go to Paymaster Configuration
2. Increase **Per UserOperation** limit (e.g., from 0.01 to 0.05 USD)

#### `rejected due to maximum per address sponsorship reached`

**Cause:** User exceeded daily/total sponsorship limit

**Solution:**

1. Increase **Per Address** limit in Paymaster policy
2. Or wait for limit reset (typically daily)

#### `AA21 didn't pay prefund`

**Cause:** Smart account has insufficient ETH for EntryPoint collateral

**Solution:**

```bash
# Send 0.001-0.01 ETH to your smart account
# This is for EntryPoint collateral, not gas fees (which are sponsored)
```

### Verify Sponsorship is Working

**Check Console Logs:**

✅ **Sponsored:**

```
🚀 [CDP] Sending UserOperation with Paymaster sponsorship...
💰 Gas sponsorship: CDP Paymaster (up to $10k/month in credits)
Paymaster URL: https://api.developer.coinbase.com/rpc/v1/base/...
Function: transferWithAuthorization (0xe3ee160e)
Target Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

❌ **NOT Sponsored:**

```
⚠️ [CDP] No Paymaster configured for mainnet!
💸 Gas payment: Smart account will pay (NOT sponsored)
```

**Check CDP Dashboard:**

1. Go to <https://portal.cdp.coinbase.com/>
2. Navigate to **Paymaster** → **Logs**
3. Look for your recent UserOperations
4. Verify `GasCost` column shows sponsored amount

**Check Smart Account Balance:**

```bash
# If balance decreases, gas is NOT being sponsored
# If balance stays same (except initial ETH collateral), gas IS sponsored
```

## Docs & Resources

- **CDP v2 Smart Accounts**: <https://docs.cdp.coinbase.com/server-wallets/v2/>
- **Paymaster & Bundler**: <https://docs.cdp.coinbase.com/paymaster/introduction/welcome>
- **Paymaster Troubleshooting**: <https://docs.cdp.coinbase.com/paymaster/reference-troubleshooting/troubleshooting>
- **Paymaster Error Codes**: <https://docs.cdp.coinbase.com/paymaster/reference-troubleshooting/errors>
- **ERC-4337 Account Abstraction**: <https://docs.cdp.coinbase.com/paymaster/need-to-knows/account-abstraction-basics>
- **Gas Credits**: <https://www.coinbase.com/developer-platform/gas-credits> (up to $10k/month free)
