# Legacy Gas Sponsoring (EOA Relayer)

Two EOA wallets sponsor gas for USDC transfers on Base. Requires authentication.

## Relayer Addresses

- **Payment:** `0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD`
- **Send:** `0xf1e26ea8b039F4f6440494D448bd817A55137F9c`

## API Endpoints

**Public (no auth):**
- `/api/relayer/check-simulation-mode` - Check system status

**Protected (requires fetchAuth):**
- `/api/auth/relayer/prepare-authorization` - Prepare USDC transfer
- `/api/auth/relayer/execute-transfer` - Execute USDC transfer
- `/api/auth/relayer/clear-delegation` - Clear EIP-7702 delegation

## Setup

```bash
# .env.local
ETH_RELAYER_PAYMENT_PRIVATE_KEY="0x..."
ETH_RELAYER_SEND_PRIVATE_KEY="0x..."
ALCHEMY_RPC_URL="https://base-mainnet.g.alchemy.com/v2/{API_KEY}"
USDC_CONTRACT_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
NEXT_PUBLIC_USDC_DECIMALS="6"
NEXT_PUBLIC_USE_COINBASE_SMART_WALLET=false
NEXT_PUBLIC_ENABLE_EIP7702=false
```

Fund both wallets with 0.01-0.05 ETH on Base: https://bridge.base.org

## Monitoring

- Payment: https://basescan.org/address/0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD
- Send: https://basescan.org/address/0xf1e26ea8b039F4f6440494D448bd817A55137F9c

Refill when < 0.005 ETH. Cost per tx: ~0.0001-0.0005 ETH.

## Alternatives

- [COINBASE_SETUP.md](./COINBASE_SETUP.md) - $10k/month free gas
- [EIP7702_SETUP.md](./EIP7702_SETUP.md) - Alchemy sponsorship
