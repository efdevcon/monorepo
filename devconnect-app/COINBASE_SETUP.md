# Coinbase CDP v2 Smart Account Setup

Gasless USDC transfers using CDP Smart Account + Paymaster.

**Benefits:**
- 🔐 CDP secures keys in AWS Nitro Enclave
- 🔄 Accounts persist automatically by name
- 💰 Paymaster sponsors gas for USDC transfers
- 🚀 No private key management needed

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

Copy the smart account address from output (e.g., `0xd127a1bFEdd21E04784c60070b7c8A2F2Ff176c7`).

### 5. Fund Smart Account

Smart account needs ETH for EntryPoint collateral (even with Paymaster).

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

```
Frontend (EOA) 
  → Signs EIP-3009 message 
    → Backend relays via CDP Smart Account 
      → Paymaster sponsors gas 
        → USDC transfer executes
```

## Monitoring

Dashboard: https://portal.cdp.coinbase.com/
- UserOp history
- Gas usage & sponsorship
- Success rates

## Docs

- CDP v2: https://docs.cdp.coinbase.com/server-wallets/v2/
- Gas Credits: https://www.coinbase.com/developer-platform/gas-credits (up to $10k/month)
