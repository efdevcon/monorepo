const cache = new Map()
const baseUrl = process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'
import moment from 'moment'
import { Session as SessionType } from '@/types/Session'
const eventName = 'devcon-7'

async function get(slug: string) {
    // Never cache version
    if (cache.has(slug) && !slug.endsWith('/version')) {
        return cache.get(slug)
    }

    const response = await fetch(`${baseUrl}${slug}`).then(resp => resp.json())

    let data = response

    // Extract nested items when using api.devcon.org
    if (response.data) data = response.data
    if (response.data?.items) data = response.data.items

    cache.set(slug, data)

    return data
}

export const fetchSessions = async (): Promise<SessionType[]> => {
    const sessions = await get(`/sessions?sort=slot_start&order=asc&event=${eventName}&size=1000`)

    return sessions;
}