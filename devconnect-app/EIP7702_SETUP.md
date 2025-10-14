# EIP-7702 with Para + Alchemy Setup

Gasless USDC transactions for Para wallets using EIP-7702 temporary account upgrades and Alchemy Account Kit.

## Overview

- **What**: EOA wallets (Para) get temporary smart account functionality for gas sponsorship
- **How**: EIP-7702 authorization + Alchemy Gas Manager
- **Benefit**: Zero gas fees for USDC transfers on Base

## Architecture

```
Para Wallet (EOA)
    ↓
Custom Signature Utilities (para-signature-utils.ts)
    ↓
EIP-7702 Authorization Signing
    ↓
Alchemy Modular Account V2 (mode: "7702")
    ↓
Alchemy Gas Manager (sponsored transaction)
    ↓
Base Network (confirmed transaction)
```

## Key Files

### 1. Signature Utilities
**`src/lib/para-signature-utils.ts`**
- Custom signing methods that bypass Ethereum Signed Message prefix
- Uses viem's `hashAuthorization`, `hashMessage`, `hashTypedData`
- Properly formats v-values (0/1 for EIP-7702, 27/28 for standard)

### 2. Configuration
**`src/config/eip7702.ts`**
```typescript
export const EIP7702_CONFIG = {
  ENABLED: process.env.NEXT_PUBLIC_ENABLE_EIP7702 === 'true',
  ALCHEMY_RPC_URL: process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL,
  ALCHEMY_GAS_POLICY_ID: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
  USDC_CONTRACT: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDC_DECIMALS: 6,
  CHAIN_ID: 8453, // Base
};
```

### 3. Transaction Hook
**`src/hooks/useParaEIP7702Transaction.ts`**
- Creates extended viem account with custom signing methods
- Overrides: `signAuthorization`, `signMessage`, `signTypedData`
- Uses Alchemy's `createModularAccountV2Client` with `mode: "7702"`

### 4. Router
**`src/hooks/useTransactionRouter.ts`**
- Switches between legacy (backend relayer) and EIP-7702 (Alchemy) systems
- Based on `NEXT_PUBLIC_ENABLE_EIP7702` feature flag

## Environment Variables

```bash
# Enable EIP-7702
NEXT_PUBLIC_ENABLE_EIP7702=true

# Alchemy Configuration
NEXT_PUBLIC_ALCHEMY_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID=your-gas-policy-id
```

## Alchemy Setup

1. **Create Account**: https://dashboard.alchemy.com
2. **Create App**: Base Mainnet
3. **Configure Gas Manager**:
   - Go to Gas Manager
   - Create Policy
   - Set spending limits
   - Configure allowlist (optional)
4. **Copy Credentials**:
   - RPC URL from app dashboard
   - Policy ID from Gas Manager

## How It Works

### Legacy System (Before)
```typescript
User signs EIP-712 → Backend relayer → Pays gas → USDC transfer
```

### EIP-7702 System (Now)
```typescript
User signs EIP-7702 auth → Temporary account upgrade → 
Alchemy sponsors gas → USDC transfer → Account reverts to EOA
```

## Technical Details

### Why Custom Signature Utilities?

Para's standard signing methods add Ethereum Signed Message prefix:
```typescript
keccak256("\x19Ethereum Signed Message:\n32" + message)
```

EIP-7702 requires raw signatures:
```typescript
keccak256(message) // No prefix!
```

Our custom utilities:
1. Hash the data with viem's proper hash functions
2. Sign the hash directly with Para's `signMessage`
3. Adjust v-values correctly for each context

### Signature v-value Handling

- **Standard Ethereum**: v = 27 or 28
- **EIP-7702**: yParity = 0 or 1

Our utilities automatically convert based on context.

## Testing

1. Set environment variables
2. Enable feature flag: `NEXT_PUBLIC_ENABLE_EIP7702=true`
3. Trigger USDC payment with Para wallet
4. Check console logs for EIP-7702 flow
5. Verify gas sponsorship in Alchemy dashboard

## Fallback Behavior

If EIP-7702 is disabled or misconfigured, automatically falls back to legacy backend relayer system.

## Dependencies

```json
{
  "@account-kit/smart-contracts": "^4.70.0",
  "@account-kit/infra": "^4.70.0",
  "@aa-sdk/core": "^4.70.0",
  "@getpara/react-sdk": "^2.0.0-alpha.63"
}
```

## Console Logs (Success)

```
🔄 [EIP-7702] Starting EIP-7702 transaction with Alchemy Account Kit
🔄 [EIP-7702] Signing EIP-7702 authorization with Para custom utilities...
✅ [EIP-7702] Authorization signed successfully!
🔄 [EIP-7702] Signing message with Para custom utilities...
✅ [EIP-7702] Message signed successfully
✅ [EIP-7702] UserOperation submitted
✅ [EIP-7702] Transaction confirmed
```

## Troubleshooting

### "User operation cost exceeds specified spend limit"
**Solution**: Increase spending limit in Alchemy Gas Manager policy

### "Invalid account signature"
**Solution**: Verify all signing methods are using custom utilities

### "Invalid 7702 Auth signature"
**Solution**: Check RLP encoding and v-value formatting

## References

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Alchemy Account Kit](https://accountkit.alchemy.com/)
- [Para EIP-7702 Guide](https://docs.para.gg/v2/react/guides/account-abstraction/eip7702-alchemy)

