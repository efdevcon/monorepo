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
import { ProveResult, serializeProofResult, serializePodData } from './serialize'
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
import { Copy, ArrowUpRight, ArrowDown, Info } from 'lucide-react'
import { motion, cubicBezier } from 'framer-motion'
import Tooltip from '../tooltip'
import Link from 'common/components/link'
import InfiniteScroller from 'lib/components/infinite-scroll'
import RichText from 'lib/components/tina-cms/RichText'
import { CMSButtons } from 'common/components/voxel-button/button'
import { useTina } from 'tinacms/dist/react'
import { pod, PODData } from '@parcnet-js/podspec'
import { POD } from '@pcd/pod'
import { WalletProvider } from './wallet-provider'
import { WalletConnection } from './wallet-connection'
import { useAccount, useSignMessage } from 'wagmi'

// HOC to wrap ParcnetClientProvider
const withParcnetProvider = <P extends object>(Component: React.ComponentType<P>) => {
  return function WrappedComponent(props: P) {
    return (
      <WalletProvider>
        <ParcnetClientProvider
          zapp={{
            name: 'Devconnect Perks Portal', // update the name of the zapp to something *unique*
            permissions: {
              // update permissions based on what you want to collect and prove
              REQUEST_PROOF: { collections: ['Devcon SEA', 'Devconnect ARG'] }, // Update this to the collection name you want to use
              READ_PUBLIC_IDENTIFIERS: {},
              READ_POD: { collections: ['Devcon SEA', 'Devconnect ARG'] },
            },
          }}
        >
          <Component {...props} />
        </ParcnetClientProvider>
      </WalletProvider>
    )
  }
}

// Animation variants for staggered animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.25,
      delayChildren: 0.6,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 60,
    color: 'rgba(0, 0, 0, 0.1)',
  },
  visible: {
    opacity: 1,
    y: 0,
    color: 'rgba(0, 0, 0, 1)',
    transition: {
      duration: 1,
      ease: cubicBezier(0.25, 0.1, 0.25, 1), // easeOutQuart - much smoother
    },
  },
}

// Animation variants for connector
const connectorVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: cubicBezier(0.25, 0.1, 0.25, 1),
    },
  },
}

// Animation variants for title
const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: cubicBezier(0.25, 0.1, 0.25, 1),
      delay: 0.3,
    },
  },
}

// Animation variants for bottom section
const bottomSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1, // Small delay for smoother start
    },
  },
}

// Animation variants for left column (animates from center-right)
const leftColumnVariants = {
  hidden: {
    opacity: 0,
    x: 100, // Start from center-right
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: cubicBezier(0.25, 0.1, 0.25, 1),
    },
  },
}

// Animation variants for right column (animates from center-left)
const rightColumnVariants = {
  hidden: {
    opacity: 0,
    x: -100, // Start from center-left
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: cubicBezier(0.25, 0.1, 0.25, 1),
    },
  },
}

