'use client'

import { ZAPP, ZUPASS_URL } from '../utils/zupass'
import { connect, ParcnetAPI } from '@parcnet-js/app-connector'
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react'
import { pod, PODData } from '@parcnet-js/podspec'
import { POD } from '@pcd/pod'
import { useAccountContext } from './account-context'

interface Ticket {
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

interface Collectible {
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
  Connect: (onboard: boolean) => void
  GetTicket: () => Promise<Ticket | undefined>
  GetSwag: () => Promise<Ticket[]>
  GetCollectibles: () => Promise<Collectible[]>
}

const defaultZupassContext: ZupassContext = {
  loading: false,
  error: '',
  publicKey: '',
  Connect: (onboard: boolean) => {},
  GetTicket: () => Promise.resolve(undefined),
  GetSwag: () => Promise.resolve([]),
  GetCollectibles: () => Promise.resolve([]),
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
  const accountContext = useAccountContext()
  const ref = useRef<HTMLDivElement>(null)
  const [context, setContext] = useState<ZupassContext>({
    loading: false,
    error: '',
    publicKey: '',
    Connect,
    GetTicket,
    GetSwag,
    GetCollectibles,
  })

  async function Connect(onboard: boolean) {
    setContext(prevContext => ({ ...prevContext, loading: true }))

    console.log('Connecting to Zupass...', ZUPASS_URL, onboard)
    try {
      const zupass = await connect(ZAPP, ref.current as HTMLElement, ZUPASS_URL)
      const publicKey = await zupass.identity.getPublicKey()

      if (onboard) {
        const ticket = await getTicket(zupass)
        if (ticket) {
          const pod = POD.load(ticket.entries, ticket.signature, ticket.signerPublicKey)
          await accountContext.updateZupassProfile(pod)
          localStorage.setItem('zupassTicket', JSON.stringify(pod.toJSON()))
        }
      }

      localStorage.setItem('zupassPublicKey', publicKey)
      setContext(prevContext => ({ ...prevContext, loading: false, error: '', publicKey }))
    } catch (error) {
      console.error('Error connecting to Zupass', error)
      setContext(prevContext => ({ ...prevContext, loading: false, error: 'Error connecting to Zupass' }))
    }
  }

  async function GetTicket() {
    console.log('Getting Devcon ticket')

    try {
      const zupass = await connect(ZAPP, ref.current as HTMLElement, ZUPASS_URL)
      const ticket = await getTicket(zupass)

      if (ticket) {
        return mapToTicket(ticket)
      }
    } catch (error) {
      console.error('[ZUPASS] Error getting ticket', error)
    }
  }

  async function GetSwag() {
    console.log('Getting Devcon add-ons')

    try {
      const zupass = await connect(ZAPP, ref.current as HTMLElement, ZUPASS_URL)
      const query = pod({
        entries: {
          eventId: {
            type: 'string',
            isMemberOf: [{ type: 'string', value: '5074edf5-f079-4099-b036-22223c0c6995' }],
          },
        },
      })

      const pods = await zupass.pod.collection('Devcon SEA').query(query)
      const addons = pods.filter(pod => pod.entries.isAddOn && pod.entries.isAddOn.value === BigInt(1))
      return addons?.map(mapToTicket) || []
    } catch (error) {
      console.error('[ZUPASS] Error getting add-ons', error)
    }

    return []
  }

  async function GetCollectibles() {
    console.log('Getting Meerkat collectibles')

    const zupass = await connect(ZAPP, ref.current as HTMLElement, ZUPASS_URL)
    const query = pod({
      entries: {
        pod_type: {
          type: 'string',
          isMemberOf: [
            {
              type: 'string',
              value: 'events.meerkat/attendance',
            },
          ],
        },
      },
    })

    const attendance = await zupass.pod.collection('Meerkat: Devcon SEA').query(query)
    return attendance.map(
      pod =>
        ({
          id: pod.entries.code.value,
          title: pod.entries.zupass_title.value,
          description: pod.entries.zupass_description.value,
          track: pod.entries.track.value,
          imageUrl: pod.entries.zupass_image_url.value,
          signature: pod.signature,
          signerPublicKey: pod.signerPublicKey,
        } as Collectible)
    )
  }

  async function getTicket(zupass: ParcnetAPI) {
    const query = pod({
      entries: {
        eventId: {
          type: 'string',
          isMemberOf: [{ type: 'string', value: '5074edf5-f079-4099-b036-22223c0c6995' }],
        },
      },
    })

    const pods = await zupass.pod.collection('Devcon SEA').query(query)
    return pods.find(pod => !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0))
  }

  function mapToTicket(pod: PODData) {
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
    const publicKey = localStorage.getItem('zupassPublicKey')
    if (publicKey) {
      setContext(prevContext => ({ ...prevContext, publicKey }))
    }
  }, [])

  return (
    <ZupassContext.Provider value={context}>
      <div ref={ref} className="" />
      {props.children}
      {/* Zupass dialog will be loaded here */}
    </ZupassContext.Provider>
  )
}
