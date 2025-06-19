import React, { useEffect, useState } from 'react'
import { SEO } from 'common/components/SEO'
import Head from 'next/head'
import { supabase } from 'common/supabaseClient'
import NewSchedule from 'lib/components/event-schedule-new'

const formatATProtoEvent = (atprotoEvent: any) => {
  console.log(atprotoEvent)
  // Map timeslots to timeblocks, or fallback to main event time
  let timeblocks: any[] = []
  if (Array.isArray(atprotoEvent.timeslots) && atprotoEvent.timeslots.length > 0) {
    timeblocks = atprotoEvent.timeslots.map((slot: any) => ({
      start: slot.start_utc,
      end: slot.end_utc,
      name: slot.title || undefined,
    }))
  } else if (atprotoEvent.start_utc && atprotoEvent.end_utc) {
    timeblocks = [
      {
        start: atprotoEvent.start_utc,
        end: atprotoEvent.end_utc,
        name: atprotoEvent.title,
      },
    ]
  }

  return {
    id: atprotoEvent.id,
    name: atprotoEvent.title,
    description: atprotoEvent.description,
    organizer: atprotoEvent.organizer?.name,
    difficulty: atprotoEvent.metadata?.expertise_level || 'All Welcome',
    location: {
      url: atprotoEvent.metadata?.website || '',
      text: atprotoEvent.location?.name || '',
    },
    timeblocks,
    priority: atprotoEvent.metadata?.priority || 1,
    categories: atprotoEvent.metadata?.categories || [],
    amountPeople: atprotoEvent.metadata?.capacity !== undefined ? String(atprotoEvent.metadata.capacity) : undefined,
  }
}

const AdminPage = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    // Check initial session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user) {
      setEventsLoading(true)
      setEventsError('')

      const fetchEvents = async () => {
        const { data, error } = await supabase
          .from('atproto-events')
          .select('id, did, record, show_on_calendar, dont_return_from_api, created_at')
          .eq('collection', 'org.devcon.event.vone')
          .order('created_at', { ascending: false })

        if (error) {
          setEventsError(error.message)
        } else {
          setEvents(data || [])
        }
        setEventsLoading(false)
      }

      fetchEvents()
    }
  }, [user])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
  }

  const handleToggle = async (id: string, field: string, value: boolean) => {
    setEventsLoading(true)
    const { error } = await supabase
      .from('atproto-events')
      .update({ [field]: value })
      .eq('id', id)
    if (error) setEventsError(error.message)
    // Refetch events to update UI
    const { data } = await supabase
      .from('atproto-events')
      .select('id, did, record, show_on_calendar, dont_return_from_api, created_at')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setEventsLoading(false)
  }

  const formattedEvents = events.map(event => ({
    ...formatATProtoEvent(event.record),
    id: event.id,
    did: event.did,
    created_at: event.created_at,
  }))

  return (
    <>
      <SEO title="Admin" description="Admin dashboard for Devconnect" />

      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* <Header active /> */}
      <main
        className="section text-black"
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Admin Dashboard</h1>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>Logged in as {user.email}</p>
            <button onClick={handleLogout} style={{ marginTop: 24, padding: '8px 16px' }}>
              Log out
            </button>
            <div style={{ marginTop: 32, width: '100%' }} className="p-8">
              <h2 style={{ fontSize: '1.3rem', marginBottom: 12 }}>All Events</h2>
              {eventsLoading ? (
                <p>Loading events...</p>
              ) : eventsError ? (
                <p style={{ color: 'red' }}>{eventsError}</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>ID</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>DID</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Created At</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Record</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Show on Calendar</th>
                      <th style={{ border: '1px solid #ccc', padding: 8 }}>Return from API</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(event => (
                      <tr key={event.id}>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>{event.id}</td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>{event.did}</td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>
                          {event.created_at ? new Date(event.created_at).toLocaleString() : ''}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(event.record, null, 2)}
                          </pre>
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>
                          <input
                            type="checkbox"
                            checked={!!event.show_on_calendar}
                            onChange={e => handleToggle(event.id, 'show_on_calendar', e.target.checked)}
                          />
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: 8 }}>
                          <input
                            type="checkbox"
                            checked={!event.dont_return_from_api}
                            onChange={e => handleToggle(event.id, 'dont_return_from_api', !e.target.checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Admin Login</h1>
            <form
              onSubmit={handleMagicLink}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ padding: '8px', fontSize: '1rem', marginBottom: 8 }}
              />
              <button type="submit" style={{ padding: '12px 24px', fontSize: '1.1rem' }} disabled={loading}>
                Send Magic Link
              </button>
            </form>
            {message && <p style={{ marginTop: 12, color: '#0070f3' }}>{message}</p>}
          </>
        )}

        <NewSchedule
          events={formattedEvents}
          selectedEvent={null}
          selectedDay={null}
          setSelectedEvent={() => {}}
          setSelectedDay={() => {}}
        />
      </main>
      {/* <Footer /> */}
    </>
  )
}

export default AdminPage
