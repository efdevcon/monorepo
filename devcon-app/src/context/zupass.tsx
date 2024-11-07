'use client'

import { ZAPP, ZUPASS_URL } from '../utils/zupass'
import { connect, ParcnetAPI } from '@parcnet-js/app-connector'
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react'
import { pod } from '@parcnet-js/podspec'
import { POD } from '@pcd/pod'
import { useAccountContext } from './account-context'

interface ZupassContext {
  loading: boolean
  error?: string
  publicKey: string
  Connect: (onboard: boolean) => void
  GetTicket: () => void
  GetPods: () => void
}

const defaultZupassContext: ZupassContext = {
  loading: false,
  error: '',
  publicKey: '',
  Connect: (onboard: boolean) => {},
  GetTicket: () => {},
  GetPods: () => {},
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
    GetPods,
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

    const zupass = await connect(ZAPP, ref.current as HTMLElement, ZUPASS_URL)
    return getTicket(zupass)
  }

  async function GetPods() {
    console.log('Getting Devcon add-ons')

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
    return addons
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
