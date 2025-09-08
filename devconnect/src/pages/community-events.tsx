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
import { Toaster, toast } from 'lib/components/ui/sonner'
import { ArrowRight } from 'lucide-react'
import atpAgent, { Agent, AtpAgent } from '@atproto/api'
import Button from 'common/components/voxel-button/button'
import { schema } from 'atproto-slurper/slurper/schema'
import { supabase } from 'common/supabaseClient'
import { Sha256 } from '@aws-crypto/sha256-browser'
import moment from 'moment'
import NewSchedule from 'lib/components/event-schedule-new'
import { atprotoToCalendarFormat } from 'lib/components/event-schedule-new/atproto-to-calendar-format'

// Dynamic imports to avoid SSR issues
let BrowserOAuthClient: any = null
let oauthClient: any = null

// Load OAuth client only on client side
const loadOAuthClient = async () => {
  if (typeof window === 'undefined') return null

  if (!BrowserOAuthClient) {
    // no navigator on server side...
    const { BrowserOAuthClient: Client } = await import('@atproto/oauth-client-browser')
    BrowserOAuthClient = Client
  }

  return BrowserOAuthClient
}

const getOAuthClient = async () => {
  const Client = await loadOAuthClient()
  if (!Client) return null

  // Development mode for localhost - use the load method for URL format
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('development oauth flow')
    // Use the load method when providing a client metadata URL
    return await Client.load({
      handleResolver: 'https://bsky.social',
      // Use the special localhost URL format that allows custom redirect URIs
      clientId: `http://localhost?redirect_uri=${encodeURIComponent('http://127.0.0.1:3000/community-events')}`,
    })
  }

  // Production mode
  return new Client({
    handleResolver: 'https://bsky.social',
    clientMetadata: {
      client_id: 'https://devconnect.org/atproto/client.json',
      client_name: 'Devconnect Community Events',
      client_uri: 'https://devconnect.org',
      logo_uri: `https://devconnect.org/og-argentina.png`,
      tos_uri: `https://devconnect.org/terms`,
      policy_uri: `https://devconnect.org/privacy`,
      redirect_uris: [`https://devconnect.org/community-events`],
      scope: 'atproto transition:generic',
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
    if (!session) {
      throw new Error('No authenticated session available')
    }

    const agent = new Agent(session)

    const result = await agent.com.atproto.repo.putRecord({
      repo: session.sub,
      collection: 'org.devcon.event',
      rkey: record.title.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
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
  expertise: string
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
  show_time_of_day?: boolean
  tickets_url?: string
  socials?: {
    x_url?: string
    farcaster_url?: string
    discord_url?: string
    telegram_url?: string
    youtube_url?: string
    github_url?: string
    bluesky_url?: string
    lens_url?: string
  }
}

const defaultFormData =
  process.env.NODE_ENV === 'development'
    ? {
        start_utc: '2024-12-15T10:00:00Z',
        end_utc: '2024-12-15T18:00:00Z',
        title: 'Test Web3 Workshop',
        description:
          'An interactive workshop exploring the latest developments in Web3 technology, smart contracts, and decentralized applications. Perfect for developers looking to expand their blockchain knowledge.',
        main_url: 'https://example.com/test-workshop',
        organizer: {
          name: 'Test Organizer',
          contact: 'test@example.com',
        },
        location: {
          name: 'Innovation Hub Buenos Aires',
          address: '123 Test Street, Buenos Aires, Argentina',
        },
        event_type: 'workshop',
        expertise: 'intermediate',
        timeslots: [],
        image_url: 'https://example.com/workshop-image.png',
        requires_ticket: false,
        sold_out: false,
        capacity: 50,
        categories: ['devex', 'protocol'],
        search_tags: ['web3', 'blockchain', 'ethereum', 'smart-contracts'],
        show_time_of_day: true,
        tickets_url: 'https://example.com/tickets',
        socials: {
          x_url: 'https://twitter.com/testorganizer',
          farcaster_url: '',
          discord_url: 'https://discord.gg/testweb3',
          telegram_url: '',
          youtube_url: '',
          github_url: 'https://github.com/testorganizer',
          bluesky_url: '',
          lens_url: '',
        },
      }
    : {
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
        expertise: 'all welcome',
        timeslots: [],
        image_url: '',
        requires_ticket: false,
        sold_out: false,
        capacity: undefined,
        categories: [],
        search_tags: [],
        show_time_of_day: true,
        tickets_url: '',
        socials: {
          x_url: '',
          farcaster_url: '',
          discord_url: '',
          telegram_url: '',
          youtube_url: '',
          github_url: '',
          bluesky_url: '',
          lens_url: '',
        },
      }

const CommunityEvents = () => {
  const [oauthSession, setOauthSession] = useState<any>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [existingRecords, setExistingRecords] = useState<any[]>([])
  const [selectedRecord, setSelectedRecord] = useState<string>('')
  // Supabase auth state
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [magicLinkMessage, setMagicLinkMessage] = useState('')
  const [formData, setFormData] = useState<EventFormData>(defaultFormData)
  const [contact, setContact] = useState('')

  const [previewSelectedEvent, setPreviewSelectedEvent] = useState<any>(null)

  const [showOptionalSections, setShowOptionalSections] = useState({
    optional: false,
  })

  const eventTypes = schema.defs.main.record.properties.event_type.enum
  const expertiseLevels = schema.defs.main.record.properties.expertise.enum
  const eventCategories = schema.defs.main.record.properties.categories.items.enum

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

  const updateSocial = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socials: {
        ...prev.socials,
        [field]: value,
      },
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

  const handleRecordSelection = (recordIndex: string) => {
    setSelectedRecord(recordIndex)

    if (recordIndex === '') {
      // Reset to empty form or development defaults
      setFormData(defaultFormData)
      return
    }

    const selectedRecordData = existingRecords[parseInt(recordIndex)]
    if (selectedRecordData) {
      // Map the record data to form data, ensuring we have all required fields
      setFormData({
        start_utc: selectedRecordData.start_utc || '',
        end_utc: selectedRecordData.end_utc || '',
        title: selectedRecordData.title || '',
        description: selectedRecordData.description || '',
        main_url: selectedRecordData.main_url || '',
        organizer: {
          name: selectedRecordData.organizer?.name || '',
          contact: selectedRecordData.organizer?.contact || '',
        },
        location: {
          name: selectedRecordData.location?.name || '',
          address: selectedRecordData.location?.address || '',
        },
        event_type: selectedRecordData.event_type || '',
        expertise: selectedRecordData.expertise || 'all welcome',
        timeslots: selectedRecordData.timeslots || [],
        image_url: selectedRecordData.image_url || '',
        requires_ticket: selectedRecordData.requires_ticket || false,
        sold_out: selectedRecordData.sold_out || false,
        capacity: selectedRecordData.capacity || undefined,
        categories: selectedRecordData.categories || [],
        search_tags: selectedRecordData.search_tags || [],
        show_time_of_day: selectedRecordData.show_time_of_day || false,
        tickets_url: selectedRecordData.tickets_url || '',
        socials: {
          x_url: selectedRecordData.socials?.x_url || '',
          farcaster_url: selectedRecordData.socials?.farcaster_url || '',
          discord_url: selectedRecordData.socials?.discord_url || '',
          telegram_url: selectedRecordData.socials?.telegram_url || '',
          youtube_url: selectedRecordData.socials?.youtube_url || '',
          github_url: selectedRecordData.socials?.github_url || '',
          bluesky_url: selectedRecordData.socials?.bluesky_url || '',
          lens_url: selectedRecordData.socials?.lens_url || '',
        },
      })
    }
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
    if (!cleanedData.capacity) delete cleanedData.capacity
    if (!cleanedData.tickets_url) delete cleanedData.tickets_url

    // Remove empty social URLs
    if (cleanedData.socials) {
      const hasAnySocials = Object.values(cleanedData.socials).some(url => url && url.trim() !== '')
      if (!hasAnySocials) {
        delete cleanedData.socials
      }
    }

    console.log('Event data to submit:', cleanedData)
    // TODO: Submit to your API/backend
    // alert('Event submitted! Check console for data.')

    const { valid, error } = validate(cleanedData)

    if (!valid) {
      toast.error(error as string)

      return
    }

    // Use OAuth session if available, otherwise this would be a Supabase-only submission
    if (oauthSession) {
      const { success: oauthSuccess, error: oauthError } = await createEventWithOAuth(cleanedData, oauthSession)

      if (!oauthSuccess) {
        toast.error(oauthError as string)
        return
      }
    } else {
      const url =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:4000/event/create'
          : 'https://at-slurper.onrender.com/event/create'

      let token = typeof window !== 'undefined' ? localStorage.getItem('sb-mealmslwugsqqyoesrxd-auth-token') : null

      if (token) {
        token = JSON.parse(token).access_token
      }

      if (!token) {
        toast.error('Authentication error.')

        return
      }

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          event: cleanedData,
          contact,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Event submitted successfully!')
        console.log('Event submitted:', data)
      } else {
        toast.error('Event submission failed:' + data.error ? data.error : 'Unknown error')
        console.error('Event submission failed:', data)

        return
      }
    }

    setSuccess('Event submitted! Check console for data.')
  }

  // Check if user is authenticated (either method)
  const isAuthenticated = !!(oauthSession || supabaseUser)
  const currentUserProfile =
    userProfile ||
    (supabaseUser
      ? {
          handle: '',
          email: supabaseUser.email,
          displayName: supabaseUser.email,
        }
      : null)
  const showForm = isAuthenticated && currentUserProfile
  const eventPublished = !!success

  // Magic link authentication
  const startMagicLink = useCallback(async () => {
    try {
      setIsAuthenticating(true)
      setError('')
      setMagicLinkMessage('')

      // Get email from user input
      const email = prompt('Enter your email address:')
      if (!email) {
        setIsAuthenticating(false)
        return
      }

      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/community-events`,
        },
      })

      if (error) {
        setError('Failed to send magic link: ' + error.message)
      } else {
        setMagicLinkMessage('Check your email for the magic link!')
      }
    } catch (error: any) {
      setError('Failed to send magic link: ' + error.message)
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Supabase auth state listener
  useEffect(() => {
    if (!isClient) return

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        setMagicLinkMessage('')
        setError('')
      }
    })

    // Check initial session
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUser(data.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [isClient])

  // Check for existing OAuth session on component mount
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

          const agent = new Agent(session)

          // Use session.server directly - it's already an authenticated agent
          const profile = await agent.getProfile({
            actor: session.sub,
          })

          setUserProfile(profile.data)

          if (state) {
            console.log(`${session.sub} was successfully authenticated (state: ${state})`)
          } else {
            console.log(`${session.sub} was restored (last active session)`)
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
      // Sign out from both services
      if (oauthSession && oauthClient) {
        await oauthClient.revoke()
      }
      if (supabaseUser) {
        await supabase.auth.signOut()
      }

      setOauthSession(null)
      setUserProfile(null)
      setSupabaseUser(null)
      setExistingRecords([])
      setSelectedRecord('')
      setSuccess('')
      setFormData(defaultFormData)
      setMagicLinkMessage('')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      window.location.reload()
    }
  }, [oauthSession, supabaseUser])

  // Fetch events from AT protocol if logged in
  useEffect(() => {
    const fetchEvents = async () => {
      if (!userProfile && !supabaseUser) return

      const agent = new AtpAgent({ service: 'https://bsky.social' })

      let events: any[] = []

      const devconnectDid = 'did:plc:l26dgtpir4fydulvmuoee2sn'

      // If user is logged in with email, hash the email to get the prefix specific to that user (need it to filter out other users' events)
      if (supabaseUser) {
        const did = devconnectDid
        const email = supabaseUser.email
        const hash = new Sha256()
        hash.update(email)
        const result = await hash.digest()
        const userID = Array.from(result)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 16)

        const response = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: 'org.devcon.event',
        })

        events = response.data.records
          .filter((record: any) => {
            const rkey = record.uri.split('/').pop()
            const rkeyExpected = `${userID}-${record.value.title.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`

            return rkey === rkeyExpected
          })
          .map((record: any) => record.value)
      }

      if (userProfile) {
        const did = userProfile?.did

        const response = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: 'org.devcon.event',
        })

        events = response.data.records
          .filter((record: any) => {
            // If the user is not our internally owned did, just return everything
            if (did !== devconnectDid) {
              return true
            }

            // example: c7730c507a50c8ab-zktls-day
            const rkey = record.uri.split('/').pop()

            // Insanely ridiculous heuristic to filter out events that are not directly submitted by us (via our email submission flow)
            // Return true for events that do NOT start with hash-dash pattern
            // Hash pattern: exactly 16 characters with at least one number, followed by a dash
            const hashDashPattern = /^.{16}-/
            const hasNumber = /\d/
            const prefix = rkey.substring(0, 16)
            const isHashPattern = hashDashPattern.test(rkey) && hasNumber.test(prefix)
            return !isHashPattern
          })
          .map((record: any) => record.value)
      }

      setExistingRecords(events)
    }

    fetchEvents()
  }, [userProfile, supabaseUser])

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
              Your event <b>{formData.title}</b> has been published{' '}
              <Link
                href={`https://bsky.app/profile/${userProfile?.handle}`}
                className="underline font-bold generic text-blue-500"
              >
                {userProfile?.handle}
              </Link>
              .
            </p>
            <p>You can edit it at any time by republishing with the same credentials and event title.</p>
            <Button onClick={() => setSuccess('')}>Submit another event</Button>
          </div>
        )}

        {!eventPublished && (
          <div className="bg-white p-6 mb-6 rounded-lg border border-solid border-gray-500 shadow-lg flex flex-col gap-2">
            <p className="text-gray-800 font-bold text-2xl font-secondary mb-1">Submit your event for Devconnect ARG</p>

            <p className="text-gray-800">
              We use <b>AT Protocol</b> to power our events calendar — it notifies the Devconnect team about your event
              and makes your event data available for others in the community to build their own community calendars
            </p>

            <p className="text-gray-800 mb-2">
              If you sign in with email, we will post your event data to AT protocol on your behalf when you submit this
              form. After submitting, you can edit by submitting again with the same credentials and event title.
            </p>
            <p className="text-gray-800 mb-2 text-sm italic">
              Optional: we also allow you to connect your{' '}
              <Link href="https://bsky.app" className="underline font-bold generic text-blue-500">
                Bluesky account
              </Link>{' '}
              and post to your existing bluesky pds, or use a custom pds server and account details (harder; for
              experts).
            </p>

            <FAQComponent
              questions={[
                {
                  question: 'Why AT protocol?',
                  answer:
                    'AT protocol is an open protocol that lets its users create and manage their own data. For us, among other things, it presents a way to decentralize the ownership of Devconnect; anyone can submit an event to AT protocol, and anyone will be able to access it - this encourages a community-driven approach to event discovery, where anyone can build their own Devconnect calendar.',
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
              Authentication {isAuthenticated ? '(Connected)' : '(Required)'}
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

            {isClient && !isAuthenticated && !isAuthenticating && (
              <div className="space-y-4">
                <p className="text-gray-700">
                  <b>Login with Email</b> or connect your <b>Bluesky account</b> to submit events to AT Protocol.
                </p>

                {magicLinkMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800">{magicLinkMessage}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={startMagicLink}
                    disabled={isAuthenticating}
                    size="sm"
                    className={cn('', 'disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2')}
                  >
                    {isAuthenticating ? (
                      'Sending...'
                    ) : (
                      <>
                        Login with Email
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={startOAuthFlow}
                    disabled={isAuthenticating}
                    size="sm"
                    className={cn('', 'disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2')}
                  >
                    {isAuthenticating ? (
                      'Connecting...'
                    ) : (
                      <>
                        Connect with Bluesky
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isClient && isAuthenticated && currentUserProfile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentUserProfile.avatar && (
                      <img src={currentUserProfile.avatar} alt="Profile" className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">
                        {currentUserProfile.displayName || currentUserProfile.handle || currentUserProfile.email}
                      </p>
                      {currentUserProfile.handle && (
                        <p className="text-sm text-gray-600">
                          {currentUserProfile.handle ? `@${currentUserProfile.handle}` : currentUserProfile.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {oauthSession ? 'Connected via Bluesky' : 'Connected via Email'}
                      </p>
                    </div>
                  </div>
                  <button onClick={signOut} className="text-red-600 hover:text-red-800 text-sm underline">
                    Sign Out
                  </button>
                </div>

                {existingRecords.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Previously submitted events:</label>
                    <select
                      value={selectedRecord}
                      onChange={e => handleRecordSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Selection</option>
                      {existingRecords.map((record, index) => (
                        <option key={index} value={index.toString()}>
                          {record.title} - {new Date(record.start_utc).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select an existing event to edit, or keep "Create New Event" to start fresh
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-600 mt-4">✅ Connected and ready to submit events</p>
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
                    disabled={selectedRecord !== ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedRecord !== '' ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedRecord !== ''
                      ? 'Title cannot be changed when editing existing events (used as unique identifier)'
                      : 'Title of the event'}
                  </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time (in UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.start_utc)}
                    onChange={e => handleInputChange('start_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.start_utc && (
                    <p className="text-sm  mt-1">
                      <span className="font-medium">Argentina time:</span>{' '}
                      {formData.start_utc
                        ? moment.utc(formData.start_utc).subtract(3, 'hours').format('YYYY-MM-DD HH:mm')
                        : ''}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time (in UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.end_utc)}
                    onChange={e => handleInputChange('end_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.end_utc && (
                    <p className="text-sm  mt-1">
                      <span className="font-medium">Argentina time:</span>{' '}
                      {formData.end_utc
                        ? moment.utc(formData.end_utc).subtract(3, 'hours').format('YYYY-MM-DD HH:mm')
                        : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.show_time_of_day || false}
                    onChange={e => handleInputChange('show_time_of_day', e.target.checked)}
                    className="mr-2"
                  />
                  Show time of day in calendar
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Whether to display start and end times for each day. You can further customize the specific times in
                  the timeslots field below if your start and end times are different for each day.{' '}
                </p>
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
                      value={formData.expertise}
                      onChange={e => handleInputChange('expertise', e.target.value)}
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
                      Public Contact (Email, Twitter, etc.)
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
                      <p className="text-xs text-gray-500 mt-1">Url referencing a banner image for this event.</p>
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
                    <div className="border-t py-6 border-gray-300 border-b border-solid">
                      <div className="flex gap-6 flex-wrap mb-4">
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tickets URL</label>
                        <input
                          type="url"
                          placeholder="https://example.com/tickets"
                          value={formData.tickets_url || ''}
                          onChange={e => handleInputChange('tickets_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          URL where attendees can purchase tickets for the event
                        </p>
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Time (in UTC) *
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.start_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'start_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {slot.start_utc && (
                                <p className="text-sm  mt-1">
                                  <span className="font-medium">Argentina time:</span>{' '}
                                  {slot.start_utc
                                    ? moment.utc(slot.start_utc).subtract(3, 'hours').format('YYYY-MM-DD HH:mm')
                                    : ''}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Time (in UTC) *
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.end_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'end_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {slot.end_utc && (
                                <p className="text-sm  mt-1">
                                  <span className="font-medium">Argentina time:</span>{' '}
                                  {slot.end_utc
                                    ? moment.utc(slot.end_utc).subtract(3, 'hours').format('YYYY-MM-DD HH:mm')
                                    : ''}
                                </p>
                              )}
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
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Social media platforms of the organizer</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X URL</label>
                        <input
                          type="url"
                          placeholder="https://twitter.com/username"
                          value={formData.socials?.x_url || ''}
                          onChange={e => updateSocial('x_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Farcaster URL</label>
                        <input
                          type="url"
                          placeholder="https://farcaster.xyz/username"
                          value={formData.socials?.farcaster_url || ''}
                          onChange={e => updateSocial('farcaster_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discord URL</label>
                        <input
                          type="url"
                          placeholder="https://discord.gg/invite"
                          value={formData.socials?.discord_url || ''}
                          onChange={e => updateSocial('discord_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telegram URL</label>
                        <input
                          type="url"
                          placeholder="https://t.me/username"
                          value={formData.socials?.telegram_url || ''}
                          onChange={e => updateSocial('telegram_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                        <input
                          type="url"
                          placeholder="https://youtube.com/@username"
                          value={formData.socials?.youtube_url || ''}
                          onChange={e => updateSocial('youtube_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                        <input
                          type="url"
                          placeholder="https://github.com/username"
                          value={formData.socials?.github_url || ''}
                          onChange={e => updateSocial('github_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bluesky URL</label>
                        <input
                          type="url"
                          placeholder="https://bsky.app/profile/username"
                          value={formData.socials?.bluesky_url || ''}
                          onChange={e => updateSocial('bluesky_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lens URL</label>
                        <input
                          type="url"
                          placeholder="https://lens.xyz/username"
                          value={formData.socials?.lens_url || ''}
                          onChange={e => updateSocial('lens_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg mt-6 w-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 font-secondary">
                Where should we contact you about your listing? *
              </h2>
              <input
                type="email"
                placeholder="example@email.com"
                value={contact}
                onChange={e => setContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs">
                To answer any questions we may have about your event after submission, please specify an email we can
                reach you at. This email can only be seen by the Devconnect team, and will not be made public. If you
                wish to add a public contact, do so in the form above under Organizer Information.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg mt-6 overflow-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 font-secondary">
                Preview of your event on the calendar
              </h2>

              <NewSchedule
                events={[
                  atprotoToCalendarFormat({
                    ...formData,
                    id: 'preview-event',
                    showTimeOfDay: formData.show_time_of_day,
                  }),
                ]}
                selectedEvent={previewSelectedEvent}
                selectedDay={null}
                setSelectedEvent={setPreviewSelectedEvent}
                setSelectedDay={() => {}}
              />

              {/* <p className="text-xs text-gray-500 mt-1">The preview is draggable if your event spans multiple days.</p> */}
            </div>

            <button
              type="submit"
              className={cn(
                'mt-6 mb-2 w-full border-solid border-b-[6px] group px-8 pr-6 py-2 border-[#125181] text-[white] text-lg bg-[#1B6FAE] hover:bg-[rgba(60,138,197,1)] transition-colors hover:border-opacity-0'
              )}
            >
              <div className="group-hover:translate-y-[3px] transition-transform flex items-center justify-center gap-2">
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