function Perks(props: any) {
  const { data }: { data: any } = useTina(props.content)
  const { z, connectionState, ...rest } = useParcnetClient()

  const [mounted, setMounted] = useState(false)
  const [devconCoupons, setDevconCoupons] = useState<Record<string, string>>({})
  const [devconnectCoupons, setDevconnectCoupons] = useState<Record<string, string>>({})
  const [tickets, setTickets] = useState<{ devcon: PODData; devconnect: PODData } | null>(null)
  const [initialConnectAttempted, setInitialConnectAttempted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialConnectAttempted) return

    const initialConnect = () => {
      setInitialConnectAttempted(true)

      const connectedInThePast = localStorage.getItem('zupassConnected')

      if (z && connectionState === ClientConnectionState.DISCONNECTED && connectedInThePast) {
        try {
          z.connect()
        } catch (error) {
          console.error('Error auto connecting to Zupass:', error)
        }
      }
    }

    initialConnect()
  }, [z, connectionState])

  // Function to verify POD signature
  const verifyPodSignature = (podData: PODData): boolean => {
    try {
      // Convert PODData to the format expected by POD.load()
      // POD.load expects (entries, signature, signerPublicKey)
      const pod = POD.load(podData.entries, podData.signature, podData.signerPublicKey)

      console.log(pod, 'pod')

      // Verify the signature
      const isValid = pod.verifySignature()

      console.log(`POD signature verification for ${podData.entries.ticketId?.value || 'unknown'}:`, isValid)

      return isValid
    } catch (error) {
      console.error('Error verifying POD signature:', error)
      return false
    }
  }

  const fetchPods = async () => {
    const queryDevcon = pod({
      entries: {
        eventId: {
          type: 'string',
          isMemberOf: [{ type: 'string', value: '5074edf5-f079-4099-b036-22223c0c6995' }],
        },
      },
    })

    const queryDevconnect = pod({
      entries: {
        eventId: {
          type: 'string',
          isMemberOf: [{ type: 'string', value: '1f36ddce-e538-4c7a-9f31-6a4b2221ecac' }],
        },
      },
    })

    // @ts-ignore
    const pods = await z.pod.collection('Devcon SEA').query(queryDevcon)
    // @ts-ignore
    const podsDevconnect = await z.pod.collection('Devconnect ARG').query(queryDevconnect)

    // NOT swag tickets
    const devconTickets = pods.filter(
      (pod: PODData) => !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    )

    // NOT swag tickets
    const devconnectTickets = podsDevconnect.filter(
      (pod: PODData) => !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
    )

    // Verify signatures for all tickets
    const verifiedDevconTickets = devconTickets.filter((ticket: PODData) => verifyPodSignature(ticket))
    const verifiedDevconnectTickets = devconnectTickets.filter((ticket: PODData) => verifyPodSignature(ticket))

    const tickets = {
      devcon: verifiedDevconTickets[0],
      devconnect: verifiedDevconnectTickets[0],
    }

    setTickets(tickets)

    localStorage.setItem('zupassConnected', 'true')

    console.log('devconTickets (all):', devconTickets)
    console.log('devconTickets (verified):', verifiedDevconTickets)
    console.log('devconnectTickets (all):', devconnectTickets)
    console.log('devconnectTickets (verified):', verifiedDevconnectTickets)
  }

  useEffect(() => {
    if (connectionState === ClientConnectionState.CONNECTED) {
      fetchPods()
    }
  }, [connectionState, z])

  if (!mounted) return null

  return (
    <>
      <div className="section pb-0 pt-10 relative">
        <div className="absolute top-1 left-0 w-full h-full expand">
          <InfiniteScroller nDuplications={10} speed="75s">
            <Image src={PerksTextTop} alt="Perks Text Top" className="block w-[250px] object-cover h-auto mr-8" />
          </InfiniteScroller>
        </div>
        <div className="absolute bottom-2 right-0 w-full  expand">
          <InfiniteScroller nDuplications={10} reverse speed="75s">
            <Image src={PerksTextBottom} alt="Perks Text Bottom" className="block w-[250px] object-cover h-auto mr-8" />
          </InfiniteScroller>
        </div>

        <motion.div variants={connectorVariants} initial="hidden" animate="visible">
          <div className={cn(css.connector, 'flex items-center w-[775px] max-w-[100%] mx-auto')}>
            <div className="p-5 flex justify-center items-center flex-wrap w-full gap-4 lg:gap-8 z-10">
              <div className="flex flex-col gap-2 md:gap-0.5 text-center md:text-left">
                <div className="flex items-center gap-1.5 ">
                  <div>
                    <RichText content={data.pages.perks_explainer} />
                  </div>
                  <Tooltip
                    arrow={false}
                    title={data.pages.zupass_explainer}
                    className="shrink-0 inline-flex items-center justify-center hidden md:flex"
                  >
                    <div className="flex items-center justify-center shrink-0 hidden md:flex md:shrink-0">
                      <Info size={18} />
                    </div>
                  </Tooltip>{' '}
                </div>
                <div className="text-xs text-[#4B4B66]">
                  <RichText content={data.pages.perks_explainer_2} />
                </div>
              </div>
              <Toolbar />
            </div>
          </div>
        </motion.div>
        <motion.div
          className="text-3xl mt-7 font-secondary"
          variants={titleVariants}
          initial="hidden"
          animate="visible"
        >
          <span className="font-semibold">Devconnect Perks</span> ({perksList.length})
        </motion.div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6 mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {perksList.map((perk, index) => (
            <Perk
              key={perk.name}
              perk={perk}
              tickets={tickets}
              devconCoupons={devconCoupons}
              setDevconCoupons={setDevconCoupons}
              devconnectCoupons={devconnectCoupons}
              setDevconnectCoupons={setDevconnectCoupons}
            />
          ))}
        </motion.div>

        {/* <div className="">
        Showing 4 out of 4 
      </div> */}
      </div>
      <div
        className={cn('flex justify-between items-center bg-[#C6E1F9] text-[#36364C] overflow-hidden')}
        id="yourperk"
      >
        <div className={cn(css['bottom-section'], 'section py-10 md:py-24')}>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-4 max-w-[1000px] mx-auto z-10"
            variants={bottomSectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div className="flex flex-col justify-center items-center gap-3" variants={leftColumnVariants}>
              <RichText content={data.pages.perks_create_your_own_perk} Buttons={CMSButtons} />
            </motion.div>
            <motion.div className="justify-center hidden md:flex items-center" variants={rightColumnVariants}>
              <Image src={EthGlyphGif} alt="Ethereum Glyph" width={200} height={200} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

// Export the wrapped component
export default withParcnetProvider(Perks)

const Perk = ({
  perk,
  devconCoupons,
  devconnectCoupons,
  tickets,
  setDevconCoupons,
  setDevconnectCoupons,
}: {
  perk: (typeof perksList)[number]
  devconCoupons: Record<string, string>
  devconnectCoupons: Record<string, string>
  tickets: { devcon: PODData; devconnect: PODData } | null
  setDevconCoupons: (coupons: Record<string, string>) => void
  setDevconnectCoupons: (coupons: Record<string, string>) => void
}) => {
  const { connectionState } = useParcnetClient()
  const isDevconProof = perk.zupass_proof_id === 'Devcon SEA'
  const coupons = isDevconProof ? devconCoupons : devconnectCoupons
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [couponStatus, setCouponStatus] = useState<{ success: boolean; error?: string } | null>(null)
  const [fetchingCoupon, setFetchingCoupon] = useState(false)

  const verified = isDevconProof ? tickets?.devcon : tickets?.devconnect
  const coupon = verified && perk.global_coupon ? perk.global_coupon : coupons[perk.coupon_collection]

  useEffect(() => {
    setCouponStatus(null)
  }, [address, connectionState])

  const requestCouponWalletProof = useCallback(async () => {
    if (fetchingCoupon || !address) return

    setFetchingCoupon(true)
    setCouponStatus(null)

    // Request to sign a message that will be verified on the backend to prove ownership of the wallet
    let signature = ''

    try {
      signature = await signMessageAsync({
        message: 'I own this wallet and want to prove it in order to get my Devconnect 2025 ARG ticket.',
      })
      console.log('signature', signature)
    } catch (error) {
      console.error('Error signing message:', error)
      setCouponStatus({ success: false, error: 'Failed to sign message' })
      return
    }

    try {
      const response = await fetch(`/api/coupons/${encodeURIComponent(perk.coupon_collection)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature,
          address,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        setCouponStatus({ success: false, error: error || 'Failed to claim coupon' })
        return
      }

      const { coupon, coupon_status, ticket_type } = await response.json()

      setCouponStatus(coupon_status)

      // Just assign the coupon to the devconnect coupons - doesn't really matter - cba refactoring for just this case
      setDevconnectCoupons({
        ...devconnectCoupons,
        [perk.coupon_collection]: coupon,
      })
    } catch (error) {
      console.error('Error claiming coupon:', error)
      setCouponStatus({ success: false, error: 'Failed to claim coupon' })
    } finally {
      setFetchingCoupon(false)
    }
  }, [address, fetchingCoupon, devconnectCoupons, setDevconnectCoupons, perk.coupon_collection])

  const requestCoupon = useCallback(async () => {
    if (connectionState !== ClientConnectionState.CONNECTED) return
    if (fetchingCoupon) return
    if (!verified) return

    setFetchingCoupon(true)
    setCouponStatus(null)

    try {
      console.log('verified', serializePodData(verified))

      const response = await fetch(`/api/coupons/${encodeURIComponent(perk.coupon_collection)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: serializePodData(verified),
      })

      if (!response.ok) {
        console.error(response.statusText)
        setCouponStatus({ success: false, error: 'Failed to claim coupon' })
        return
      }

      const { coupon, coupon_status, ticket_type } = await response.json()

      setCouponStatus(coupon_status)

      if (ticket_type === 'Devcon SEA') {
        setDevconCoupons({
          ...devconCoupons,
          [perk.coupon_collection]: coupon,
        })
      } else {
        setDevconnectCoupons({
          ...devconnectCoupons,
          [perk.coupon_collection]: coupon,
        })
      }
    } catch (error) {
      console.error('Error claiming coupon:', error)
      setCouponStatus({ success: false, error: 'Failed to claim coupon' })
    } finally {
      setFetchingCoupon(false)
    }
  }, [
    verified,
    connectionState,
    devconCoupons,
    devconnectCoupons,
    setDevconCoupons,
    setDevconnectCoupons,
    perk.coupon_collection,
  ])

  // const requestCoupon = useCallback(async () => {
  //   if (connectionState !== ClientConnectionState.CONNECTED) return

  //   const req = isDevconProof ? getDevconTicketProofRequest() : getDevconnectTicketProofRequest()

  //   const res = await z.gpc.prove({
  //     request: req.schema,
  //     collectionIds: [perk.zupass_proof_id ?? ''], // Update this to the collection ID you want to use
  //   })

  //   if (!res.success) return

  //   const serializedProofResult = serializeProofResult(res)

  //   const response = await fetch(`/api/coupons/${encodeURIComponent(perk.zupass_proof_id ?? '')}`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       ...JSON.parse(serializedProofResult),
  //       collection: perk.coupon_collection,
  //     }),
  //   })

  //   if (response.ok) {
  //     const { coupon, coupon_status, collection } = await response.json()

  //     if (isDevconProof) {
  //       setDevconCoupons({
  //         ...devconCoupons,
  //         [collection]: coupon,
  //       })
  //       setDevconStatus({
  //         ...devconStatus,
  //         [collection]: coupon_status,
  //       })
  //     } else {
  //       setDevconnectCoupons({
  //         ...devconnectCoupons,
  //         [collection]: coupon,
  //       })
  //       setDevconnectStatus({
  //         ...devconnectStatus,
  //         [collection]: coupon_status,
  //       })
  //     }
  //   } else {
  //     console.error(response.statusText)
  //   }
  // }, [
  //   z,
  //   connectionState,
  //   isDevconProof,
  //   perk.zupass_proof_id,
  //   perk.coupon_collection,
  //   devconCoupons,
  //   devconStatus,
  //   devconnectCoupons,
  //   devconnectStatus,
  //   setDevconCoupons,
  //   setDevconStatus,
  //   setDevconnectCoupons,
  //   setDevconnectStatus,
  // ])

  const isCreateYourOwnPerk = !!perk.anchor
  const isExternalPerk = !!perk.external
  const isConnected = connectionState === ClientConnectionState.CONNECTED
  const walletConnected = address && address.length > 0 && perk.wallet_proof

  return (
    <motion.div
      variants={itemVariants}
      className={cn(css.perk, 'border border-solid border-gray-700 flex relative flex-col group/perk')}
    >
      <div
        className={cn(
          'absolute top-0 z-[11] left-0 w-full h-full bg-black opacity-0 group-hover/perk:opacity-70 transition-opacity duration-500 z-10 flex items-center justify-center',
          (isCreateYourOwnPerk || isConnected || perk.wallet_proof) && 'hidden'
        )}
      ></div>

      <div
        className={cn(
          'absolute top-0 z-[11] left-0 w-full h-full opacity-0 group-hover/perk:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center',
          (isCreateYourOwnPerk || isConnected || perk.wallet_proof) && 'hidden'
        )}
      >
        <div className="text-white text-center text-lg font-bold font-secondary mx-4">
          Connect your Zupass to check your eligibility
        </div>
      </div>

      <div className="flex flex-col gap-2 aspect-[316/250] relative">
        <Image src={perk.image} alt={perk.name} className="w-full object-cover h-full absolute top-0 left-0" />
        {/* <h2 className="text-lg font-bold font-secondary ">{perk.name}</h2> */}
        {/* <p className="">{perk.description}</p> */}

        {connectionState !== ClientConnectionState.CONNECTED &&
          !isCreateYourOwnPerk &&
          // !isExternalPerk &&
          !perk.no_status && (
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-gray-200 text-gray-800 text-sm px-2 py-1 border border-black border-solid font-bold">
                Not Connected
              </div>
            </div>
          )}

        {connectionState === ClientConnectionState.CONNECTED && !isCreateYourOwnPerk && !perk.no_status && (
          <div className="absolute top-4 left-4 z-10">
            <div
              className={cn(
                'text-sm px-2 py-1 font-bold border border-black border-solid',
                verified ? 'bg-[#9BEFA0] text-gray-800' : 'bg-gray-200 text-red-800'
              )}
            >
              {verified ? 'Ticket Verified' : 'Missing Ticket'}
            </div>
          </div>
        )}

        {perk.anchor && (
          <div
            className="absolute top-4 right-4 cursor-pointer z-10"
            onClick={() => {
              if (!perk.anchor) return

              const targetId = perk.anchor.startsWith('#') ? perk.anchor.slice(1) : perk.anchor
              const targetElement = document.getElementById(targetId)
              if (targetElement) {
                targetElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
            }}
          >
            <div className="bg-white text-gray-800 text-sm px-2 py-1 font-bold border border-black border-solid flex items-center gap-1 transform hover:bg-gray-100 transition-colors duration-300 will-change-transform will-transform">
              Contact us
              <ArrowDown size={13} />
            </div>
          </div>
        )}

        {perk.wallet_proof && (
          <div className="absolute top-4 right-4 cursor-pointer z-10">
            <WalletConnection />
          </div>
        )}

        {/* {perk.urls && !verified && (
          <div className="absolute top-4 right-4 cursor-pointer z-10">
            <div className="flex flex-col gap-2">
              {perk.urls.map(url => (
                <Link
                  key={url.url}
                  href={url.url}
                  className="bg-[#1B6FAE] text-white text-sm px-2 py-1 self-end font-bold border border-gray-700 border-solid flex items-center gap-1 transform transition-colors duration-300 will-change-transform will-transform"
                >
                  <div className="flex items-center gap-1">
                    {url.text}
                    <ArrowUpRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )} */}

        {!isCreateYourOwnPerk &&
        !perk.wallet_proof &&
        connectionState === ClientConnectionState.CONNECTED &&
        verified ? (
          <Image
            src={VerifiedSquares}
            alt="Verified Squares"
            className="w-full object-cover h-auto absolute bottom-0 left-0 right-0 mb-[2.5px]"
          />
        ) : (
          <Image
            src={NeutralSquares}
            alt="Neutral Squares"
            className="w-full object-cover h-auto absolute bottom-0 left-0 right-0 mb-[2.5px]"
          />
        )}
      </div>

      <div className="p-6 flex items-center text-center justify-center flex-col relative bg-white gap-3 grow px-2 overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-2 max-w-[100%] mx-2">
          <div className="text-sm text-[#4B4B66] tracking-widest font-secondary uppercase">{perk.issuer}</div>

          <div className="text-lg leading-tight font-bold">{perk.description}</div>

          {(connectionState === ClientConnectionState.CONNECTED || walletConnected) && (
            <>
              {!coupon && !couponStatus && (
                <>
                  {(walletConnected || (perk.zupass_proof_id && verified && !perk.external)) && (
                    <Button
                      color="black-1"
                      size="sm"
                      className="my-0.5 w-full mx-2"
                      onClick={perk.wallet_proof ? requestCouponWalletProof : requestCoupon}
                    >
                      {fetchingCoupon ? 'Fetching Coupon...' : 'Claim Coupon'}
                    </Button>
                  )}

                  {/* {perk.external && verified && (
                    <div className="flex gap-2">
                      {perk.urls &&
                        perk.urls.map(url => (
                          <Button
                            key={url.url}
                            color="black-1"
                            size="sm"
                            className="my-0.5"
                            onClick={() => window.open(url.url, '_blank')}
                          >
                            {url.text}
                            <ArrowUpRight size={16} />
                          </Button>
                        ))}
                    </div>
                  )} */}
                </>
              )}
            </>
          )}

          {coupon && (
            <div className="p-2 py-2 bg-green-100 border font-bold max-w-[95%] overflow-hidden text-ellipsis border-green-300 rounded text-green-800 text-sm flex flex-wrap items-center justify-center gap-0.5">
              <>
                {perk.instructions && (
                  <div className="text-xs text-[#4B4B66] w-full text-center">{perk.instructions}</div>
                )}

                {coupon.startsWith('http') && (
                  <a
                    href={coupon}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink text-ellipsis overflow-hidden line-clamp-3"
                  >
                    {coupon}
                  </a>
                )}

                {!coupon.startsWith('http') && (
                  <div className="shrink">
                    <strong>Coupon:</strong>&nbsp;{coupon}
                  </div>
                )}

                {!coupon.startsWith('http') && (
                  <div className="">
                    <CopyToClipboard url={coupon} useCopyIcon={true} copyIconSize={14}>
                      <div className="hover:text-green-600 transition-colors p-1 flex items-center justify-center shrink-0">
                        <Copy size={14} />
                      </div>
                    </CopyToClipboard>
                  </div>
                )}

                {coupon.startsWith('http') && (
                  <Link href={coupon} className="my-0.5 w-full">
                    <Button size="sm" className="my-0.5 w-full">
                      <div className="flex items-center gap-1">
                        {(perk.urls && perk.urls?.[0]?.text) || 'Redeem'}
                        <ArrowUpRight size={16} />
                      </div>
                    </Button>
                  </Link>
                )}

                {!coupon.startsWith('http') && (
                  <Link href={perk.urls?.[0]?.url ?? ''} className="my-0.5 w-full">
                    <Button size="sm" className="my-0.5 w-full">
                      <div className="flex items-center gap-1">
                        {perk.urls?.[0]?.text}
                        <ArrowUpRight size={16} />
                      </div>
                    </Button>
                  </Link>
                )}
              </>
            </div>
          )}

          {verified && isExternalPerk && !perk.wallet_proof && (
            <div className="p-2 py-2 bg-green-100 border font-bold max-w-[95%] overflow-hidden text-ellipsis border-green-300 rounded text-green-800 text-sm flex flex-wrap items-center justify-center gap-0.5 w-full">
              <div className="text-xs text-[#4B4B66]">{perk.instructions || 'Verify your ticket here:'}</div>

              {perk.urls?.map((url, index) => (
                <Link key={url.url || index} href={url.url ?? ''} className="my-0.5 w-full">
                  <Button size="sm" className="my-0.5 w-full">
                    <div className="flex items-center gap-1">
                      {url.text}
                      <ArrowUpRight size={16} />
                    </div>
                  </Button>
                </Link>
              ))}
            </div>
          )}

          {couponStatus && !couponStatus.success && (
            <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm text-center">
              {couponStatus.error}
            </div>
          )}

          {perk.requires && (
            <div className="text-xs text-[#4B4B66]">
              <b>Requires:</b> {perk.requires}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
