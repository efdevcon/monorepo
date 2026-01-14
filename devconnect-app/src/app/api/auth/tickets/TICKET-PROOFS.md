# Ticket Proof System

Privacy-preserving ticket verification using cryptographic signatures.

## How It Works

```text
Secret → keccak256 → Identifier
                          ↓
    sign(identifier + type + partner + eventName)
                          ↓
                        Proof
```

1. **Identifier** = `keccak256(secret)` — unique, irreversible
2. **Partner** = `partnerName` (e.g. `ens`) — normalized, default: `ens`
3. **Event** = `eventName` (e.g. `Devconnect ARG`) — trimmed, default: `Devconnect ARG`
4. **Proof** = `sign(identifier + ticketType + partnerName + eventName)` — binds type + partner + event to proof
5. **Verification** = `ecrecover(proof) === signerAddress`

## Ticket Types

| Type | Description |
| --- | --- |
| `attendee` | Main cowork ticket |
| `event` | Side event ticket |
| `swag` | Items with variations (t-shirts) |
| `addon` | Other add-ons |

## Verification URL

```text
/verify?id={identifier}&type={ticketType}&partner={partnerName}&event={eventName}&proof={signature}&signer={address}
```

Optional: `&name={ticketName}`

## API

```typescript
// Generate
const proof = await generateTicketProof(secret, 'attendee', 'ens', 'Devconnect ARG');
// → { identifier, ticketType, partner, eventName, proof, signerAddress }

// Verify
const valid = verifyTicketProof(identifier, ticketType, proof, signerAddress, 'ens', 'Devconnect ARG');
// → boolean
```

Notes:

- `partnerName` is normalized (`trim().toLowerCase()`) and defaults to `ens` if empty/omitted.
- `eventName` is trimmed and defaults to `Devconnect ARG` if empty/omitted.

## Security

- ✅ Original ticket code never exposed
- ✅ Ticket type + partner + event cryptographically bound
- ✅ Each ticket uniquely identifiable
- ✅ Authority verifiable via public key
