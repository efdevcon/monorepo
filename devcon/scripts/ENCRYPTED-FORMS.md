# Encrypted form fields — setup and operations

Form fields whose title starts with `[encrypted]` are encrypted in the
submitter's browser to a fixed set of public keys before they reach the
network. The matching private keys live ONLY on the operator's machine (in a
secrets manager or comparable secure store) and on paper in a safe. Our
server, NocoDB, and backups never see plaintext.

## One-time setup

### 1. Generate the primary keypair (reviewer's laptop)

```sh
# install the age CLI: `brew install age` (or your package manager equivalent)
age-keygen -o ~/visa-team.age
```

`age-keygen -o` writes the key to a file and prints only the public key to
stderr. View the full contents with:

```sh
cat ~/visa-team.age
```

You'll see three lines:

```
# created: 2026-05-15T15:32:01-04:00
# public key: age1qq...      ← copy this into src/config/encrypted-forms.ts
AGE-SECRET-KEY-1KKK...       ← copy this into your secrets manager
```

Once both lines are safely stored, **securely delete the file** so the
private key doesn't linger on disk:

```sh
rm -P ~/visa-team.age   # macOS
shred -u ~/visa-team.age # Linux
```

### 2. Store the private key in a secrets manager

Store the `AGE-SECRET-KEY-1KKK...` value under a name like
`AGE_PRIVATE_KEY` in whatever secrets manager the team uses. The decrypt
script reads it from an environment variable, so the manager just needs to
be able to inject env vars at command-runtime (without writing them to
disk).

Access to this secret should be scoped to the reviewer only.

### 3. Generate the break-glass keypair

```sh
age-keygen -o /tmp/break-glass.age
```

- Note the `age1...` public line.
- **Print** the file (the few lines including the `AGE-SECRET-KEY-...`
  line) on paper.
- Place the printout in a sealed envelope inside a physical safe.
- **Shred** the digital copy:
  `shred -u /tmp/break-glass.age` (Linux) or `rm -P /tmp/break-glass.age` (macOS).

### 4. Pin the public keys in code

Edit `src/config/encrypted-forms.ts` and replace the two `'age1REPLACE_ME...'`
placeholders with the real public keys from steps 1 and 3. Open a PR, get it
reviewed, merge, deploy.

### 5. Verify the deployed keys out-of-band

After deploy, ask another team member to:

1. View the source of a page rendering the visa form and locate the
   `age1...` strings.
2. Compare those strings against the ones written down at setup time
   (record the fingerprints somewhere outside this repo — e.g. a shared note
   or a printed reference).
3. If they differ, the deploy was tampered with.

### 6. Rename the NocoDB column

In NocoDB, open the form view → edit the target attachment column's label →
prepend `[encrypted] ` so it becomes:

```
[encrypted] Passport Copy (front & back)
```

(Or rename the underlying column title — either works. The renderer strips
the prefix before displaying it to users.)

## Day-to-day: decrypting submissions

The reviewer runs one command to pull and decrypt every encrypted
attachment on the table in one go:

```sh
pnpm forms:decrypt <viewId>
```

Pass the **grid view ID** of the table you want to decrypt. You can find
it in the NocoDB URL after `?view=` (it starts with `vw...`) when the
grid view is selected. Use the grid view, not the form view.

The script needs three values in the environment:

| Variable | Purpose |
|---|---|
| `AGE_PRIVATE_KEY` | The reviewer's age secret key. |
| `NOCODB_BASE_URL` | e.g. `https://form.devcon.org`. |
| `NOCODB_API_TOKEN` | NocoDB API token with read access to the base. |

The script picks these up from (in priority order):

1. `process.env` — anything already in the shell or injected by a secrets
   manager.
2. `.env.decrypt` in the repo root.
3. `.env.local`, then `.env`.

`.env.decrypt` is git-ignored, so the recommended low-friction setup is a
file like:

```
AGE_PRIVATE_KEY=AGE-SECRET-KEY-1KKK...
NOCODB_BASE_URL=https://form.devcon.org
NOCODB_API_TOKEN=...
```

For higher-security workflows, leave the secret out of the file and have
your secrets manager inject `AGE_PRIVATE_KEY` at command-runtime instead —
it'll override whatever's on disk because `process.env` wins.

The script:

1. Walks every row of the table behind `<viewId>`.
2. Finds every Attachment column whose title begins with `[encrypted]`.
3. Decrypts each blob in memory with `AGE_PRIVATE_KEY`.
4. Writes the plaintext into a clean per-column folder, using the table's
   display field (e.g. `Full Name`) as the filename:

   ```
   decrypted/
     Passport Copy (front & back)/
       Jane Smith.pdf
       John Doe.jpg
       ...
   ```

If two rows share the same display value, the second file gets a `_2`
suffix; if a single row has more than one attachment in the same column,
each is suffixed with `(1)`, `(2)`, etc.

`decrypted/` is git-ignored, so plaintext files won't accidentally end up
in a commit. Still, when you're done, **delete the plaintext**
(`rm -rf decrypted/`). The encrypted blobs in NocoDB stay as the system of
record.

## Break-glass recovery

Triggered only if the primary key is lost (laptop stolen, secrets manager
inaccessible, reviewer no longer with the team):

1. Retrieve the sealed envelope from the safe.
2. On a clean machine, set `AGE_PRIVATE_KEY` to the paper key value.
3. Run `pnpm forms:decrypt <viewId>` as above.
4. Re-seal the paper, return it to the safe.

Use of the break-glass key should be logged (date, who, why, which
submissions were touched).

## Adding or rotating recipients

To add a new reviewer or rotate a key:

1. Generate a new keypair on their laptop.
2. **Append** their public key to `AGE_RECIPIENTS` in
   `src/config/encrypted-forms.ts` (don't remove the old ones — old
   submissions stay decryptable by whoever held the old private key).
3. Deploy.
4. Re-verify deployed keys out-of-band.

Removing an old recipient is also append-only in spirit: leave them in the
array if you want their key holder to still be able to decrypt old
submissions, or remove them and accept that anything *new* won't be
decryptable by them. Old `.age` blobs remain unchanged either way.

## Threat model — quick reference

**Protects against:**
- NocoDB compromise, backup leak, curious DB admin.
- Network MITM (TLS + age both authenticate).
- Theft of the server or storage backend.

**Does NOT protect against:**
- A compromised website serving tampered public keys to *future* submitters.
  Mitigated by source-pinned keys + out-of-band fingerprint verification.
- An attacker who controls the submitter's laptop (browser exploit, malware).
- Loss of *both* primary and break-glass keys.
- Metadata (who submitted, when, that an upload happened) — these are stored
  in plaintext in NocoDB.
