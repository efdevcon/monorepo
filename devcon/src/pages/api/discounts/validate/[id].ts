import type { NextApiRequest, NextApiResponse } from 'next'
import coreDevs from "discounts/core-devs.json"
import ossContributors from "discounts/oss-contributors.json"
import pgProjects from "discounts/pg-projects.json"
import pastAttendees from "discounts/past-attendees.json"
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
    chain: mainnet,
    transport: http(`https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`),
})

export function GetDiscount(id: string) {
    const discounts = []
    const type = id.startsWith('0x') || id.endsWith('.eth') ? 'ethereum' : 'github'

    if (coreDevs.findIndex(i => i.toLowerCase() === id.toLowerCase()) >= 0) {
        discounts.push({ type: 'core-devs', name: 'Core Devs', discount: 100, index: coreDevs.findIndex(i => i.toLowerCase() === id.toLowerCase())})
    }
    if (ossContributors.findIndex(i => i.toLowerCase() === id.toLowerCase()) >= 0) {
        discounts.push({ type: 'oss-contributors', name: 'OSS Contributors', discount: 50, index: ossContributors.findIndex(i => i.toLowerCase() === id.toLowerCase())})
    }
    if (pgProjects.findIndex(i => i.toLowerCase() === id.toLowerCase()) >= 0) {
        discounts.push({ type: 'pg-projects', name: 'Public Goods Projects', discount: 30, index: pgProjects.findIndex(i => i.toLowerCase() === id.toLowerCase())})
    }
    if (pastAttendees.findIndex(i => i.toLowerCase() === id.toLowerCase()) >= 0) {
        discounts.push({ type: 'past-attendees', name: 'Past Attendees', discount: 10, index: pastAttendees.findIndex(i => i.toLowerCase() === id.toLowerCase())})
    }

    return {
        id,
        type,
        discount: discounts.length > 0 ? discounts[0].discount : 0,
        discounts
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let id = req.query.id as string
    console.log(req.method, '/api/discounts/verify/[id]', id)

    if (!id) {
        return res.status(400).json({ message: 'Missing id' })
    }

    if (id.endsWith('.eth')) {
        const address = await client.getEnsAddress({
            name: normalize(id),
        })
        if (address) {
            id = address
        }
    }

    const discounts = []
    if (coreDevs.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'Core Devs', discount: 100 });
    }
    if (ossContributors.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'OSS Contributors', discount: 50 });
    }
    if (pgProjects.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'Public Good Projects', discount: 30 });
    }
    if (pastAttendees.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'Past Attendees', discount: 10 });
    }

    // M14: strip the `index` field from each entry before returning. The
    // frontend uses `discount` (the percentage badge) and `type` / `name`
    // (which list the user is on); it has no use for the position in the
    // encrypted voucher file. Pre-fix code returned `index`, which combined
    // with M12 turned this unauth endpoint into an "iterate any address
    // universe → look up which voucher index" enumeration short-circuit.
    // Internal callers (claim/[id].ts) still call `GetDiscount(id)` directly
    // and have access to the full record including `index`.
    const internal = GetDiscount(id)
    res.status(200).json({
        data: {
            id: internal.id,
            type: internal.type,
            discount: internal.discount,
            discounts: internal.discounts.map(({ index: _omitIndex, ...rest }) => rest),
        },
    })
}
