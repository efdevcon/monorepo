import { PrismaClient as ScheduleClient } from '@prisma/client'
import { PrismaClient as AccountClient } from '@/db/clients/account'
import { SERVER_CONFIG } from '@/utils/config'

interface LensFollower {
  id: string
  fullHandle: string
  handle: string
  address: string
  ens: string
}

const scheduleClient = new ScheduleClient()
const accountClient = new AccountClient()

export async function GetRecommendedSpeakers(id: string, includeFeatured?: boolean) {
  console.log('Get Recommended Speakers', id)
  const farcasterProfile = await GetFarcasterProfile(id)
  const farcaster = farcasterProfile ? await GetFarcasterFollowing(farcasterProfile.fid) : []
  const lensProfileId = await GetLensProfileId(id)
  const lens = lensProfileId ? await GetLensFollowing(lensProfileId) : []

  const speakers = await scheduleClient.speaker.findMany({
    where: {
      AND: [
        {
          sessions: {
            some: {
              eventId: 'devcon-7',
            },
          },
        },
        {
          OR: [
            { lens: { in: lens.filter((i) => i.handle).map((i) => i.handle) } },
            { ens: { in: lens.filter((i) => i.ens).map((i) => i.ens) } },
            { farcaster: { in: farcaster.filter((i) => i.username).map((i) => i.username) } },
            includeFeatured ? { sessions: { some: { featured: true } } } : {},
          ],
        },
      ],
    },
  })

  return speakers
}

export async function GetRecommendedSessions(id: string, includeFeatured?: boolean) {
  console.log('Get Recommended Sessions', id)

  const account = await accountClient.account.findFirst({
    where: {
      id: id,
    },
  })

  if (!account) {
    return []
  }

  const sessions = await scheduleClient.session.findMany({
    where: {
      AND: [
        // { eventId: 'devcon-7' },
        {
          OR: [{ featured: true }, { speakers: { some: { id: { in: account.favorite_speakers } } } }],
        },
      ],
    },
  })

  // Find related sessions based on account.tracks, account.tags, etc. from RelatedSessions

  return sessions
}

export async function GetFarcasterFollowing(profileId: string, cursor?: string): Promise<any[]> {
  console.log('Get Farcaster Following', profileId, cursor)

  const uri = `https://api.neynar.com/v2/farcaster/following?fid=${profileId}&limit=10${cursor ? `&cursor=${cursor}` : ''}`
  const response = await fetch(uri, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      api_key: SERVER_CONFIG.NEYNAR_API_KEY ?? '',
    },
  })

  try {
    const data = await response.json()
    const items = data?.users?.map((i: any) => i.user)

    if (data?.next?.cursor) {
      return [...items, ...(await GetFarcasterFollowing(profileId, data.next.cursor))]
    } else {
      return items
    }
  } catch (error) {
    console.error('Error fetching Farcaster following:', error)
    return []
  }
}

export async function GetFarcasterProfile(address: string) {
  const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      api_key: SERVER_CONFIG.NEYNAR_API_KEY ?? '',
    },
  })

  const data = await response.json()
  if (data && data[address]?.length > 0) {
    return data[address][0] // TODO: Support for multiple profiles
  }

  return null
}

export async function GetLensFollowers(profileId: string, cursor?: string): Promise<LensFollower[]> {
  console.log('Get Lens Followers', profileId, cursor)

  const query = `
        query Query {
            followers(request: { of: "${profileId}", limit: Fifty ${cursor ? `, cursor: "${cursor}"` : ''}}) {
                pageInfo {
                    prev
                    next
                }
                items {
                    id
                    handle {
                        fullHandle
                        localName
                        ownedBy
                    }
                    ownedBy {
                        address
                    }
                }
            }
        }`

  try {
    const response = await fetch('https://api-v2.lens.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()
    const items = data.data.followers.items.map((item: any) => {
      return {
        id: item.id,
        fullHandle: item.handle?.fullHandle ?? '',
        handle: item.handle?.localName ?? '',
        address: item.handle?.ownedBy ?? item.ownedBy?.address,
      }
    })

    if (data.data.followers.pageInfo.next) {
      return [...items, ...(await GetLensFollowers(profileId, data.data.followers.pageInfo.next))]
    } else {
      return items
    }
  } catch (error) {
    console.error('Error fetching Lens followers:', error)
    return []
  }
}

export async function GetLensFollowing(profileId: string, cursor?: string): Promise<LensFollower[]> {
  console.log('Get Lens Following', profileId, cursor)

  const query = `
        query Query {
            following(request: { for: "${profileId}", limit: Fifty ${cursor ? `, cursor: "${cursor}"` : ''}}) {
                pageInfo {
                    prev
                    next
                }
                items {
                    id
                    handle {
                        fullHandle
                        localName
                        ownedBy
                    }
                    ownedBy {
                        address
                    }
                    onchainIdentity {
                        ens {
                            name
                        }
                    }
                }
            }
        }`

  try {
    const response = await fetch('https://api-v2.lens.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()
    const items = data.data.following.items.map((item: any) => {
      return {
        id: item.id,
        fullHandle: item.handle?.fullHandle,
        handle: item.handle?.localName,
        address: item.handle?.ownedBy ?? item.ownedBy?.address,
        ens: item.onchainIdentity?.ens?.name,
      }
    })

    if (data.data.following.pageInfo.next) {
      return [...items, ...(await GetLensFollowing(profileId, data.data.following.pageInfo.next))]
    } else {
      return items
    }
  } catch (error) {
    console.error('Error fetching Lens following:', error)
    return []
  }
}

export async function GetLensProfileId(id: string) {
  console.log('Get Lens Profile Id', id)

  const query = `
        query Query {
            defaultProfile(request: { for: "${id}"}) {
                id
            }
        }`

  try {
    const response = await fetch('https://api-v2.lens.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    })

    const data = await response.json()
    return data.data.defaultProfile.id
  } catch (error) {
    console.error('Error fetching social followers:', error)
  }
}
