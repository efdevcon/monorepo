import { readFile, writeFile } from 'node:fs/promises'
import * as jose from 'jose'

require('dotenv').config()

const SECRET_KEY = process.env.NEXTAUTH_SECRET
if (!SECRET_KEY) throw new Error('NEXTAUTH_SECRET is not set')

export async function getVoucherCodes(groupType: 'core-devs' | 'dao-participants' | 'oss-contributors' | 'pg-projects' | 'past-attendees', index: number) {
    const key = new TextEncoder().encode(SECRET_KEY).slice(0, 32)
    const encryptedVoucherCodes = await readFile(process.cwd() + `/src/discounts/vouchers/${groupType}.txt.encrypted`, {
      encoding: 'utf-8',
    })

    const { plaintext } = await jose.compactDecrypt(encryptedVoucherCodes, key)
    const voucherCodes = new TextDecoder().decode(plaintext).split('\n').filter(line => line.trim() !== '')
    return voucherCodes[index]
}

export async function encryptFiles() {
    const key = new TextEncoder().encode(SECRET_KEY).slice(0, 32)
    const files = [
        'core-devs.txt',
        'dao-participants.txt',
        'oss-contributors.txt',
        'pg-projects.txt',
        'past-attendees.txt',
    ]

    for (const file of files) {
        console.log(`Encrypting file ${file}...`)
        const fileContent = await readFile(process.cwd() + `/vouchers/${file}`, { encoding: 'utf-8' })

        const encryptedVoucherCodes = await new jose.CompactEncrypt(new TextEncoder().encode(fileContent))
            .setProtectedHeader({
                alg: 'dir',
                enc: 'A256GCM',
            })
            .encrypt(key)

        const encryptedFilePath = process.cwd() + `/src/discounts/vouchers/${file}.encrypted`

        await writeFile(encryptedFilePath, encryptedVoucherCodes, { encoding: 'utf-8' });
    }
}
