import { PrismaClient as ScheduleClient } from "@prisma/client"
import { PrismaClient as AccountClient } from "db/clients/account"
import { SERVER_CONFIG } from "utils/config"

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
    // const farcaster = await GetFarcasterFollowers(id)
    const profileId = await GetLensProfileId(id)
    const lens = await GetLensFollowing(profileId)

    const speakers = await scheduleClient.speaker.findMany({
        where: {
            AND: [
                {
                    sessions: {
                        some: {
                            eventId: 'devcon-7'
                        }
                    }
                },
                {
                    OR: [
                        { lens: { in: lens.filter(l => l.handle).map(l => l.handle) } },
                        { ens: { in: lens.filter(l => l.ens).map(l => l.ens) } },
                        includeFeatured ? { sessions: { some: { featured: true } } } : {}
                    ]
                }
            ]
        }
    })

    return speakers
}

export async function GetRecommendedSessions(id: string, includeFeatured?: boolean) {
    console.log('Get Recommended Sessions', id)

    const account = await accountClient.account.findFirst({
        where: {
            id: id
        }
    })

    if (!account) {
        return []
    }
    
    const sessions = await scheduleClient.session.findMany({
        where: {
            AND: [
                { eventId: 'devcon-7' },
                {
                    OR: [
                        { featured: true },
                        { speakers: { some: { id: { in: account.favorite_speakers } } } },
                    ]
                }
            ]
        }
    })

    // Find related sessions based on account.tracks, account.tags, etc. from RelatedSessions 

    return sessions
}

export async function GetFarcasterFollowers(id: string) {
    console.log('Get Farcaster Followers', id)

    const query = `
    query Query($identity: String!) {
      SocialFollowers(
        input: {filter: {identity: {_eq: ${id}}}, blockchain: ALL}
      ) {
        Follower {
          followerSince
          followerAddress {
            blockchain
            addresses
            socials {
              profileName
              userAddress
              twitterUserName
            }
          }
          followerProfileId
          id
          followerTokenId
          followingProfileId
        }
      }
    }
  `

  try {
    const response = await fetch('https://api.airstack.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': SERVER_CONFIG.AIRSTACK_API_KEY ?? ''
      },
      body: JSON.stringify(query)
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()
    return data.data.SocialFollowers.Follower
  } catch (error) {
    console.error('Error fetching social followers:', error)
    throw error
  }
}

export async function GetLensFollowers(profileId: string, cursor?: string): Promise<LensFollower[]> {
    console.log('Get Lens Followers', profileId, cursor)

    const query = `
        query Query {
            followers(request: { of: "${profileId}", limit: Fifty ${cursor ? `, cursor: "${cursor}"` : '' }}) {
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
            body: JSON.stringify({ query: query })
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        const items = data.data.followers.items.map((item: any) => {
            return {
                id: item.id,
                fullHandle: item.handle?.fullHandle ?? '',
                handle: item.handle?.localName ?? '',
                address: item.handle?.ownedBy ?? item.ownedBy?.address
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
            following(request: { for: "${profileId}", limit: Fifty ${cursor ? `, cursor: "${cursor}"` : '' }}) {
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
            body: JSON.stringify({ query: query })
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        const items = data.data.following.items.map((item: any) => {
            return {
                id: item.id,
                fullHandle: item.handle?.fullHandle,
                handle: item.handle?.localName,
                address: item.handle?.ownedBy ?? item.ownedBy?.address,
                ens: item.onchainIdentity?.ens?.name
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
            body: JSON.stringify({ query: query })
        })

        const data = await response.json()
        return data.data.defaultProfile.id
    } catch (error) {
        console.error('Error fetching social followers:', error)
    }
}