'use client'

import { useEffect } from 'react'
import {
  ClientConnectionState,
  ParcnetClientProvider,
  Toolbar,
  useParcnetClient,
} from '@parcnet-js/app-connector-react'
import { useState, useCallback } from 'react'
import { getDevconTicketProofRequest, getDevconnectTicketProofRequest } from './ticketProof'
import { ProveResult, serializeProofResult } from './serialize'
import perksList from './perks-list'
import { Button } from 'lib/components/button'

export default function Perks() {
  const [mounted, setMounted] = useState(false)
  const [devconCoupons, setDevconCoupons] = useState<Record<string, string>>({})
  const [devconnectCoupons, setDevconnectCoupons] = useState<Record<string, string>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="section my-8">
      <ParcnetClientProvider
        zapp={{
          name: 'Devconnect Perks Portal', // update the name of the zapp to something *unique*
          permissions: {
            // update permissions based on what you want to collect and prove
            REQUEST_PROOF: { collections: ['Devcon SEA'] }, // Update this to the collection name you want to use
            READ_PUBLIC_IDENTIFIERS: {},
          },
        }}
      >
        <Toolbar />

        {/* <RequestProof /> */}

        <div className="grid grid-cols-3 gap-4 mt-8">
          {perksList.map(perk => (
            <Perk
              key={perk.name}
              perk={perk}
              devconCoupons={devconCoupons}
              setDevconCoupons={setDevconCoupons}
              devconnectCoupons={devconnectCoupons}
              setDevconnectCoupons={setDevconnectCoupons}
            />
          ))}
        </div>
      </ParcnetClientProvider>
    </div>
  )
}

const Perk = ({
  perk,
  devconCoupons,
  devconnectCoupons,
  setDevconCoupons,
  setDevconnectCoupons,
}: {
  perk: (typeof perksList)[number]
  devconCoupons: Record<string, string>
  devconnectCoupons: Record<string, string>
  setDevconCoupons: (coupons: Record<string, string>) => void
  setDevconnectCoupons: (coupons: Record<string, string>) => void
}) => {
  const { z, connectionState } = useParcnetClient()
  const isDevconProof = perk.zupass_proof_id === 'Devcon SEA'
  const coupons = isDevconProof ? devconCoupons : devconnectCoupons
  const coupon = coupons[perk.coupon_collection]

  const requestCoupon = useCallback(async () => {
    if (connectionState !== ClientConnectionState.CONNECTED) return

    const req = isDevconProof ? getDevconTicketProofRequest() : getDevconnectTicketProofRequest()

    const res = await z.gpc.prove({
      request: req.schema,
      collectionIds: [perk.zupass_proof_id ?? ''], // Update this to the collection ID you want to use
    })

    if (!res.success) return

    const serializedProofResult = serializeProofResult(res)

    const response = await fetch(`/api/coupons/${encodeURIComponent(perk.zupass_proof_id ?? '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: serializedProofResult,
    })

    if (response.ok) {
      const { coupons } = await response.json()

      if (isDevconProof) {
        setDevconCoupons(coupons)
      } else {
        setDevconnectCoupons(coupons)
      }
    } else {
      console.error(response.statusText)
    }
  }, [z, connectionState])

  return (
    <div className="border border-solid border-gray-700 rounded-lg p-4 flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold font-secondary">{perk.name}</h2>
        <p>{perk.description}</p>
      </div>
      {perk.external ? (
        <Button color="black-1" onClick={() => window.open(perk.url, '_blank')}>
          Claim Externally
        </Button>
      ) : (
        <Button color="black-1" onClick={requestCoupon}>
          Claim Coupon
        </Button>
      )}
      {coupon && <div>Coupon: {coupon}</div>}
    </div>
  )
}
