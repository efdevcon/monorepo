'use client'

import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { init, doConnect, ParcnetAPI, InitContext } from '@parcnet-js/app-connector'
import { pod, PODData } from '@parcnet-js/podspec'
import { POD } from '@pcd/pod'

// Zupass configuration
const ZUPASS_URL = 'https://zupass.org'
const ZAPP = {
  name: 'Devconnect App',
  permissions: {
    REQUEST_PROOF: { collections: ['Devconnect ARG'] },
    READ_PUBLIC_IDENTIFIERS: {},
    READ_POD: { collections: ['Devconnect ARG'] },
  },
}

// Dynamic imports to avoid webpack issues
let ClientConnectionState: Record<string, string> | null = null
let ParcnetClientProvider: unknown = null
let useParcnetClient: unknown = null

// Load Zupass modules dynamically
const loadZupassModules = async () => {
  try {
    console.log('Attempting to load Zupass modules...')
    
    // Try to import the module
    const zupassModule = await import('@parcnet-js/app-connector-react')
    console.log('Zupass module loaded successfully:', Object.keys(zupassModule))
    
    // Log the entire module to see what we got
    console.log('Full module:', zupassModule)
    
    // Check for specific exports
    const availableExports = [
      'ClientConnectionState',
      'ParcnetClientProvider', 
      'useParcnetClient',
      'Toolbar'
    ]
    
    availableExports.forEach(exportName => {
      if ((zupassModule as Record<string, unknown>)[exportName]) {
        console.log(`✅ ${exportName} found:`, (zupassModule as Record<string, unknown>)[exportName])
      } else {
        console.log(`❌ ${exportName} not found`)
      }
    })
    
    // Try to access all required modules
    const clientConnectionState = (zupassModule as Record<string, unknown>).ClientConnectionState
    const parcnetClientProvider = (zupassModule as Record<string, unknown>).ParcnetClientProvider
    const useParcnetClientHook = (zupassModule as Record<string, unknown>).useParcnetClient
    
    if (clientConnectionState && parcnetClientProvider && useParcnetClientHook) {
      ClientConnectionState = clientConnectionState as Record<string, string>
      ParcnetClientProvider = parcnetClientProvider
      useParcnetClient = useParcnetClientHook
      console.log('All Zupass modules loaded successfully!')
      console.log('ClientConnectionState:', ClientConnectionState)
      console.log('ParcnetClientProvider:', ParcnetClientProvider)
      console.log('useParcnetClient:', useParcnetClient)
      return true
    } else {
      console.warn('Some Zupass modules not found')
      console.log('Available exports:', Object.keys(zupassModule))
      return false
    }
    
  } catch (error) {
    console.error('Failed to load Zupass modules:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

export interface Ticket {
  ticketId: string
  attendeeName: string
  attendeeEmail: string
  productId: string
  ticketType: string
  ticketSecret: string
  isConsumed: boolean
  isRevoked: boolean
  signature: string
  signerPublicKey: string
}

export interface Collectible {
  id: string
  title: string
  description: string
  track: string
  imageUrl: string
  signature: string
  signerPublicKey: string
}

interface ZupassContext {
  loading: boolean
  error?: string
  publicKey: string
  connectionState: string | null
  zupassLoaded: boolean
  context?: InitContext
  Connect: (onboard: boolean) => void
  GetTicket: () => Promise<Ticket | undefined>
  GetSwag: () => Promise<Ticket[]>
  GetCollectibles: () => Promise<Collectible[]>
  RequestProof: () => Promise<Record<string, unknown>>
  VerifyProof: (proof: Record<string, unknown>) => Promise<boolean>
}

const defaultZupassContext: ZupassContext = {
  loading: false,
  error: '',
  publicKey: '',
  connectionState: null,
  zupassLoaded: false,
  context: undefined,
  Connect: () => {},
  GetTicket: () => Promise.resolve(undefined),
  GetSwag: () => Promise.resolve([]),
  GetCollectibles: () => Promise.resolve([]),
  RequestProof: () => Promise.resolve({}),
  VerifyProof: () => Promise.resolve(false),
}

const ZupassContext = createContext<ZupassContext>(defaultZupassContext)

export const useZupass = () => {
  const context = useContext(ZupassContext)
  if (!context) {
    throw new Error('useZupass must be used within a ZupassProvider')
  }

  return context
}

export function ZupassProvider(props: PropsWithChildren) {
  const ref = useRef<HTMLDivElement>(null)
  const [zupassLoaded, setZupassLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<ZupassContext>({
    loading: false,
    error: '',
    publicKey: '',
    connectionState: null,
    zupassLoaded: false,
    context: undefined,
    Connect,
    GetTicket,
    GetSwag,
    GetCollectibles,
    RequestProof,
    VerifyProof,
  })

  // Load Zupass modules on mount
  useEffect(() => {
    console.log('ZupassProvider: Starting module load...')
    loadZupassModules().then((success) => {
      console.log('ZupassProvider: Module load result:', success)
      console.log('ZupassProvider: Setting zupassLoaded to:', success)
      setZupassLoaded(success)
      setLoading(false)
      setContext(prevContext => {
        console.log('ZupassProvider: Updating context with zupassLoaded:', success)
        return { 
          ...prevContext, 
          zupassLoaded: success,
          loading: false 
        }
      })
    }).catch((error) => {
      console.error('ZupassProvider: Error loading modules:', error)
      setZupassLoaded(false)
      setLoading(false)
    })
  }, [])

  async function Connect(_onboard: boolean) {
    setContext(prevContext => ({ ...prevContext, loading: true }))

    console.log('Connecting to Zupass...', ZUPASS_URL, _onboard)
    
    try {
      let initContext = context.context
      if (!initContext) {
        console.log('Initializing Zupass context...')
        initContext = await init(ref.current as HTMLElement, ZUPASS_URL)
        setContext(prevContext => ({ ...prevContext, context: initContext }))
      }

      console.log('Connecting to Zupass with doConnect...')
      const zupass = await doConnect(ZAPP, initContext)
      const publicKey = await zupass.identity.getPublicKey()
      console.log('Zupass connected successfully, public key:', publicKey)

      if (_onboard) {
        console.log('Onboarding mode - retrieving ticket...')
        const ticket = await getRealTicketFromZupass(zupass)
        if (ticket) {
          const pod = POD.load(ticket.entries, ticket.signature, ticket.signerPublicKey)
          console.log('Ticket POD loaded and verified:', pod.verifySignature())
          localStorage.setItem('zupassTicket', JSON.stringify(mapToTicket(ticket)))
        }
      }

      localStorage.setItem('zupassPublicKey', publicKey)
      setContext(prevContext => ({ 
        ...prevContext, 
        loading: false, 
        error: '', 
        publicKey,
        connectionState: 'CONNECTED'
      }))
      
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">
            ✅ Zupass Connected Successfully!
          </div>
          <div className="text-sm text-green-700">
            Your Zupass account has been connected and real ticket data has been imported.
          </div>
        </div>,
        {
          duration: 4000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      )
    } catch (error) {
      console.error('Error connecting to Zupass', error)
      setContext(prevContext => ({ ...prevContext, loading: false, error: 'Error connecting to Zupass' }))
      
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold text-red-800">❌ Zupass Connection Failed</div>
          <div className="text-sm text-red-700">
            <div className="font-medium">Error:</div>
            <div className="bg-red-50 p-2 rounded border text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>,
        {
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      )
    }
  }

  async function RequestProof() {
    if (!zupassLoaded) {
      throw new Error('Zupass modules not loaded')
    }

    try {
      // This would be implemented with actual Zupass SDK
      // For now, return a simulated proof
      return {
        success: true,
        revealedClaims: {
          pods: {
            ticket: {
              entries: {
                attendeeName: { value: 'Devcon Attendee' },
                attendeeEmail: { value: 'attendee@example.com' },
                eventId: { value: 'devcon-sea-2024' },
                ticketType: { value: 'Devcon Attendee' },
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error requesting proof:', error)
      throw error
    }
  }

  async function VerifyProof(proof: Record<string, unknown>) {
    try {
      // This would be implemented with actual verification logic
      // For now, return true for simulated proofs
      return proof?.success === true
    } catch (error) {
      console.error('Error verifying proof:', error)
      return false
    }
  }

  async function GetTicket() {
    console.log('Getting Devcon ticket', context.publicKey)

    try {
      let initContext = context.context
      if (!initContext) {
        initContext = await init(ref.current as HTMLElement, ZUPASS_URL)
      }

      const zupass = await doConnect(ZAPP, initContext)
      const ticket = await getRealTicketFromZupass(zupass)

      if (ticket) {
        const ticketData = mapToTicket(ticket)
        localStorage.setItem('zupassTicket', JSON.stringify(ticketData))
        return ticketData
      }
    } catch (error) {
      console.error('[ZUPASS] Error getting ticket', error)
    }
  }

  async function GetSwag() {
    console.log('Getting Devconnect add-ons')

    try {
      let initContext = context.context
      if (!initContext) {
        initContext = await init(ref.current as HTMLElement, ZUPASS_URL)
      }

      const zupass = await doConnect(ZAPP, initContext)
      const query = pod({
        entries: {
          eventId: {
            type: 'string',
            isMemberOf: [{ type: 'string', value: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac' }], // Devconnect ARG event ID
          },
        },
      })

      const pods = await zupass.pod.collection('Devconnect ARG').query(query)
      const addons = pods.filter(pod => pod.entries.isAddOn && pod.entries.isAddOn.value === BigInt(1))
      const swag = addons.map(mapToTicket) || []

      localStorage.setItem('zupassSwag', JSON.stringify(swag))
      return swag
    } catch (error) {
      console.error('[ZUPASS] Error getting add-ons', error)
    }

    return []
  }

  async function GetCollectibles() {
    console.log('Getting Meerkat collectibles')

    try {
      // Simulate getting collectibles
      const collectibles = [
        {
          id: 'collectible-1',
          title: 'Devcon Attendance',
          description: 'Proof of attendance at Devcon',
          track: 'General',
          imageUrl: 'https://example.com/collectible-1.png',
          signature: 'collectible-signature-1',
          signerPublicKey: 'collectible-signer-1',
        },
      ] as Collectible[]

      localStorage.setItem('zupassCollectibles', JSON.stringify(collectibles))
      return collectibles
    } catch (error) {
      console.error('[ZUPASS] Error getting collectibles', error)
    }

    return []
  }

  async function getRealTicketFromZupass(zupass: ParcnetAPI): Promise<PODData | undefined> {
    const query = pod({
      entries: {
        eventId: {
          type: 'string',
          isMemberOf: [{ type: 'string', value: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac' }], // Devconnect ARG event ID
        },
      },
    })

    const pods = await zupass.pod.collection('Devconnect ARG').query(query)
    return pods.find(pod => !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0))
  }

  function mapToTicket(pod: PODData): Ticket {
    return {
      ticketId: pod.entries.ticketId.value,
      attendeeName: pod.entries.attendeeName.value || 'Devcon Attendee',
      attendeeEmail: pod.entries.attendeeEmail.value,
      productId: pod.entries.productId.value,
      ticketType: pod.entries.ticketName.value || 'Ticket',
      ticketSecret: pod.entries.ticketSecret.value,
      isConsumed: pod.entries.isConsumed.value === BigInt(1),
      isRevoked: pod.entries.isRevoked.value === BigInt(1),
      signature: pod.signature,
      signerPublicKey: pod.signerPublicKey,
    } as Ticket
  }



  useEffect(() => {
    async function initContext() {
      try {
        // Only initialize if ref.current is available
        if (!ref.current) {
          console.log(
            'ZupassProvider: ref.current is null, skipping initialization'
          );
          return;
        }

        const context = await init(ref.current as HTMLElement, ZUPASS_URL);
        const publicKey = localStorage.getItem('zupassPublicKey') || '';
        setContext((prevContext) => ({ ...prevContext, context, publicKey }));
      } catch (error) {
        console.error('Failed to initialize Zupass context:', error);
      }
    }

    // Only run initialization if zupass is loaded and ref is available
    if (zupassLoaded && ref.current) {
      initContext();
    }
  }, [zupassLoaded, ref.current]);

  // Sync zupassLoaded state with context
  useEffect(() => {
    setContext(prevContext => ({ ...prevContext, zupassLoaded }))
  }, [zupassLoaded])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading Zupass...</div>
        </div>
      </div>
    )
  }

  if (!zupassLoaded) {
    // Instead of blocking the entire app, just log a warning and continue
    console.warn('Zupass modules not loaded - using fallback mode')
    return (
      <ZupassContext.Provider value={{
        ...context,
        zupassLoaded: false,
        loading: false,
        error: 'Zupass modules not available - using fallback mode'
      }}>
        <div ref={ref} className="" />
        {props.children}
      </ZupassContext.Provider>
    )
  }

  return (
    <ZupassContext.Provider value={context}>
      <div ref={ref} className="" />
      {props.children}
      {/* Zupass dialog will be loaded here */}
    </ZupassContext.Provider>
  )
} 
