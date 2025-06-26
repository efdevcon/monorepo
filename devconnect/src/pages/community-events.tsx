import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import css from './community-events.module.scss'
import Voxel from 'assets/images/ba/voxel-0.jpg'
import cn from 'classnames'
import Link from 'next/link'
import FAQComponent from 'common/components/faq/faq'
import CommunityEvent from 'assets/images/ba/community-event-text.png'
import validate from 'atproto-slurper/slurper/validate'
import { Toaster, toast } from '@/components/ui/sonner'
import { ArrowRight } from 'lucide-react'

// Dynamic import to avoid SSR issues
let BrowserOAuthClient: any = null
let oauthClient: any = null

// Load OAuth client only on client side
const loadOAuthClient = async () => {
  if (typeof window === 'undefined') return null

  if (!BrowserOAuthClient) {
    const { BrowserOAuthClient: Client } = await import('@atproto/oauth-client-browser')
    BrowserOAuthClient = Client
  }

  return BrowserOAuthClient
}

const getOAuthClient = async () => {
  const Client = await loadOAuthClient()
  if (!Client) return null

  // Development mode for localhost (no client metadata hosting required)
  // if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  //   return new Client({
  //     handleResolver: 'https://bsky.social',
  //     // For localhost development, no client metadata is needed
  //     clientMetadata: undefined,
  //   })
  // }

  // Option 2: Burn metadata into the application (recommended for performance)
  return new Client({
    handleResolver: 'https://bsky.social',
    clientMetadata: {
      client_id: `https://devconnect.org/atproto-oauth.json`,
      client_name: 'Devconnect Community Events',
      client_uri: 'https://devconnect.org',
      logo_uri: `https://devconnect.org/og-argentina.png`,
      tos_uri: `https://devconnect.org/terms`,
      policy_uri: `https://devconnect.org/privacy`,
      redirect_uris: [`https://devconnect.org/community-events`],
      scope: 'atproto',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
  })
}

const createEventWithOAuth = async (record: any, session: any) => {
  console.log(record, 'record to create')

  try {
    if (!session || !session.agent) {
      throw new Error('No authenticated session available')
    }

    const result = await session.agent.api.com.atproto.repo.putRecord({
      repo: session.did,
      collection: 'org.devcon.event',
      rkey: record.title.toLowerCase().replace(/ /g, '-'),
      record,
    })

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

interface EventFormData {
  // Required fields
  start_utc: string
  end_utc: string
  title: string
  description: string
  main_url: string
  organizer: {
    name: string
    contact?: string
  }
  location: {
    name: string
    address?: string
  }
  event_type: string
  expertise_level: string
  // Optional fields (previously in metadata)
  timeslots?: Array<{
    start_utc: string
    end_utc: string
    title: string
    description?: string
    event_uri?: string
  }>
  image_url?: string
  requires_ticket?: boolean
  sold_out?: boolean
  capacity?: number
  categories?: string[]
  search_tags?: string[]
  socials?: Array<{
    platform: string
    url: string
  }>
}

const CommunityEvents = () => {
  const [oauthSession, setOauthSession] = useState<any>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    start_utc: '',
    end_utc: '',
    title: '',
    description: '',
    main_url: '',
    organizer: {
      name: '',
      contact: '',
    },
    location: {
      name: '',
      address: '',
    },
    event_type: '',
    expertise_level: 'all welcome',
    timeslots: [],
    image_url: '',
    requires_ticket: false,
    sold_out: false,
    capacity: undefined,
    categories: [],
    search_tags: [],
    socials: [],
  })

  const [showOptionalSections, setShowOptionalSections] = useState({
    optional: false,
  })

  const expertiseLevels = ['all welcome', 'beginner', 'intermediate', 'expert', 'other']
  const eventTypes = [
    'talks',
    'discussion',
    'presentation',
    'hackathon',
    'workshop',
    'panel',
    'mixed format',
    'social',
    'other',
  ]
  const eventCategories = [
    'real world ethereum',
    'defi',
    'cypherpunk & privacy',
    'security',
    'ai',
    'protocol',
    'devex',
    'usability',
    'applied cryptography',
    'coordination',
    'scalability',
    'other',
  ]

  // Helper functions for datetime conversion
  const formatDateTimeForInput = (isoString: string): string => {
    if (!isoString) return ''
    // Convert from "2024-03-20T10:00:00Z" to "2024-03-20T10:00"
    return isoString.slice(0, 16)
  }

  const formatDateTimeFromInput = (inputValue: string): string => {
    if (!inputValue) return ''
    // Convert from "2024-03-20T10:00" to "2024-03-20T10:00:00Z"
    return inputValue + ':00Z'
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = (prev[parent as keyof EventFormData] as Record<string, any>) || {}
      return {
        ...prev,
        [parent]: {
          ...parentObj,
          [field]: value,
        },
      }
    })
  }

  const addTimeslot = () => {
    setFormData(prev => ({
      ...prev,
      timeslots: [
        ...(prev.timeslots || []),
        {
          start_utc: '',
          end_utc: '',
          title: '',
          description: '',
          event_uri: '',
        },
      ],
    }))
  }

  const removeTimeslot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      timeslots: prev.timeslots?.filter((_, i) => i !== index),
    }))
  }

  const updateTimeslot = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      timeslots: prev.timeslots?.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    }))
  }

  const addSocial = () => {
    setFormData(prev => ({
      ...prev,
      socials: [...(prev.socials || []), { platform: '', url: '' }],
    }))
  }

  const removeSocial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials?.filter((_, i) => i !== index),
    }))
  }

  const updateSocial = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials?.map((social, i) => (i === index ? { ...social, [field]: value } : social)),
    }))
  }

  const handleArrayInputChange = (field: string, value: string) => {
    const arrayValue = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item)
    setFormData(prev => ({
      ...prev,
      [field]: arrayValue,
    }))
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFormData(prev => {
      const currentCategories = prev.categories || []
      const newCategories = checked
        ? [...currentCategories, category]
        : currentCategories.filter(cat => cat !== category)

      return {
        ...prev,
        categories: newCategories,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clean up the data before submission - remove empty optional fields
    const cleanedData = {
      ...formData,
      $type: 'org.devcon.event',
    }

    // Remove empty timeslots
    if (!cleanedData.timeslots?.length) {
      delete cleanedData.timeslots
    }

    // Remove empty optional fields
    if (!cleanedData.image_url) delete cleanedData.image_url
    if (!cleanedData.categories?.length) delete cleanedData.categories
    if (!cleanedData.search_tags?.length) delete cleanedData.search_tags
    if (!cleanedData.socials?.length) delete cleanedData.socials
    if (!cleanedData.capacity) delete cleanedData.capacity

    console.log('Event data to submit:', cleanedData)
    // TODO: Submit to your API/backend
    // alert('Event submitted! Check console for data.')

    const { valid, error } = validate(cleanedData)

    if (!valid) {
      toast.error(error as string)

      return
    }

    const { success: oauthSuccess, error: oauthError } = await createEventWithOAuth(cleanedData, oauthSession)

    if (!oauthSuccess) {
      toast.error(oauthError as string)

      return
    }

    setSuccess('Event submitted! Check console for data.')
  }

  const showForm = oauthSession && userProfile
  const eventPublished = !!success

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check for existing session on component mount
  useEffect(() => {
    if (!isClient) return

    const initializeOAuth = async () => {
      try {
        setIsAuthenticating(true)

        // Initialize OAuth client
        if (!oauthClient) {
          oauthClient = await getOAuthClient()
        }

        // Skip if OAuth client couldn't be initialized (SSR or other issues)
        if (!oauthClient) {
          console.log('OAuth client not available (likely SSR)')
          return
        }

        // Initialize the client (this must be done once when the app loads)
        const result = await oauthClient.init()

        if (result) {
          const { session, state } = result
          setOauthSession(session)

          // Fetch user profile
          const profile = await session.agent.api.app.bsky.actor.getProfile({
            actor: session.did,
          })
          setUserProfile(profile.data)

          if (state) {
            console.log(`${session.did} was successfully authenticated (state: ${state})`)
          } else {
            console.log(`${session.did} was restored (last active session)`)
          }
        }
      } catch (error) {
        console.error('OAuth initialization error:', error)
        setError('Failed to initialize authentication')
      } finally {
        setIsAuthenticating(false)
      }
    }

    initializeOAuth()
  }, [isClient])

  const startOAuthFlow = useCallback(async () => {
    try {
      setIsAuthenticating(true)
      setError('')

      // Get handle from user input
      const handle = prompt('Enter your Bluesky handle (e.g., alice.bsky.social):')
      if (!handle) {
        setIsAuthenticating(false)
        return
      }

      // Initialize client if not already done
      if (!oauthClient) {
        oauthClient = await getOAuthClient()
      }

      // Check if client is available
      if (!oauthClient) {
        throw new Error('OAuth client not available')
      }

      // Start OAuth flow with the provided handle
      await oauthClient.signIn(handle, {
        state: 'community-events-form',
      })

      // This code will never execute because the user gets redirected
      console.log('Never executed')
    } catch (error: any) {
      console.error('OAuth flow error:', error)
      setError('Failed to start authentication: ' + error.message)
      setIsAuthenticating(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (oauthSession && oauthClient) {
        await oauthClient.revoke()
      }
      setOauthSession(null)
      setUserProfile(null)
      setSuccess('')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [oauthSession])

  return (
    <div className="flex flex-col justify-between relative">
      <Toaster
        style={
          {
            '--normal-bg': 'white',
            '--normal-text': 'black',
            '--normal-border': 'black',
          } as React.CSSProperties
        }
      />
      <Header active fadeOutOnScroll />
      <div
        className={cn(
          css.form,
          'w-[600px] max-w-[calc(100%-2rem)] mx-auto  flex-1 my-32 mt-32 pb-8 z-10 flex flex-col items-center justify-center relative'
        )}
      >
        {error && <p className="text-red-500">{error}</p>}
        <Image
          src={CommunityEvent}
          alt="Community Event"
          className="w-[70%] mb-1 translate-x-[-3%] self-start hidden lg:block"
        />

        {eventPublished && (
          <div className="bg-white p-6 mb-6 rounded-lg border border-solid border-gray-500 shadow-lg flex flex-col gap-2 w-full">
            <p className=" font-bold text-2xl font-secondary mb-1">Event submitted!</p>
            <p className="">
              Your event <b>{formData.title}</b> has been published to AT protocol with the handle{' '}
              <Link
                href={`https://bsky.app/profile/${userProfile?.handle}`}
                className="underline font-bold generic text-blue-500"
              >
                {userProfile?.handle}
              </Link>
              .
            </p>
            <p>You can edit it at any time by republishing with the same credentials and event title.</p>
          </div>
        )}

        {!eventPublished && (
          <div className="bg-white p-6 mb-6 rounded-lg border border-solid border-gray-500 shadow-lg flex flex-col gap-2">
            <p className="text-gray-800 font-bold text-2xl font-secondary mb-1">Submit your event for Devconnect ARG</p>

            <p className="text-gray-800">
              We use <b>AT Protocol</b> to power our events calendar — it notifies the Devconnect team about your event
              and makes your event data available for others in the community to build their own community calendars
            </p>

            <p className="text-gray-800 mb-3">
              <b>To submit your event, you will need a</b>{' '}
              <Link href="https://bsky.app" className="underline font-bold generic text-blue-500">
                Bluesky account
              </Link>{' '}
              (easiest; anyone can do it), or a custom pds server and account details (hardest; for experts).
            </p>

            <FAQComponent
              questions={[
                {
                  question: 'Why AT protocol?',
                  answer:
                    'AT protocol is a protocol that lets you create and manage your own data. For us, among other things, it presents a way to decentralize the ownership of Devconnect; anyone can submit an event to AT protocol, and anyone will be able to access it - this encourages a community-driven approach to event discovery, where anyone can build their own Devconnect calendar.',
                },
                {
                  question: 'Can my event be featured on the Devconnect website?',
                  answer:
                    'Submitting your event here is no guarantee that it will be featured on the Devconnect website. We curate events submitted to AT protocol, and we will feature your event if it is a good fit. We encourage anyone to create community calendars that can feature events by the criteria of their choosing.',
                },
              ]}
            />
          </div>
        )}

        {!eventPublished && (
          <div className="bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg mb-6 w-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 font-secondary">
              Authentication {oauthSession ? '(Connected)' : '(Required)'}
            </h2>

            {!isClient && (
              <div className="flex items-center justify-center py-4">
                <div className="text-gray-600">Loading authentication...</div>
              </div>
            )}

            {isClient && isAuthenticating && (
              <div className="flex items-center justify-center py-4">
                <div className="text-gray-600">Authenticating...</div>
              </div>
            )}

            {isClient && !oauthSession && !isAuthenticating && (
              <div className="space-y-4">
                <p className="text-gray-700">Connect your Bluesky account to submit events to AT Protocol.</p>
                <button
                  onClick={startOAuthFlow}
                  disabled={isAuthenticating}
                  className={cn(
                    'px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                  )}
                >
                  {isAuthenticating ? (
                    'Connecting...'
                  ) : (
                    <>
                      Connect with Bluesky
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {isClient && oauthSession && userProfile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {userProfile.avatar && (
                      <img src={userProfile.avatar} alt="Profile" className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{userProfile.displayName || userProfile.handle}</p>
                      <p className="text-sm text-gray-600">@{userProfile.handle}</p>
                    </div>
                  </div>
                  <button onClick={signOut} className="text-red-600 hover:text-red-800 text-sm underline">
                    Sign Out
                  </button>
                </div>
                <p className="text-sm text-gray-600">✅ Connected and ready to submit events</p>
              </div>
            )}
          </div>
        )}

        {!eventPublished && (
          <form onSubmit={handleSubmit} className={cn(showForm ? 'block' : 'hidden')}>
            {/* Required Fields */}
            <div className="bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 font-secondary">Event Details (Required)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Title of the event</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Website/URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="e.g., https://example.com or https://twitter.com/event"
                    value={formData.main_url}
                    onChange={e => handleInputChange('main_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Main web property of the event (e.g. website or twitter profile)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.start_utc)}
                    onChange={e => handleInputChange('start_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Start time of the entire event in UTC (use the 'timeslots' field for granular scheduling)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.end_utc)}
                    onChange={e => handleInputChange('end_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    End time of the entire event in UTC (use the 'timeslots' field for granular scheduling)
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Description of the event</p>
              </div>

              {/* Event Type and Expertise Level */}
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Type *</label>
                    <select
                      required
                      value={formData.event_type}
                      onChange={e => handleInputChange('event_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select event type</option>
                      {eventTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Type of event, e.g. conference, talks, hackathon, etc.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expertise Level *</label>
                    <select
                      required
                      value={formData.expertise_level}
                      onChange={e => handleInputChange('expertise_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {expertiseLevels.map(level => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Expertise level of the event</p>
                  </div>
                </div>
              </div>

              {/* Organizer Fields */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 font-secondary">Organizer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.organizer.name}
                      onChange={e => handleNestedChange('organizer', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name of the event organizer</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact (Email, Twitter, etc.)
                    </label>
                    <input
                      type="text"
                      value={formData.organizer.contact}
                      onChange={e => handleNestedChange('organizer', 'contact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact of the organizer (email, twitter, etc.)</p>
                  </div>
                </div>
              </div>

              {/* Location Fields */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 font-secondary">Location Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.location.name}
                      onChange={e => handleNestedChange('location', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name of the location</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.location.address}
                      onChange={e => handleNestedChange('location', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Address of the location</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 font-secondary">
                  Additional Information (Optional)
                </h2>
                <button
                  type="button"
                  onClick={() => setShowOptionalSections(prev => ({ ...prev, optional: !prev.optional }))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showOptionalSections.optional ? 'Hide' : 'Show'}
                </button>
              </div>

              {showOptionalSections.optional && (
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.capacity || ''}
                        onChange={e => handleInputChange('capacity', parseInt(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">How many people can attend the event</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                      <input
                        type="url"
                        value={formData.image_url || ''}
                        onChange={e => handleInputChange('image_url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Url referencing an image for this event. Image should be .png, squared, and we suggest at least
                        1024x1024px.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                    <div className="space-y-2">
                      {eventCategories.map(category => (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.categories?.includes(category) || false}
                            onChange={e => handleCategoryChange(category, e.target.checked)}
                            className="mr-2"
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Categories of the event (e.g. defi, privacy, security, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ethereum, blockchain, crypto"
                      value={formData.search_tags?.join(', ') || ''}
                      onChange={e => handleArrayInputChange('search_tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Searching tags for the event</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex gap-6 border-t py-6 border-gray-300 border-b border-solid">
                      <div className="flex flex-col">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.requires_ticket || false}
                            onChange={e => handleInputChange('requires_ticket', e.target.checked)}
                            className="mr-2"
                          />
                          Requires ticket
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Whether the event requires tickets</p>
                      </div>

                      <div className="flex flex-col">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.sold_out || false}
                            onChange={e => handleInputChange('sold_out', e.target.checked)}
                            className="mr-2"
                          />
                          Sold out
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Whether the event is sold out</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">Timeslots</h3>
                      <button type="button" onClick={addTimeslot} className="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Timeslot
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Optional event timeslots - this may be useful for events that span multiple days, need to specify
                      timeslots for each day, or otherwise need more granular scheduling.
                    </p>

                    <div className="space-y-4">
                      {formData.timeslots?.map((slot, index) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium">Timeslot {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeTimeslot(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (UTC) *</label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.start_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'start_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Start of the timeslot in UTC</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (UTC) *</label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.end_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'end_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">End of the timeslot in UTC</p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                              <input
                                type="text"
                                required
                                value={slot.title}
                                onChange={e => updateTimeslot(index, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Title of the timeslot</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (optional)
                              </label>
                              <textarea
                                rows={2}
                                value={slot.description}
                                onChange={e => updateTimeslot(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Description of the timeslot</p>
                            </div>

                            {/* <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event URI (optional)</label>
                            <input
                              type="text"
                              value={slot.event_uri}
                              onChange={e => updateTimeslot(index, 'event_uri', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              If the timeslot is a more intricate/detailed event that needs more than the basic title
                              and description, this would refer to the atproto record key of that event
                            </p>
                          </div> */}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">Social Media Links</h3>
                      <button type="button" onClick={addSocial} className="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Social
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Array of social media platforms with platform name and URL
                    </p>

                    {formData.socials?.map((social, index) => (
                      <div key={index} className="flex gap-4 mb-3">
                        <input
                          type="text"
                          placeholder="Platform (e.g., Twitter, Discord)"
                          value={social.platform}
                          onChange={e => updateSocial(index, 'platform', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="url"
                          placeholder="URL"
                          value={social.url}
                          onChange={e => updateSocial(index, 'url', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeSocial(index)}
                          className="text-red-600 hover:text-red-800 px-3"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className={cn(
                'mt-6 mb-2 w-full border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-lg bg-[#1B6FAE] hover:bg-[rgba(60,138,197,1)] transition-colors hover:border-opacity-0'
              )}
            >
              <div className="group-hover:translate-y-[3px] transition-transform uppercase flex items-center justify-center gap-2">
                Submit Event <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </form>
        )}
      </div>

      <Image src={Voxel} alt="Voxel" className="object-cover fixed top-0 left-0 w-screen h-screen" />

      <Footer />
    </div>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
    },
  }
}
export default withTranslations(CommunityEvents)
