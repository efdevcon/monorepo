import { PrismaClient as ScheduleClient } from '@prisma/client'
import { Account, PrismaClient as AccountClient } from '@/db/clients/account'
import { SERVER_CONFIG } from '@/utils/config'
import { Session } from '@/types/schedule'
import { STOPWORDS } from '@/utils/stopwords'
import { writeFileSync } from 'fs'
import dictionary from '../../data/vectors/dictionary.json'
import vectorizedSessions from '../../data/vectors/devcon-7.json'
import dayjs from 'dayjs'

export const WEIGHTS = {
  track: 6,
  expertise: 4,
  audience: 4,
  speaker: 6,
  tag: 2,
  featured: 0.1,
}

export interface VectorizedSession {
  session: Session
  vector: number[]
}

export interface VectorDictionary {
  tracks: string[]
  speakers: string[]
  tags: string[]
  expertise: string[]
  audiences: string[]
}

export interface LensFollower {
  id: string
  fullHandle: string
  handle: string
  address: string
  ens: string
}

let cachedDictionary: VectorDictionary = dictionary

const scheduleClient = new ScheduleClient()
const accountClient = new AccountClient()

export async function GetRecommendedSpeakers(id: string) {
  console.log('Get Recommended Speakers', id)
  const farcasterProfile = await GetFarcasterProfile(id)
  const lensProfileId = await GetLensProfileId(id)

  const [farcaster, lens, efp] = await Promise.all([
    farcasterProfile ? GetFarcasterFollowing(farcasterProfile.fid) : Promise.resolve([]),
    lensProfileId ? GetLensFollowing(lensProfileId) : Promise.resolve([]),
    GetEFPFollowing(id),
  ])

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
            { ens: { in: efp.filter((i: string) => i) } },
            { farcaster: { in: farcaster.filter((i) => i.username).map((i) => i.username) } },
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

  const userVector = vectorizeUser(account)
  const personalizedRecommendations = GetRecommendedVectorSearch(userVector, vectorizedSessions as VectorizedSession[], 20)
  const sessions = await scheduleClient.session.findMany({
    where: {
      AND: [
        { eventId: 'devcon-7' },
        {
          OR: [{ speakers: { some: { id: { in: account.favorite_speakers } } } }, { id: { in: personalizedRecommendations.map((r) => r.id) } }],
        },
      ],
    },
    include: {
      speakers: true,
      slot_room: true,
    },
    orderBy: {
      slot_start: 'asc',
    },
  })

  return sessions
}

export function GetRecommendedVectorSearch(sessionVector: number[], allSessions: VectorizedSession[], limit: number = 10): Session[] {
  const similarities = allSessions
    .filter((vs) => vs.vector !== sessionVector && dayjs(vs.session.slot_start).isAfter(dayjs()))
    .map((vs) => {
      const vectorSimilarity = getSimilarity(sessionVector, vs.vector)
      const featuredBoost = vs.session.featured ? WEIGHTS.featured : 0
      const adjustedSimilarity = vectorSimilarity + featuredBoost

      return {
        session: vs.session,
        similarity: adjustedSimilarity,
      }
    })

  const recommendations = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((item) => {
      return {
        ...item.session,
        similarity: item.similarity,
      }
    })

  return recommendations
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
    console.warn('Error fetching Farcaster following:', error)
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
    console.warn('Error fetching Lens followers:', error)
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
    console.warn('Error fetching Lens following:', error)
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
    console.warn('Error fetching social followers:', error)
  }
}

export async function GetEFPFollowing(address: string): Promise<string[]> {
  console.log('Get EFP Following', address)

  try {
    const response = await fetch(`https://api.ethfollow.xyz/api/v1/users/${address}/searchFollowing?limit=1000&term=0`)
    const data = await response.json()
    return data?.following?.map((i: any) => i.ens?.name || i.data || i.address) || []
  } catch (error) {
    console.warn('Error fetching EFP following:', error)
    return []
  }
}

export function buildDictionary(sessions: Session[], rebuild: boolean = false) {
  if (cachedDictionary && !rebuild) return cachedDictionary

  const allTracks = Array.from(new Set(sessions.map((s) => s.track))).filter((t) => !STOPWORDS.includes(t))
  const allSpeakers = Array.from(new Set(sessions.flatMap((s) => s.speakers))).filter((s) => !STOPWORDS.includes(s))
  const allTags = Array.from(new Set(sessions.flatMap((s) => s.tags))).filter((t) => !STOPWORDS.includes(t))
  const allExpertise = Array.from(new Set(sessions.map((s) => s.expertise))).filter((e) => !STOPWORDS.includes(e))
  const allAudiences = Array.from(new Set(sessions.map((s) => s.audience))).filter((a) => !STOPWORDS.includes(a))

  return { tracks: allTracks, speakers: allSpeakers, tags: allTags, expertise: allExpertise, audiences: allAudiences } as VectorDictionary
}

