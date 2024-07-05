import type { NextApiRequest, NextApiResponse } from 'next'
import coreDevs from "discounts/core-devs.json"
import daoParticipants from "discounts/dao-participants.json"
import ossContributors from "discounts/oss-contributors.json"
import pgProjects from "discounts/pg-projects.json"
import pastAttendees from "discounts/past-attendees.json"
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const client = createPublicClient({
    chain: mainnet,
    transport: http(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let id = req.query.id as string
    console.log(req.method, '/api/discounts/verify/[id]', id)

    if (!id) {
        return res.status(400).json({ message: 'Missing id' })
    }

    const type = id.startsWith('0x') || id.endsWith('.eth') ? 'ethereum' : 'github'
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
        discounts.push({ list: 'Public Good Projects', discount: 50 });
    }
    if (daoParticipants.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'DAO Participants', discount: 25 });
    }
    if (pastAttendees.some(i => i.toLowerCase() === id.toLowerCase())) {
        discounts.push({ list: 'Past Attendees', discount: 10 });
    }

    res.status(200).json({
        data: {
            id,
            type,
            discount: discounts.length > 0 ? discounts[0].discount : 0,
            discounts
        }
    })
}