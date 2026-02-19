import { Session } from '@/types/schedule'
import { STOPWORDS } from '@/utils/stopwords'
import { writeFileSync } from 'fs'
import dictionary from '../../data/vectors/dictionary.json'
import vectorizedSessions from '../../data/vectors/devcon-7.json'

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

let cachedDictionary: VectorDictionary = dictionary

export function GetRecommendedVectorSearch(sessionVector: number[], allSessions: VectorizedSession[], limit: number = 10): Session[] {
  const similarities = allSessions
    .map((vs) => {
      const vectorSimilarity = getSimilarity(sessionVector, vs.vector)
      const featuredBoost = vs.session.featured ? WEIGHTS.featured : 0
      const adjustedSimilarity = vectorSimilarity + featuredBoost

      return {
        session: vs.session,
        similarity: adjustedSimilarity,
      }
    })
    .filter((item) => item.similarity > 0)

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
    const recommendations = GetRecommendedVectorSearch(session.vector, vectorizedSessions, limit + 1) // +1 to skip itself
    const filteredRecommendations = recommendations.filter((rec) => rec.id !== session.session.id)
    similarities.push(
      ...filteredRecommendations.map((rec) => ({
        sessionId: session.session.id,
        sourceId: session.session.sourceId,
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
    ...dictionary.audiences.map((aud) => (session.audience && session.audience === aud ? 1 : 0)),
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
