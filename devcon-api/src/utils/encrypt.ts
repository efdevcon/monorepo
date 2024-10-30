import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import * as jose from 'jose'

dotenv.config()

export async function encryptFile(filepath: string) {
  const inputFileContent = readFileSync(filepath, { encoding: 'utf-8' })
  const encryptedFileContent = await encryptInput(inputFileContent)

  writeFileSync(filepath + '.encrypted', encryptedFileContent, { encoding: 'utf-8' })
}

export async function encryptInput(input: string) {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set')
  }

  const key = new TextEncoder().encode(encryptionKey).slice(0, 32)
  return await new jose.CompactEncrypt(new TextEncoder().encode(input))
    .setProtectedHeader({
      alg: 'dir',
      enc: 'A256GCM',
    })
    .encrypt(key)
}

export async function decryptFile(filepath: string) {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set')
  }

  const encryptedFileContent = readFileSync(filepath, { encoding: 'utf-8' })
  return await decryptInput(encryptedFileContent)
}

export async function decryptInput(encryptedInput: string) {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set')
  }

  const key = new TextEncoder().encode(encryptionKey).slice(0, 32)
  const { plaintext } = await jose.compactDecrypt(encryptedInput, key)
  return new TextDecoder().decode(plaintext)
}
