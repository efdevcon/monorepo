# Meerkat Handover Authentication

## Overview

The Devcon event app authenticates users and verifies ticket ownership. When a user wants to ask a question in a session, the app generates a signed JWT (handover token) containing the user's identity and redirects them to Meerkat with the token attached. Meerkat verifies the token independently using a shared signing secret — no callback to our API is needed.

## Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User/Browser   │     │  Devcon Event App │     │     Meerkat      │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │  1. Click "Ask Question"                        │
         │───────────────────────>│                        │
         │                        │                        │
         │                  2. Verify user is              │
         │                     logged in +                 │
         │                     owns a ticket               │
         │                        │                        │
         │                  3. Generate JWT                │
         │                     {email, iat, exp}           │
         │                     signed with                 │
         │                     shared secret               │
         │                        │                        │
         │  4. Redirect to Meerkat                         │
         │    ?token=<jwt>        │                        │
         │─────────────────────────────────────────────────>
         │                        │                        │
         │                        │  5. Meerkat takes over │
         │                        │     (all subsequent    │
         │                        │     interaction on     │
         │                        │     meerkat.com)       │
         │                        │                        │
         │                        │  6. Verify JWT         │
         │                        │     signature with     │
         │                        │     shared secret      │
         │                        │                        │
         │                        │  7. Check exp claim    │
         │                        │     (5 min window)     │
         │                        │                        │
         │                        │  8. Extract email      │
         │                        │     from payload       │
         │                        │                        │
         │                        │  9. Establish own      │
         │                        │     session/auth for   │
         │                        │     the user (JWT is   │
         │                        │     consumed, not      │
         │                        │     reused)            │
         │                        │                        │
         │  10. User submits questions on meerkat.com      │
         │<─────────────────────────────────────────────────
         │                        │                        │
```

## JWT Specification

### Structure

Standard JWT format: `header.payload.signature`

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "email": "user@example.com",
  "iat": 1710249600000,
  "exp": 1710249900000
}
```

| Field   | Type   | Description                                      |
|---------|--------|--------------------------------------------------|
| `email` | string | Email of the authenticated ticket holder         |
| `iat`   | number | Issued-at timestamp (milliseconds since epoch)   |
| `exp`   | number | Expiry timestamp (milliseconds since epoch)      |

**Note:** `iat` and `exp` are in **milliseconds** (not seconds as in the JWT spec). Expiry window is 5 minutes from issuance.

### Signature

HMAC-SHA256 over `base64url(header).base64url(payload)` using the shared secret.

### Encoding

All parts are **base64url** encoded (RFC 4648 Section 5 — no padding, URL-safe alphabet).

## Verification (Meerkat side)

1. **Split** the token on `.` — expect exactly 3 parts: `[header, payload, signature]`
2. **Recompute** the HMAC-SHA256 signature: `HMAC-SHA256(shared_secret, header + "." + payload)`
3. **Compare** the recomputed signature against the received signature (use constant-time comparison to prevent timing attacks)
4. **Decode** the payload from base64url
5. **Check expiry**: reject if `Date.now() > exp`
6. **Extract** `email` from the payload

### Pseudocode

```python
import hmac, hashlib, base64, json, time

def verify_handover_token(token: str, secret: str):
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")

    header_b64, payload_b64, signature_b64 = parts

    # Recompute signature
    expected = hmac.new(
        secret.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256
    ).digest()

    expected_b64 = base64url_encode(expected)

    # Constant-time comparison
    if not hmac.compare_digest(signature_b64, expected_b64):
        raise ValueError("Invalid signature")

    # Decode payload
    payload = json.loads(base64url_decode(payload_b64))

    # Check expiry (milliseconds)
    if time.time() * 1000 > payload["exp"]:
        raise ValueError("Token expired")

    return payload["email"]
```

## Token Delivery

The token is passed as a URL query parameter when redirecting the user to Meerkat:

```
https://app.meerkat.events/session/{sessionId}?token={jwt}
```

Meerkat should read the `token` query parameter on page load, verify it, and use the email to establish its own session for the user. The session context comes from the URL path, not the JWT.

## Shared Secret

The signing secret must be shared securely between the Devcon event app and Meerkat (e.g. via a secure channel, not committed to source control).

- **Devcon side**: stored as `VERIFICATION_SECRET` environment variable
- **Meerkat side**: store however suits your infrastructure

## Security Considerations

- Tokens are **single-use by intent** — short 5-minute expiry window means they cannot be meaningfully reused
- Use **constant-time comparison** for signature verification to prevent timing attacks
- The shared secret should be a cryptographically random string (minimum 32 bytes recommended)
- Tokens are passed in query params — they may appear in server logs and browser history, but the short expiry mitigates this
