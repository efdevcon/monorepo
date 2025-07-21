import React, { useEffect, useState } from 'react'
import { SEO } from 'common/components/SEO'
import Head from 'next/head'
import { supabase } from 'common/supabaseClient'
import NewSchedule from 'lib/components/event-schedule-new'
import FeedCoupons from 'common/components/perks/feed-coupons'

// Format Atproto event to our calendar component format
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
  const [expandedDids, setExpandedDids] = useState<Set<string>>(new Set())
  const [editingDids, setEditingDids] = useState<Set<string>>(new Set())
  const [editValues, setEditValues] = useState<Record<string, { alias: string; contact: string }>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'changes_need_review' | 'approved'>('all')
  const [editingComments, setEditingComments] = useState<Set<string>>(new Set())
  const [commentValues, setCommentValues] = useState<Record<string, string>>({})

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
          .from('atproto_records')
          .select(
            `
            id, rkey, created_by, created_at, updated_at, show_on_calendar,
            record_passed_review, record_needs_review, lexicon, comments, reviewed,
            atproto_dids!created_by(did, alias, is_spammer, contact)
          `
          )
          .eq('lexicon', 'org.devcon.event')
          .order('updated_at', { ascending: false })

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
        emailRedirectTo: `${window.location.origin}/community-events/admin`,
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
    try {
      // Update directly via Supabase
      const { error } = await supabase.from('atproto_records').update({ show_on_calendar: value }).eq('id', id)

      if (error) throw error

      // Refetch events
      const { data } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })
      setEvents(data || [])
    } catch (error: any) {
      setEventsError(error.message)
    }
    setEventsLoading(false)
  }

  const handleApprove = async (id: string, recordData: any) => {
    setEventsLoading(true)
    try {
      const { error } = await supabase
        .from('atproto_records')
        .update({
          record_passed_review: recordData,
          record_needs_review: null,
          reviewed: true,
        })
        .eq('id', id)

      if (error) throw error

      // Refetch events
      const { data } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })
      setEvents(data || [])
    } catch (error: any) {
      setEventsError(error.message)
    }
    setEventsLoading(false)
  }

  const toggleDidExpansion = (did: string) => {
    const newExpandedDids = new Set(expandedDids)
    if (newExpandedDids.has(did)) {
      newExpandedDids.delete(did)
    } else {
      newExpandedDids.add(did)
    }
    setExpandedDids(newExpandedDids)
  }

  const toggleDidEdit = (did: string, didInfo: any) => {
    const newEditingDids = new Set(editingDids)
    if (newEditingDids.has(did)) {
      newEditingDids.delete(did)
    } else {
      newEditingDids.add(did)
      // Initialize edit values
      setEditValues(prev => ({
        ...prev,
        [did]: {
          alias: didInfo?.alias || '',
          contact: didInfo?.contact || '',
        },
      }))
    }
    setEditingDids(newEditingDids)
  }

  const handleEditValueChange = (did: string, field: 'alias' | 'contact', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [did]: {
        ...prev[did],
        [field]: value,
      },
    }))
  }

  const handleSaveDidInfo = async (did: string) => {
    setEventsLoading(true)
    try {
      const values = editValues[did]
      const { error } = await supabase
        .from('atproto_dids')
        .update({
          alias: values.alias || null,
          contact: values.contact || null,
        })
        .eq('did', did)

      if (error) throw error

      // Refetch events to get updated DID info
      const { data } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })

      setEvents(data || [])

      // Exit edit mode
      const newEditingDids = new Set(editingDids)
      newEditingDids.delete(did)
      setEditingDids(newEditingDids)
    } catch (error: any) {
      setEventsError(error.message)
    }
    setEventsLoading(false)
  }

  const handleCancelDidEdit = (did: string) => {
    const newEditingDids = new Set(editingDids)
    newEditingDids.delete(did)
    setEditingDids(newEditingDids)

    // Remove edit values for this DID
    const newEditValues = { ...editValues }
    delete newEditValues[did]
    setEditValues(newEditValues)
  }

  const handleToggleReviewed = async (id: string, value: boolean) => {
    setEventsLoading(true)
    try {
      const { error } = await supabase.from('atproto_records').update({ reviewed: value }).eq('id', id)

      if (error) throw error

      // Refetch events
      const { data } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon, comments, reviewed,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })
      setEvents(data || [])
    } catch (error: any) {
      setEventsError(error.message)
    }
    setEventsLoading(false)
  }

  const toggleCommentEdit = (eventId: string, currentComment: string) => {
    const newEditingComments = new Set(editingComments)
    if (newEditingComments.has(eventId)) {
      newEditingComments.delete(eventId)
    } else {
      newEditingComments.add(eventId)
      setCommentValues(prev => ({
        ...prev,
        [eventId]: currentComment || '',
      }))
    }
    setEditingComments(newEditingComments)
  }

  const handleCommentChange = (eventId: string, value: string) => {
    setCommentValues(prev => ({
      ...prev,
      [eventId]: value,
    }))
  }

  const handleSaveComment = async (eventId: string) => {
    setEventsLoading(true)
    try {
      const comment = commentValues[eventId]
      const { error } = await supabase
        .from('atproto_records')
        .update({ comments: comment || null })
        .eq('id', eventId)

      if (error) throw error

      // Refetch events
      const { data } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon, comments, reviewed,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })

      setEvents(data || [])

      // Exit edit mode
      const newEditingComments = new Set(editingComments)
      newEditingComments.delete(eventId)
      setEditingComments(newEditingComments)
    } catch (error: any) {
      setEventsError(error.message)
    }
    setEventsLoading(false)
  }

  const handleCancelCommentEdit = (eventId: string) => {
    const newEditingComments = new Set(editingComments)
    newEditingComments.delete(eventId)
    setEditingComments(newEditingComments)

    // Remove comment values for this event
    const newCommentValues = { ...commentValues }
    delete newCommentValues[eventId]
    setCommentValues(newCommentValues)
  }

  // Filter events based on status filter
  const filteredEvents = events.filter(event => {
    if (statusFilter === 'needs_review') {
      return !!event.record_needs_review && !event.record_passed_review && !event.reviewed
    }
    if (statusFilter === 'changes_need_review') {
      return !!event.record_needs_review && !!event.record_passed_review
    }
    if (statusFilter === 'approved') {
      return !!event.record_passed_review && !event.record_needs_review
    }
    return true // 'all'
  })

  // Group events by DID
  const eventsByDid = filteredEvents.reduce((acc, event) => {
    const did = event.atproto_dids?.did || 'unknown'
    if (!acc[did]) {
      acc[did] = {
        didInfo: event.atproto_dids,
        events: [],
      }
    }
    acc[did].events.push(event)
    return acc
  }, {} as Record<string, { didInfo: any; events: any[] }>)

  type GroupedEvents = { didInfo: any; events: any[] }

  const formattedEvents = events
    .map(event => ({
      ...formatATProtoEvent(event.record_passed_review || event.record_needs_review),
      id: event.id,
      created_by: event.created_by,
      created_at: event.created_at,
      show_on_calendar: event.show_on_calendar,
    }))
    .filter(event => event.show_on_calendar)

  return (
    <>
      <SEO title="Admin" description="Admin dashboard for Devconnect" />
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading...</div>
            </div>
          ) : user ? (
            <>
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                <p className="text-gray-600 mb-4">Logged in as {user.email}</p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Log out
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && <FeedCoupons />}

              {/* Events Management */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Events by DID</h2>

                {/* Summary Stats */}
                {!eventsLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">{events.length}</div>
                      <div className="text-sm text-gray-600">Total Events</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-800">
                        {events.filter(e => !!e.record_needs_review && !e.record_passed_review && !e.reviewed).length}
                      </div>
                      <div className="text-sm text-yellow-600">Need Review</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-800">
                        {events.filter(e => !!e.record_needs_review && !!e.record_passed_review).length}
                      </div>
                      <div className="text-sm text-orange-600">Updated Records</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-800">
                        {events.filter(e => !!e.record_passed_review && !e.record_needs_review).length}
                      </div>
                      <div className="text-sm text-green-600">Approved</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-800">
                        {events.filter(e => !!e.show_on_calendar).length}
                      </div>
                      <div className="text-sm text-blue-600">On Calendar</div>
                    </div>
                  </div>
                )}

                {/* Filter Buttons */}
                <div className="flex space-x-2 mb-6">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Events
                  </button>
                  <button
                    onClick={() => setStatusFilter('needs_review')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'needs_review'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Needs Review (
                    {events.filter(e => !!e.record_needs_review && !e.record_passed_review && !e.reviewed).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('changes_need_review')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'changes_need_review'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Updated Records ({events.filter(e => !!e.record_needs_review && !!e.record_passed_review).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Approved ({events.filter(e => !!e.record_passed_review && !e.record_needs_review).length})
                  </button>
                </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-600">Loading events...</div>
                  </div>
                ) : eventsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">{eventsError}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(eventsByDid).map(([did, groupedData]) => {
                      const { didInfo, events: didEvents } = groupedData as GroupedEvents
                      const isEditing = editingDids.has(did)
                      const editValue = editValues[did]

                      return (
                        <div key={did} className="border border-gray-200 rounded-lg">
                          {/* DID Header */}
                          <div className="p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <button
                                  onClick={() => toggleDidExpansion(did)}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                  {expandedDids.has(did) ? '▼' : '▶'}
                                </button>

                                {isEditing ? (
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm font-medium text-gray-700 min-w-[60px]">Alias:</label>
                                      <input
                                        type="text"
                                        value={editValue?.alias || ''}
                                        onChange={e => handleEditValueChange(did, 'alias', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                        placeholder="Enter alias"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm font-medium text-gray-700 min-w-[60px]">Contact:</label>
                                      <input
                                        type="text"
                                        value={editValue?.contact || ''}
                                        onChange={e => handleEditValueChange(did, 'contact', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                                        placeholder="Enter contact info"
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500">{did}</p>
                                  </div>
                                ) : (
                                  <div>
                                    <h3 className="font-medium text-gray-900">{didInfo?.alias || did}</h3>
                                    <p className="text-sm text-gray-500">
                                      {did} • {didEvents.length} event{didEvents.length !== 1 ? 's' : ''}
                                    </p>
                                    {didInfo?.contact && (
                                      <p className="text-sm text-gray-600">Contact: {didInfo.contact}</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                {didInfo?.is_spammer && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                    Spammer
                                  </span>
                                )}

                                {isEditing ? (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleSaveDidInfo(did)}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => handleCancelDidEdit(did)}
                                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => toggleDidEdit(did, didInfo)}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Events */}
                          {expandedDids.has(did) && (
                            <div className="divide-y divide-gray-100">
                              {didEvents.map((event: any) => {
                                const needsReview = !!event.record_needs_review && !event.reviewed
                                const isApproved = !!event.record_passed_review
                                const hasChanges = needsReview && isApproved // Both defined = approved but has changes
                                const recordData = event.record_passed_review || event.record_needs_review
                                const isEditingComment = editingComments.has(event.id)

                                return (
                                  <div
                                    key={event.id}
                                    className={`p-4 ml-6 ${
                                      hasChanges
                                        ? 'bg-orange-50 border-l-4 border-orange-400'
                                        : needsReview
                                        ? 'bg-yellow-50 border-l-4 border-yellow-400'
                                        : 'bg-white'
                                    }`}
                                  >
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                      <div className="lg:col-span-1 text-sm text-gray-500">#{event.id}</div>

                                      <div className="lg:col-span-2 text-sm text-gray-600">
                                        {event.created_at ? new Date(event.created_at).toLocaleString() : ''}

                                        {/* Status Badge */}
                                        <div className="mt-1 space-y-1">
                                          {hasChanges ? (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                              Updated - Needs Review
                                            </span>
                                          ) : needsReview ? (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                              Needs Review
                                            </span>
                                          ) : isApproved ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                              ✓ Approved
                                            </span>
                                          ) : (
                                            <>
                                              {/* <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                              No Data 
                                            </span> */}
                                            </>
                                          )}

                                          {/* Reviewed Badge */}
                                          {event.reviewed && (
                                            <div>
                                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                Has been reviewed
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="lg:col-span-5">
                                        {hasChanges ? (
                                          <div className="space-y-2">
                                            <div className="bg-green-50 rounded-md p-3 max-h-32 overflow-y-auto">
                                              <div className="text-xs font-medium text-green-800 mb-1">
                                                ✓ Currently Live (Approved):
                                              </div>
                                              <pre className="text-xs text-green-700 whitespace-pre-wrap break-words">
                                                {JSON.stringify(event.record_passed_review, null, 2)}
                                              </pre>
                                            </div>
                                            <div className="bg-orange-50 rounded-md p-3 max-h-32 overflow-y-auto">
                                              <div className="text-xs font-medium text-orange-800 mb-1">
                                                📝 Latest Update (Needs Review):
                                              </div>
                                              <pre className="text-xs text-orange-700 whitespace-pre-wrap break-words">
                                                {JSON.stringify(event.record_needs_review, null, 2)}
                                              </pre>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                              {JSON.stringify(recordData, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>

                                      <div className="lg:col-span-4 space-y-2 space-x-4">
                                        {/* Review Actions */}
                                        {(hasChanges || !isApproved) && (
                                          <div className="flex space-x-2 mb-2">
                                            <button
                                              onClick={() => handleApprove(event.id, event.record_needs_review)}
                                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                                            >
                                              {hasChanges ? 'Approve Changes' : 'Approve'}
                                            </button>
                                          </div>
                                        )}

                                        {/* Reviewed Checkbox */}
                                        <label className="inline-flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={!!event.reviewed}
                                            onChange={e => handleToggleReviewed(event.id, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                          />
                                          <span className="ml-2 text-sm text-gray-600">Reviewed</span>
                                        </label>

                                        {/* Calendar Toggle */}
                                        <label className="inline-flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={!!event.show_on_calendar}
                                            disabled={!isApproved}
                                            onChange={e => handleToggle(event.id, 'show_on_calendar', e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                          />
                                          <span
                                            className={`ml-2 text-sm ${isApproved ? 'text-gray-600' : 'text-gray-400'}`}
                                          >
                                            Show on Calendar
                                          </span>
                                        </label>

                                        {!isApproved && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {needsReview
                                              ? 'Approve record first'
                                              : 'Only approved records can be shown on calendar'}
                                          </p>
                                        )}

                                        {hasChanges && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            ℹ️ Using currently approved version for calendar
                                          </p>
                                        )}

                                        {/* Comments Section */}
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-gray-700">Comments</h4>
                                            {!isEditingComment && (
                                              <button
                                                onClick={() => toggleCommentEdit(event.id, event.comments)}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                              >
                                                {event.comments ? 'Edit' : 'Add Comment'}
                                              </button>
                                            )}
                                          </div>

                                          {isEditingComment ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={commentValues[event.id] || ''}
                                                onChange={e => handleCommentChange(event.id, e.target.value)}
                                                placeholder="Add your comments here..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical min-h-[80px]"
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() => handleSaveComment(event.id)}
                                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => handleCancelCommentEdit(event.id)}
                                                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : event.comments ? (
                                            <div className="bg-gray-50 rounded-md p-3">
                                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                {event.comments}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-500 italic">No comments yet</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Calendar Preview */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Calendar Preview</h2>
                <NewSchedule
                  events={formattedEvents}
                  selectedEvent={null}
                  selectedDay={null}
                  setSelectedEvent={() => {}}
                  setSelectedDay={() => {}}
                />
              </div>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Admin Login</h1>
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                </form>
                {message && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800">{message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default AdminPage
