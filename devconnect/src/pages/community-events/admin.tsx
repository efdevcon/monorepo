import React, { useEffect, useState } from 'react'
import { SEO } from 'common/components/SEO'
import Head from 'next/head'
import { supabase } from 'common/supabaseClient'
import NewSchedule from 'lib/components/event-schedule-new'
import FeedCoupons from 'common/components/perks/feed-coupons'
import { Dialog, DialogContent } from 'lib/components/ui/dialog'
import { toast } from 'sonner'

// Format Atproto event to our calendar component format
const formatATProtoEvent = (atprotoEvent: any, override: any) => {
  const final = override ? { ...atprotoEvent, ...override } : atprotoEvent

  // Map timeslots to timeblocks, or fallback to main event time
  let timeblocks: any[] = []
  if (Array.isArray(final.timeslots) && final.timeslots.length > 0) {
    timeblocks = final.timeslots.map((slot: any) => ({
      start: slot.start_utc,
      end: slot.end_utc,
      name: slot.title || undefined,
    }))
  } else if (final.start_utc && final.end_utc) {
    timeblocks = [
      {
        start: final.start_utc,
        end: final.end_utc,
        name: final.title,
      },
    ]
  }

  return {
    id: final.id,
    name: final.title,
    description: final.description,
    organizer: final.organizer?.name,
    difficulty: final.metadata?.expertise_level || 'All Welcome',
    location: {
      url: final.metadata?.website || '',
      text: final.location?.name || '',
    },
    timeblocks,
    priority: final.metadata?.priority || 1,
    categories: final.metadata?.categories || [],
    amountPeople: final.metadata?.capacity !== undefined ? String(final.metadata.capacity) : undefined,
    event_type: final.event_type,
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
  const [expandedJson, setExpandedJson] = useState<{
    isOpen: boolean
    title: string
    data: any
  }>({
    isOpen: false,
    title: '',
    data: null,
  })
  const [editingAdminOverride, setEditingAdminOverride] = useState<Set<string>>(new Set())
  const [adminOverrideValues, setAdminOverrideValues] = useState<Record<string, string>>({})

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      setEventsError('')

      const { data, error } = await supabase
        .from('atproto_records')
        .select(
          `
          id, rkey, created_by, created_at, updated_at, show_on_calendar,
          record_passed_review, record_needs_review, lexicon, comments, reviewed, is_core_event, admin_override,
          atproto_dids!created_by(did, alias, is_spammer, contact)
        `
        )
        .eq('lexicon', 'org.devcon.event')
        .order('updated_at', { ascending: false })

      const { data: contacts, error: error2 } = await supabase.from('atproto_records_contacts').select(
        `
          rkey, email
        `
      )

      const mergedData = (() => {
        if (data && contacts) {
          return data.map(event => ({
            ...event,
            contact: contacts.find(contact => contact.rkey === event.rkey)?.email,
          }))
        }
        return data || []
      })()

      if (error) {
        throw error
      } else {
        setEvents(mergedData)
      }
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
  }

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
    if (user) fetchEvents()
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

      await fetchEvents()
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleToggleCoreEvent = async (id: string, field: string, value: boolean) => {
    setEventsLoading(true)

    try {
      // Update directly via Supabase
      const { error } = await supabase.from('atproto_records').update({ is_core_event: value }).eq('id', id)

      if (error) throw error

      await fetchEvents()
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
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

      await fetchEvents()
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
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

      await fetchEvents()

      // Exit edit mode
      const newEditingDids = new Set(editingDids)
      newEditingDids.delete(did)
      setEditingDids(newEditingDids)
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
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

      await fetchEvents()
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
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
      await fetchEvents()

      // Exit edit mode
      const newEditingComments = new Set(editingComments)
      newEditingComments.delete(eventId)
      setEditingComments(newEditingComments)
    } catch (error: any) {
      setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
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

  const toggleAdminOverrideEdit = (id: string, currentValue: any) => {
    const newEditingAdminOverride = new Set(editingAdminOverride)
    if (newEditingAdminOverride.has(id)) {
      newEditingAdminOverride.delete(id)
    } else {
      newEditingAdminOverride.add(id)
      setAdminOverrideValues(prev => ({
        ...prev,
        [id]: currentValue ? JSON.stringify(currentValue, null, 2) : '',
      }))
    }
    setEditingAdminOverride(newEditingAdminOverride)
  }

  const handleAdminOverrideChange = (id: string, value: string) => {
    setAdminOverrideValues(prev => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSaveAdminOverride = async (id: string) => {
    setEventsLoading(true)
    try {
      let jsonValue = null
      if (adminOverrideValues[id]) {
        try {
          jsonValue = JSON.parse(adminOverrideValues[id])
        } catch (e) {
          throw new Error('Invalid JSON format')
        }
      }

      // Get the current event to merge with admin override
      const currentEvent = events.find(e => e.id === id)
      if (!currentEvent) {
        throw new Error('Event not found')
      }

      // Get the base record data (prefer approved version if it exists)
      const baseRecord = currentEvent.record_passed_review || currentEvent.record_needs_review

      // Merge the base record with admin override for validation
      const mergedRecord = jsonValue ? { ...baseRecord, ...jsonValue } : baseRecord

      const validationUrl = process.env.NEXT_PUBLIC_VALIDATION_URL || 'http://localhost:4000/validate-event'

      // Validate the merged record using the validation endpoint at the same base URL
      const validationResponse = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: mergedRecord }),
      })

      const validationResult = await validationResponse.json()

      console.log('Validation result:', validationResult)

      if (!validationResult.valid) {
        throw new Error(`Validation failed: ${validationResult.error || 'Invalid event data'}`)
      }

      // If validation passes, save the admin override
      const { error } = await supabase.from('atproto_records').update({ admin_override: jsonValue }).eq('id', id)

      if (error) throw error

      await fetchEvents()

      // Exit edit mode
      const newEditingAdminOverride = new Set(editingAdminOverride)
      newEditingAdminOverride.delete(id)
      setEditingAdminOverride(newEditingAdminOverride)
    } catch (error: any) {
      alert(error.message)
      // setEventsError(error.message)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleCancelAdminOverrideEdit = (id: string) => {
    const newEditingAdminOverride = new Set(editingAdminOverride)
    newEditingAdminOverride.delete(id)
    setEditingAdminOverride(newEditingAdminOverride)

    // Remove edit values for this event
    const newAdminOverrideValues = { ...adminOverrideValues }
    delete newAdminOverrideValues[id]
    setAdminOverrideValues(newAdminOverrideValues)
  }

  const handleRemoveAdminOverride = async (id: string) => {
    if (!confirm('Are you sure you want to remove the admin override?')) {
      return
    }

    setEventsLoading(true)
    try {
      // Set admin_override to null to remove it
      const { error } = await supabase.from('atproto_records').update({ admin_override: null }).eq('id', id)

      if (error) throw error

      await fetchEvents()

      toast.success('Admin override removed successfully')
    } catch (error: any) {
      alert(`Failed to remove admin override: ${error.message}`)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleExpandJson = (title: string, data: any) => {
    setExpandedJson({
      isOpen: true,
      title,
      data,
    })
  }

  const handleCloseJsonDialog = () => {
    setExpandedJson({
      isOpen: false,
      title: '',
      data: null,
    })
  }

  // Filter events based on status filter
  const filteredEvents = events.filter(event => {
    if (statusFilter === 'needs_review') {
      const hasUpdate = event.record_needs_review && event.record_passed_review
      const isNew = event.record_needs_review

      if ((isNew || hasUpdate) && !event.reviewed) {
        return true
      }
      return false
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
      ...formatATProtoEvent(event.record_passed_review || event.record_needs_review, event.admin_override),
      id: event.id,
      created_by: event.created_by,
      created_at: event.created_at,
      show_on_calendar: event.show_on_calendar,
      is_core_event: event.is_core_event,
      eventType: event.record_passed_review?.event_type,
      eventLink: event.record_passed_review?.main_url,
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
                        {
                          events.filter(e => {
                            const hasUpdate = e.record_needs_review && e.record_passed_review
                            const isNew = e.record_needs_review

                            if ((isNew || hasUpdate) && !e.reviewed) {
                              return true
                            }
                            return false
                          }).length
                        }
                      </div>
                      <div className="text-sm text-yellow-600">Need Review</div>
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
                    All Events (including "reviewed")
                  </button>
                  <button
                    onClick={() => setStatusFilter('needs_review')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'needs_review'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    New and updated events (
                    {
                      events.filter(e => {
                        const hasUpdate = e.record_needs_review && e.record_passed_review
                        const isNew = e.record_needs_review

                        if ((isNew || hasUpdate) && !e.reviewed) {
                          return true
                        }
                        return false
                      }).length
                    }
                    )
                  </button>
                  {/* <button
                    onClick={() => setStatusFilter('changes_need_review')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === 'changes_need_review'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Updated Records ({events.filter(e => !!e.record_needs_review && !!e.record_passed_review).length})
                  </button> */}
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
                                const isEditingOverride = editingAdminOverride.has(event.id)

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

                                        {/* Contact Email */}
                                        {event.contact && (
                                          <div className="mt-1">
                                            <span className="text-xs text-blue-600 font-medium">Contact: </span>
                                            <span className="text-xs text-gray-700">{event.contact}</span>
                                          </div>
                                        )}

                                        {!event.contact && recordData.organizer && recordData.organizer.contact && (
                                          <div className="mt-1">
                                            <span className="text-xs text-blue-600 font-medium">Contact: </span>
                                            <span className="text-xs text-gray-700">
                                              {recordData.organizer.contact}
                                            </span>
                                          </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="mt-1 space-y-1">
                                          {hasChanges ? (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                              Updated - Needs Review
                                            </span>
                                          ) : needsReview ? (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                              Not Reviewed
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
                                          {/* {event.reviewed && (
                                            <div>
                                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                Has been reviewed
                                              </span>
                                            </div>
                                          )} */}
                                        </div>
                                      </div>

                                      <div className="lg:col-span-5">
                                        {hasChanges ? (
                                          <div className="space-y-2">
                                            <div className="bg-green-50 rounded-md p-3 max-h-32 overflow-y-auto relative">
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-medium text-green-800">
                                                  ✓ Currently Live (Approved):
                                                </div>
                                                <button
                                                  onClick={() =>
                                                    handleExpandJson(
                                                      'Currently Live (Approved)',
                                                      event.record_passed_review
                                                    )
                                                  }
                                                  className="text-xs text-green-600 hover:text-green-800 underline"
                                                >
                                                  Expand
                                                </button>
                                              </div>
                                              <pre className="text-xs text-green-700 whitespace-pre-wrap break-words">
                                                {JSON.stringify(event.record_passed_review, null, 2)}
                                              </pre>
                                            </div>
                                            <div className="bg-orange-50 rounded-md p-3 max-h-32 overflow-y-auto relative">
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-medium text-orange-800">
                                                  📝 Latest Update (Needs Review):
                                                </div>
                                                <button
                                                  onClick={() =>
                                                    handleExpandJson(
                                                      'Latest Update (Needs Review)',
                                                      event.record_needs_review
                                                    )
                                                  }
                                                  className="text-xs text-orange-600 hover:text-orange-800 underline"
                                                >
                                                  Expand
                                                </button>
                                              </div>
                                              <pre className="text-xs text-orange-700 whitespace-pre-wrap break-words">
                                                {JSON.stringify(event.record_needs_review, null, 2)}
                                              </pre>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto relative">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="text-xs font-medium text-gray-700">Event Data:</div>
                                              <button
                                                onClick={() => handleExpandJson('Event Data', recordData)}
                                                className="text-xs text-gray-600 hover:text-gray-800 underline"
                                              >
                                                Expand
                                              </button>
                                            </div>
                                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                              {JSON.stringify(recordData, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>

                                      <div className="lg:col-span-4 gap-2 flex flex-col">
                                        {/* Review Actions */}
                                        {(hasChanges || !isApproved) && (
                                          <div className="flex mb-2">
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
                                          <span className="ml-2 text-sm text-gray-600">
                                            Reviewed (removes event from "new and updated" list)
                                          </span>
                                        </label>

                                        {/* Core Event Toggle */}

                                        <label className="inline-flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={!!event.is_core_event}
                                            disabled={!isApproved}
                                            onChange={e =>
                                              handleToggleCoreEvent(event.id, 'is_core_event', e.target.checked)
                                            }
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                          />
                                          <span
                                            className={`ml-2 text-sm ${isApproved ? 'text-gray-600' : 'text-gray-400'}`}
                                          >
                                            Core Event
                                          </span>
                                          {!isApproved && (
                                            <p className="text-xs text-gray-500 mx-1">
                                              (
                                              {needsReview
                                                ? 'Approve record first'
                                                : 'Only approved records can be shown on calendar'}
                                              )
                                            </p>
                                          )}
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
                                          {!isApproved && (
                                            <p className="text-xs text-gray-500 mx-1">
                                              (
                                              {needsReview
                                                ? 'Approve record first'
                                                : 'Only approved records can be shown on calendar'}
                                              )
                                            </p>
                                          )}
                                        </label>

                                        {/* {!isApproved && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {needsReview
                                              ? 'Approve record first'
                                              : 'Only approved records can be shown on calendar'}
                                          </p>
                                        )} */}

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

                                        {/* Admin Override Section */}
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-gray-700">Admin Override (JSON)</h4>
                                            {!isEditingOverride && (
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() =>
                                                    toggleAdminOverrideEdit(event.id, event.admin_override)
                                                  }
                                                  className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                  {event.admin_override ? 'Edit' : 'Add Override'}
                                                </button>
                                                {event.admin_override && (
                                                  <button
                                                    onClick={() => handleRemoveAdminOverride(event.id)}
                                                    className="text-xs text-red-600 hover:text-red-800"
                                                  >
                                                    Remove Override
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {isEditingOverride ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={adminOverrideValues[event.id] || ''}
                                                onChange={e => handleAdminOverrideChange(event.id, e.target.value)}
                                                placeholder='Enter JSON object, e.g. {"priority": 10, "featured": true}'
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical min-h-[120px] font-mono"
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() => handleSaveAdminOverride(event.id)}
                                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => handleCancelAdminOverrideEdit(event.id)}
                                                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : event.admin_override ? (
                                            <div className="bg-yellow-50 rounded-md p-3 max-h-32 overflow-y-auto">
                                              <pre className="text-xs text-yellow-700 whitespace-pre-wrap break-words font-mono">
                                                {JSON.stringify(event.admin_override, null, 2)}
                                              </pre>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-500 italic">No admin override set</p>
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
                <NewSchedule events={formattedEvents} viewMode="grid" />
              </div>

              {/* JSON Expansion Dialog */}
              <Dialog open={expandedJson.isOpen} onOpenChange={handleCloseJsonDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{expandedJson.title}</h3>
                      <button onClick={handleCloseJsonDialog} className="text-gray-400 hover:text-gray-600">
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-50 rounded-md p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {JSON.stringify(expandedJson.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
