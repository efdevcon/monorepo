/**
 * Envelope format for age-encrypted form attachments.
 *
 *   [4 bytes BE uint32: metadata length N]
 *   [N bytes UTF-8 JSON metadata: { filename, mimetype, size, encryptedAt }]
 *   [remaining bytes: original file contents]
 *
 * This whole envelope is then passed to age (`Encrypter.encrypt`). The age
 * format authenticates the ciphertext (ChaCha20-Poly1305 + MAC), so no extra
 * fingerprint is needed for tamper detection.
 *
 * The metadata is sealed *inside* the ciphertext, so even the original
 * filename never leaks to the server, NocoDB, or storage operators.
 */

export interface EnvelopeMeta {
  filename: string
  mimetype: string
  size: number
  encryptedAt: string
  version: 1
}

export function packEnvelope(meta: Omit<EnvelopeMeta, 'version'>, file: Uint8Array): Uint8Array {
  const fullMeta: EnvelopeMeta = { ...meta, version: 1 }
  const metaBytes = new TextEncoder().encode(JSON.stringify(fullMeta))
  if (metaBytes.length > 0xffffffff) throw new Error('Metadata too large')
  const out = new Uint8Array(4 + metaBytes.length + file.length)
  new DataView(out.buffer).setUint32(0, metaBytes.length, false)
  out.set(metaBytes, 4)
  out.set(file, 4 + metaBytes.length)
  return out
}

export function unpackEnvelope(envelope: Uint8Array): { meta: EnvelopeMeta; file: Uint8Array } {
  if (envelope.length < 4) throw new Error('Envelope truncated')
  const metaLen = new DataView(envelope.buffer, envelope.byteOffset, 4).getUint32(0, false)
  if (4 + metaLen > envelope.length) throw new Error('Envelope metadata length out of range')
  const metaJson = new TextDecoder().decode(envelope.subarray(4, 4 + metaLen))
  const meta = JSON.parse(metaJson) as EnvelopeMeta
  if (meta.version !== 1) throw new Error(`Unsupported envelope version: ${meta.version}`)
  const file = envelope.subarray(4 + metaLen)
  return { meta, file }
}
