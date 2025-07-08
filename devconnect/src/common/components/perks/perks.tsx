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
import Button from 'common/components/voxel-button/button'
import css from './perks.module.scss'
import cn from 'classnames'
import Image from 'next/image'
import NeutralSquares from './images/squares/default.png'
import EthGlyphGif from './images/colour-changing-eth-glyph.gif'
import PerksTextTop from './images/perks-text-top.png'
import PerksTextBottom from './images/perks-text-bottom.png'
import VerifiedSquares from './images/squares/verified.png'
import { CopyToClipboard } from '../copy-to-clipboard/CopyToClipboard'
import { Copy } from 'lucide-react'

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
    <>
      <div className="section py-8 pt-10 relative">
        <Image
          src={PerksTextTop}
          alt="Perks Text Top"
          className="w-auto object-cover h-auto absolute top-0 left-0 expand"
        />
        <Image
          src={PerksTextBottom}
          alt="Perks Text Bottom"
          className="w-auto object-cover h-auto absolute bottom-0 right-0 expand"
        />
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
          {/* <RequestProof /> */}
          <div>
            <div className={cn(css.connector, 'flex items-center w-[775px] max-w-[100%] mx-auto')}>
              <div className="p-5 flex justify-center items-center flex-wrap w-full gap-4 lg:gap-8 z-10">
                <p className="">
                  To check your Perk eligibility, connect your <b>Zupass account</b>
                </p>
                <Toolbar />
              </div>
            </div>
          </div>
          <div className="text-3xl mt-10 font-secondary">
            <span className="font-semibold">Devconnect Perks</span> ({perksList.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6 mb-16">
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

          {/* <div className="">
          Showing 4 out of 4 
        </div> */}
        </ParcnetClientProvider>
      </div>
      <div className={cn('flex justify-between items-center bg-[#C6E1F9] text-[#36364C]')}>
        <div className={cn(css['bottom-section'], 'section py-24')}>
          <div className="grid grid-cols-[60%_40%] gap-4 max-w-[1000px] mx-auto z-10">
            <div className="flex flex-col justify-center items-center gap-3">
              <p className="text-3xl font-secondary font-bold mb-3">
                Got an incredible offer for attendees of Devconnect Argentina?
              </p>
              <p className="text-base/7">
                Get your brand in front of an audience of 15K+ by offering a perk for those attending Devconnect
                Argentina.
              </p>
              <p className="text-base/7">
                The ticket ownership proving process is permissionless and ensures fair and equal distribution of your
                offer to real humans only.
              </p>
              <Button className="self-start mt-3">Complete Notion Form</Button>
            </div>
            <div className="flex justify-center items-center">
              <Image src={EthGlyphGif} alt="Ethereum Glyph" width={200} height={200} />
            </div>
          </div>
        </div>
      </div>
    </>
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
    <div className="border border-solid border-gray-700 flex flex-col">
      <div className="flex flex-col gap-2 aspect-[316/278] relative">
        <Image src={perk.image} alt={perk.name} className="w-full object-cover h-full absolute top-0 left-0" />
        <h2 className="text-lg font-bold font-secondary ">{perk.name}</h2>
        <p className="">{perk.description}</p>
        <Image
          src={NeutralSquares}
          alt="Neutral Squares"
          className="w-full object-cover h-auto absolute bottom-0 left-0 right-0 mb-[2.5px]"
        />
        {/* <Image
          src={VerifiedSquares}
          alt="Verified Squares"
          className="w-full object-cover h-auto absolute top-0 left-0"
        /> */}
      </div>

      <div className="p-6 flex items-center text-center justify-center flex-col gap-4 relative bg-white">
        {/* {perk.external && (
          <Button color="black-1" onClick={() => window.open(perk.url, '_blank')}>
            Claim Externally
          </Button>
        )} */}

        <div className="flex flex-col h-full gap-2">
          <div className="text-sm text-[#4B4B66] tracking-widest font-secondary uppercase">{perk.issuer}</div>

          <div className="text-lg leading-tight font-bold">{perk.description}</div>

          {perk.requires && (
            <div className="text-sm text-[#4B4B66]">
              <b>Requires:</b> {perk.requires} POD
            </div>
          )}
        </div>

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
              <div className="p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm flex items-center justify-center gap-2">
                <div>
                  <strong>Coupon:</strong>&nbsp;{coupon}
                </div>

                <CopyToClipboard url={coupon} useCopyIcon={true} copyIconSize={14}>
                  <div className="hover:text-green-600 transition-colors p-1 flex items-center justify-center">
                    <Copy size={14} />
                  </div>
                </CopyToClipboard>
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
    </div>
  )
}
