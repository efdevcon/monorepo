import { useAccountContext } from 'context/account-context'
import { useEffect, useState } from 'react'
import { APP_CONFIG } from 'utils/config'

export function RecommendedSpeakers() {
  const { account } = useAccountContext()
  const [speakers, setSpeakers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [favoritedSpeakers, setFavoritedSpeakers] = useState<any[]>([])
  const [favoritedSessions, setFavoritedSessions] = useState<any[]>([])

  useEffect(() => {
    const fetchRecommendedSpeakers = async () => {
      const res = await fetch(APP_CONFIG.API_BASE_URL + '/account/speakers/recommended', {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.code === 200) {
        setSpeakers(data.data)
      } else {
        console.error('Error fetching recommended speakers', data)
      }
    }

    const fetchRecommendedSessions = async () => {
      const res = await fetch(APP_CONFIG.API_BASE_URL + '/account/sessions/recommended', {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.code === 200) {
        setSessions(data.data)
      } else {
        console.error('Error fetching recommended sessions', data)
      }
    }

    const fetchFavoritedSpeakers = async () => {
      const res = await fetch(APP_CONFIG.API_BASE_URL + '/account/speakers', {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.code === 200) {
        setFavoritedSpeakers([...data.data])
      }
    }

    const fetchFavoritedSessions = async () => {
      const res = await fetch(APP_CONFIG.API_BASE_URL + '/account/sessions', {
        method: 'GET',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.code === 200) {
        setFavoritedSessions(data.data ? [...data.data.attending, ...data.data.interested] : [])
      }
    }

    if (account?.id) {
      console.log('Fetching recommendations..')
      fetchRecommendedSpeakers()
      fetchRecommendedSessions()
      fetchFavoritedSpeakers()
      fetchFavoritedSessions()
    }
  }, [account])

  return (
    <>
      <div className="section">
        <h2>Recommended Speakers</h2>
        <ul className="speakers">
          {speakers.map((i: any) => (
            <li key={i.id}>{i.name}</li>
          ))}
        </ul>
        <h2>Recommended Sessions</h2>
        <ul className="sessions">
          {sessions.map((i: any) => (
            <li key={i.id}>
              {i.title} {i.featured ? '🔥' : ''}
            </li>
          ))}
        </ul>
        <h2>Favorited Speakers</h2>
        <ul className="speakers">
          {favoritedSpeakers.map((i: any) => (
            <li key={i.id}>{i.name}</li>
          ))}
        </ul>
        <h2>Favorited Sessions</h2>
        <ul className="sessions">
          {favoritedSessions.map((i: any) => (
            <li key={i.id}>
              {i.title} {i.featured ? '🔥' : ''}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