export function vectorizeSessions(sessions: any[], limit: number = 10, saveToFile?: boolean) {
  const dictionary = buildDictionary(sessions, true)
  const vectorizedSessions: VectorizedSession[] = sessions.map((session) => ({
    session,
    vector: vectorizeSession(session, dictionary),
  }))

  if (saveToFile) {
    writeFileSync(`data/vectors/dictionary.json`, JSON.stringify(dictionary, null, 2))
    writeFileSync(`data/vectors/devcon-7.json`, JSON.stringify(vectorizedSessions, null, 2))
  }

  const similarities = []
  for (let i = 0; i < vectorizedSessions.length; i++) {
    const session = vectorizedSessions[i]
    const recommendations = GetRecommendedVectorSearch(session.vector, vectorizedSessions, limit)
    similarities.push(
      ...recommendations.map((rec) => ({
        sessionId: session.session.id,
        otherId: rec.id,
        similarity: rec.similarity || 0,
      }))
    )
  }

  return similarities
}

export function vectorizeSession(session: Session, dictionary: VectorDictionary): number[] {
  const vector = [
    ...dictionary.tracks.map((track) => (session.track === track ? 1 : 0)),
    ...dictionary.speakers.map((speaker) => (session.speakers.includes(speaker) ? 1 : 0)),
    ...dictionary.tags.map((tag) => (session.tags.includes(tag) ? 1 : 0)),
    ...dictionary.expertise.map((exp) => (session.expertise === exp ? 1 : 0)),
    ...dictionary.audiences.map((aud) => (session.audience === aud ? 1 : 0)),
  ]

  return getVectorWeight(vector, dictionary)
}

export function vectorizeUser(user: Account, dic: VectorDictionary = dictionary): number[] {
  const vector = [
    ...dictionary.tracks.map((track: any) => (user.tracks.includes(track) ? 1 : 0)),
    ...dictionary.speakers.map((speaker: any) => (user.favorite_speakers.includes(speaker) ? 1 : 0)),
    ...dictionary.tags.map((tag: any) => (user.tags.includes(tag) ? 1 : 0)),
    // @ts-ignore
    ...dictionary.expertise.map((exp: any) => (getExpertiseLevel(user?.since).includes(exp) ? 1 : 0)),
    // @ts-ignore
    ...dictionary.audiences.map((aud: any) => (user.roles.includes(aud) ? 1 : 0)),
  ]

  return getVectorWeight(vector, dictionary)
}

export function getVectorWeight(vector: number[], dictionary: VectorDictionary) {
  const trackLength = dictionary.tracks.length
  const expertiseLength = dictionary.expertise.length
  const audienceLength = dictionary.audiences.length
  const speakerLength = dictionary.speakers.length
  const tagLength = dictionary.tags.length

  for (let i = 0; i < vector.length; i++) {
    if (i < trackLength) {
      vector[i] *= WEIGHTS.track
    } else if (i < trackLength + expertiseLength) {
      vector[i] *= WEIGHTS.expertise
    } else if (i < trackLength + expertiseLength + audienceLength) {
      vector[i] *= WEIGHTS.audience
    } else if (i < trackLength + expertiseLength + audienceLength + speakerLength) {
      vector[i] *= WEIGHTS.speaker
    } else if (i < trackLength + expertiseLength + audienceLength + speakerLength + tagLength) {
      vector[i] *= WEIGHTS.tag
    }
  }

  return vector
}

export function getSimilarity(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length')
  }

  const dotProduct = vector1.reduce((acc, val, index) => acc + val * vector2[index], 0)
  const magnitude1 = Math.sqrt(vector1.reduce((acc, val) => acc + Math.pow(val, 2), 0))
  const magnitude2 = Math.sqrt(vector2.reduce((acc, val) => acc + Math.pow(val, 2), 0))

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }

  return dotProduct / (magnitude1 * magnitude2)
}

export function getExpertiseLevel(since?: number | null) {
  if (!since) return []

  if (since >= 2023) return ['Beginner']
  if (since >= 2021) return ['Beginner', 'Intermediate']
  if (since >= 2019) return ['Intermediate']
  if (since >= 2017) return ['Intermediate', 'Advanced']

  return ['Advanced']
}
