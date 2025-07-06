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
  const [devconStatus, setDevconStatus] = useState<Record<string, { success: boolean; error?: string }>>({})
  const [devconnectStatus, setDevconnectStatus] = useState<Record<string, { success: boolean; error?: string }>>({})

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
              devconStatus={devconStatus}
              setDevconStatus={setDevconStatus}
              devconnectStatus={devconnectStatus}
              setDevconnectStatus={setDevconnectStatus}
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
  devconStatus,
  setDevconStatus,
  devconnectStatus,
  setDevconnectStatus,
}: {
  perk: (typeof perksList)[number]
  devconCoupons: Record<string, string>
  devconnectCoupons: Record<string, string>
  setDevconCoupons: (coupons: Record<string, string>) => void
  setDevconnectCoupons: (coupons: Record<string, string>) => void
  devconStatus: Record<string, { success: boolean; error?: string }>
  setDevconStatus: (status: Record<string, { success: boolean; error?: string }>) => void
  devconnectStatus: Record<string, { success: boolean; error?: string }>
  setDevconnectStatus: (status: Record<string, { success: boolean; error?: string }>) => void
}) => {
  const { z, connectionState } = useParcnetClient()
  const isDevconProof = perk.zupass_proof_id === 'Devcon SEA'
  const coupons = isDevconProof ? devconCoupons : devconnectCoupons
  const coupon = coupons[perk.coupon_collection]
  const status = isDevconProof ? devconStatus : devconnectStatus
  const couponStatus = status[perk.coupon_collection]

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
      body: JSON.stringify({
        ...JSON.parse(serializedProofResult),
        collection: perk.coupon_collection,
      }),
    })

    if (response.ok) {
      const { coupon, coupon_status, collection } = await response.json()

      if (isDevconProof) {
        setDevconCoupons({
          ...devconCoupons,
          [collection]: coupon,
        })
        setDevconStatus({
          ...devconStatus,
          [collection]: coupon_status,
        })
      } else {
        setDevconnectCoupons({
          ...devconnectCoupons,
          [collection]: coupon,
        })
        setDevconnectStatus({
          ...devconnectStatus,
          [collection]: coupon_status,
        })
      }
    } else {
      console.error(response.statusText)
    }
  }, [
    z,
    connectionState,
    isDevconProof,
    perk.zupass_proof_id,
    perk.coupon_collection,
    devconCoupons,
    devconStatus,
    devconnectCoupons,
    devconnectStatus,
    setDevconCoupons,
    setDevconStatus,
    setDevconnectCoupons,
    setDevconnectStatus,
  ])

  return (
    <div className="border border-solid border-gray-700 rounded-lg p-4 flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold font-secondary">{perk.name}</h2>
        <p>{perk.description}</p>
      </div>

      {perk.external && (
        <Button color="black-1" onClick={() => window.open(perk.url, '_blank')}>
          Claim Externally
        </Button>
      )}

      {connectionState === ClientConnectionState.CONNECTED && (
        <>
          {!coupon && !couponStatus && (
            <>
              {!perk.external && (
                <Button color="black-1" onClick={requestCoupon}>
                  Claim Coupon
                </Button>
              )}
            </>
          )}

          {coupon && (
            <div className="p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
              <strong>Coupon:</strong> {coupon}
            </div>
          )}
          {couponStatus && !couponStatus.success && (
            <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm text-center">
              {couponStatus.error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
