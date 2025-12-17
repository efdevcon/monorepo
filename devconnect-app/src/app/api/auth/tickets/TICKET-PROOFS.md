# Ticket Proof System

Privacy-preserving ticket verification using cryptographic signatures.

## How It Works

```
Secret → keccak256 → Identifier
                          ↓
              sign(identifier + type)
                          ↓
                        Proof
```

1. **Identifier** = `keccak256(secret)` — unique, irreversible
2. **Proof** = `sign(identifier + ticketType)` — binds type to proof
3. **Verification** = `ecrecover(proof) === signerAddress`

## Ticket Types

| Type | Description |
|------|-------------|
| `attendee` | Main cowork ticket |
| `event` | Side event ticket |
| `swag` | Items with variations (t-shirts) |
| `addon` | Other add-ons |

## Verification URL

```
/verify?id={identifier}&type={ticketType}&proof={signature}&signer={address}
```

Optional: `&name={ticketName}&event={eventName}`

## API

```typescript
// Generate
const proof = await generateTicketProof(secret, 'attendee');
// → { identifier, ticketType, proof, signerAddress }

// Verify
const valid = verifyTicketProof(identifier, ticketType, proof, signerAddress);
// → boolean
```

## Security

- ✅ Original ticket code never exposed
- ✅ Ticket type cryptographically bound
- ✅ Each ticket uniquely identifiable
- ✅ Authority verifiable via public key

