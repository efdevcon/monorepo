import * as NaturalLanguageProcessing from 'natural'
import { GetData, GetSpeakerData } from 'clients/filesystem'
import { PrismaClient } from '@prisma/client'
import words from 'natural/lib/natural/util'
import dayjs from 'dayjs'

const client = new PrismaClient()
const stopwords = [
  ...words.stopwords,
  '-', ',', '.', '!', '?', '(', ')', '[', ']', '{', '}', ':', ';', '\'', '"', '“', '”',
  'no', 'not', 'nor', 'none', 'nothing', 'nowhere', 'never', 'nobody',
  'us', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'vs', 'vs.', 'versus', 'verses', 'verses.', 'versus.', 'against', 
  'i', 'me', 'my', 'mine', 'myself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', "what's", 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'can',
  'could', 'may', 'might', 'must', 'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
  'create', 'update', 'delete', 'add', 'remove', 'insert', 'select', 'from', 'where', 'join', 'inner',
  'using', 'left', 'right', 'outer', 'on', 'and', 'or', 'not', 'in', 'like', 'between', 'is',
  'novel', 'new', 'old', 'latest', 'earliest', 'recent', 'earlier', 'upcoming', 'future', 'past',
  'always', 'never', 'sometimes', 'often', 'rarely', 'seldom', 'usually', 'frequently', 'occasionally',
  'ask', 'answer', 'question', 'query', 'doubt', 'clarify', 'explain', 'elaborate', 'detail', 'detailing',
  'best', 'better', 'good', 'great', 'excellent', 'awesome', 'amazing', 'fantastic', 'wonderful', 'superb',
  'original', 'unique', 'distinct', 'different', 'similar', 'same', 'identical', 'equal', 'equivalent',
  'future', 'coming', 'next', 'later', 'after', 'post', 'subsequent', 'following', 'succeeding',
  'open', 'with', 'without', 'close', 'end', 'finish', 'complete', 'conclude', 'terminate', 'stop',
  'need', 'want', 'require', 'wish', 'desire', 'demand', 'seek', 'look', 'search', 'find', 'locate',
  'look', 'search', 'find', 'locate', 'get', 'fetch', 'obtain', 'acquire', 'receive', 'gain', 'secure',
  'verify', 'validate', 'confirm', 'check', 'ensure', 'assure', 'guarantee', 'warrant', 'certify',
  'users', 'user', 'customers', 'customer', 'clients', 'client', 'people', 'person', 'individuals', 'individual',
  'understand', 'understanding', "you've", "you're", "you'll"
]

async function main() {
  console.log('Seed local data sources into Sqlite..')

  // Rooms
  const rooms = GetData('rooms')
  console.log(`- Add ${rooms.length} rooms`)
  for (const item of rooms) {
    await client.room.create({ data: item })
  }

  // Events
  const events = GetData('events')
  console.log(`- Add ${events.length} events`)
  for (const item of events) {
    await client.event.create({
      data: {
        ...item,
        rooms: {
          connect: item.rooms.map((i: string) => ({ id: i })),
        },
      },
    })
  }

  // Speakers
  const speakers = GetSpeakerData()
  console.log(`- Add ${speakers.length} speakers`)
  for (const item of speakers) {
    await client.speaker.create({ data: item })
  }

  // Sessions
  const sessions = GetData('sessions')
  console.log(`- Add ${sessions.length} sessions`)
  for (const item of sessions) {
    const eventId = item.eventId
    delete item.eventId
    const roomId = item.slot_roomId
    delete item.slot_roomId

    let data: any = {
      ...item,
      tags: item.tags.join(','),
      slot_start: item.slot_start ? dayjs(item.slot_start).toISOString() : null,
      slot_end: item.slot_end ? dayjs(item.slot_end).toISOString() : null,
      event: {
        connect: { id: eventId },
      },
      speakers: {
        connect: item.speakers.map((i: any) => ({ id: i })),
      },
    }

    if (roomId) {
      data.slot_room = {
        connect: { id: roomId },
      }
    }

    try {
      await client.session.create({
        data: data,
      })
    } catch (e) {
      console.log('Unable to add item', item.id)
      console.error(e)
    }
  }

  // Related Sessions
  console.log('- Vectorize sessions')
  const sessionsWithVectors = []
  const tokenizer = new NaturalLanguageProcessing.AggressiveTokenizer()
  const tfidf = new NaturalLanguageProcessing.TfIdf()
  tfidf.setStopwords(stopwords)

  for (let i = 0; i < sessions.length; i++) {
    const item = sessions[i]
    if (!item) {
      console.log('No item found', i, sessions)
      continue
    }

    const tokens = [...tokenizer.tokenize(`${item.title}} ${item.description}} ${item.track}`), ...item.tags, ...item.speakers].filter(
      (i) => !words.stopwords.some((j) => j.toLowerCase() === i.toLowerCase())
    )
    tfidf.addDocument(tokens)
  }

  for (let i = 0; i < sessions.length; i++) {
    const item = sessions[i]
    const vectors = tfidf.listTerms(i).map((i) => i.tfidf)

    // Normalize the vector
    const magnitude = Math.sqrt(vectors.reduce((acc, val) => acc + Math.pow(val, 2), 0))
    const normalizedVectors = vectors.map((val) => val / magnitude)

    sessionsWithVectors.push({ id: item.id, vectors: normalizedVectors })
  }

  console.log('- Add related sessions')
  const threshold = 0.98
  const relatedSessions = []
  for (let i = 0; i < sessionsWithVectors.length; i++) {
    const session = sessionsWithVectors[i]
    for (let j = i + 1; j < sessionsWithVectors.length; j++) {
      const other = sessionsWithVectors[j]
      const similarityScore = computeCosineSimilarity(session.vectors, other.vectors)
      if (similarityScore > threshold) {
        relatedSessions.push({
          sessionId: session.id,
          relatedId: other.id,
          similarity: similarityScore,
        })
        relatedSessions.push({
          sessionId: other.id,
          relatedId: session.id,
          similarity: similarityScore,
        })
      }
    }
  }

  await client.relatedSession.createMany({
    data: relatedSessions,
  })
}

function computeCosineSimilarity(vector1: number[], vector2: number[]): number {
  const dotProduct = vector1.reduce((acc, val, index) => acc + val * vector2[index], 0)
  const magnitude1 = Math.sqrt(vector1.reduce((acc, val) => acc + Math.pow(val, 2), 0))
  const magnitude2 = Math.sqrt(vector2.reduce((acc, val) => acc + Math.pow(val, 2), 0))

  return dotProduct / (magnitude1 * magnitude2)
}

function computeJaccardSimilarity(vector1: number[], vector2: number[]): number {
  const set1 = new Set(vector1.map((value, index) => index))
  const set2 = new Set(vector2.map((value, index) => index))
  const intersection = new Set([...set1].filter((value) => set2.has(value)))
  const union = new Set([...set1].concat([...set2]))
  return intersection.size / union.size
}

main()
  .then(async () => {
    await client.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await client.$disconnect()
    process.exit(1)
  })
