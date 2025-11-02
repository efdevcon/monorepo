import { deserializeProofResult, deserializePodData } from '../../../common/components/perks/serialize'
// import {
//   getDevconTicketProofRequest,
//   getDevconnectTicketProofRequest,
// } from '../../../common/components/perks/ticketProof'
// import { gpcVerify } from '@pcd/gpc'
import { NextApiRequest, NextApiResponse } from 'next'
// import path from 'path'
// @ts-ignore ffjavascript does not have types
// import { getCurveFromName } from 'ffjavascript'
import perksList from 'common/components/perks/perks-list'
import { createClient } from '@supabase/supabase-js'
import { POD } from '@pcd/pod'
import { PODData } from '@parcnet-js/podspec'
import { proveWalletOwnership } from './wallet-proof'
import { eventShops } from 'lib/components/event-schedule-new/zupass/event-shops-list'
import { supabase } from 'common/supabaseClient'
import { getPaidTicketsByEmail } from './pretix'

const verifyPodSignature = (podData: PODData): boolean => {
  try {
    // Convert PODData to the format expected by POD.load()
    // POD.load expects (entries, signature, signerPublicKey)
    const pod = POD.load(podData.entries, podData.signature, podData.signerPublicKey)

    // Verify the signature
    const isValid = pod.verifySignature()

    console.log(`POD signature verification for ${podData.entries.ticketId?.value || 'unknown'}:`, isValid)

    return isValid
  } catch (error) {
    console.error('Error verifying POD signature:', error)
    return false
  }
}

const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// const GPC_ARTIFACTS_PATH = path.join(process.cwd(), 'public/artifacts')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { collection: collectionQuery } = req.query
  const collection = Array.isArray(collectionQuery) ? collectionQuery.join('/') : collectionQuery

  if (!collection) {
    return res.status(400).json({ error: 'Collection is required' })
  }

  const perk =
    perksList.find(perk => perk.coupon_collection === collection) ||
    eventShops.find(event => event.coupon_collection === collection)

  // Zupass gating refers to third party event shops that use zupass to gate their event via our calendar
  const isZupassGating = eventShops.some(event => event.coupon_collection === collection)
  const { useEmailAuth } = req.body

  if (isZupassGating && useEmailAuth) {
    console.warn('ZUPASS SKIPPED, USING SUPABASE AUTH INSTEAD: ', collection)

    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify supabase token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired Supabase token' })
    }

    const claimedBy = user.email

    if (!claimedBy) {
      return res.status(400).json({ error: 'User email is required' })
    }

    const tickets = await getPaidTicketsByEmail(claimedBy)

    const hasTickets = tickets && tickets.length > 0

    if (!hasTickets) {
      return res.status(400).json({ error: 'User does not have a Devconnect ticket' })
    }

    // Flatten tickets array to get all ticket secrets
    const ticketSecrets = tickets.flatMap((order: any) => order.tickets.map((t: any) => t.secret))

    if (ticketSecrets.length === 0) {
      return res.status(400).json({ error: 'No valid ticket secrets found' })
    }

    // Try each ticket secret until we find one that hasn't been used
    const coupon = await claimCouponWithTickets(perk!.zupass_proof_id ?? '', collection, claimedBy, ticketSecrets)

    return res.status(200).json({
      coupon: coupon.coupon,
      coupon_status: coupon.status,
      collection,
      ticket_type: perk!.zupass_proof_id,
    })
  }

  if (!perk) {
    return res.status(400).json({ error: 'Perk or gated event not found' })
  }

  if (collection === 'protocol-guild-free-ticket') {
    try {
      const { signature, address } = req.body

      console.log('signature', signature)
      console.log('address', address)

      const { success, error } = await proveWalletOwnership(signature, address)

      if (!success) {
        return res.status(400).json({ error: error })
      }

      const coupon = await claimSingleCoupon('PG Wallet Ownership', collection, address)

      return res.status(200).json({
        coupon: coupon.coupon,
        coupon_status: coupon.status,
        collection,
        ticket_type: perk.zupass_proof_id,
      })
    } catch (error) {
      console.error('Error verifying wallet ownership:', error)
      return res.status(400).json({ error: 'Could not verify wallet ownership' })
    }
  }

  const pod = deserializePodData(JSON.stringify(req.body))

  const signer = pod.signerPublicKey
  const pretixPublicSigningKey = 'YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs'

  // Make sure signer matches pretix to avoid "fake" pods
  if (signer !== pretixPublicSigningKey) {
    return res.status(400).json({ error: 'Invalid signer' })
  }

  // Verify POD signature and contents
  const podVerified = verifyPodSignature(pod)

  if (!podVerified) {
    return res.status(400).json({ error: 'Pod verification failed' })
  }

  const eventIdDevconnect = '1f36ddce-e538-4c7a-9f31-6a4b2221ecac'
  const eventIdDevcon = '5074edf5-f079-4099-b036-22223c0c6995'

  const eventId = pod.entries.eventId?.value?.toString()

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (perk.zupass_proof_id === 'Devcon SEA') {
    const correctTicketId = eventId === eventIdDevcon
    if (!correctTicketId) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
  }

  if (perk.zupass_proof_id === 'Devconnect ARG') {
    const correctTicketId = eventId === eventIdDevconnect
    if (!correctTicketId) {
      return res.status(400).json({ error: 'Invalid ticket ID' })
    }
  }

  const ticketId = pod.entries.ticketId?.value?.toString()
  const ticketOwner = pod.entries.attendeeEmail?.value?.toString()

  if (!ticketId || !ticketOwner) {
    return res.status(400).json({ error: 'Ticket ID and ticket owner are required' })
  }

  // If perk is same for everyone, just return it, no need to claim
  if (perk.global_coupon) {
    return res.status(200).json({
      coupon: perk.global_coupon,
      coupon_status: { success: true },
      collection,
      ticket_type: perk.zupass_proof_id,
    })
  }

  // Fetch tickets for the ticket owner to get ticket secrets
  const tickets = await getPaidTicketsByEmail(ticketOwner)

  if (!tickets || tickets.length === 0) {
    return res.status(400).json({ error: 'No tickets found for this email' })
  }

  // Flatten tickets array to get all ticket secrets
  const ticketSecrets = tickets.flatMap((order: any) => order.tickets.map((t: any) => t.secret))

  if (ticketSecrets.length === 0) {
    return res.status(400).json({ error: 'No valid ticket secrets found' })
  }

  // Try each ticket secret until we find one that hasn't been used
  const coupon = await claimCouponWithTickets(perk.zupass_proof_id ?? '', collection, ticketOwner, ticketSecrets)

  return res.status(200).json({
    coupon: coupon.coupon,
    coupon_status: coupon.status,
    collection,
    ticket_type: perk.zupass_proof_id,
  })
}

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' })
//   }

//   const { slug } = req.query
//   const proofId = Array.isArray(slug) ? slug.join('/') : slug

//   if (!proofId) {
//     return res.status(400).json({ error: 'Proof ID is required' })
//   }

//   const { collection } = req.body

//   if (!collection) {
//     return res.status(400).json({ error: 'Collection is required' })
//   }

//   const perk = perksList.find(perk => perk.zupass_proof_id === proofId && perk.coupon_collection === collection)

//   if (!perk) {
//     return res.status(400).json({ error: 'Perk not found for proof ID and collection' })
//   }

//   const serializedProofResult = JSON.stringify(req.body)

//   const { boundConfig, revealedClaims, proof } = deserializeProofResult(serializedProofResult)

//   const request =
//     proofId === 'Devcon SEA'
//       ? getDevconTicketProofRequest().getProofRequest()
//       : getDevconnectTicketProofRequest().getProofRequest()

//   // Multi-threaded verification seems to be broken in NextJS, so we need to
//   // initialize the curve in single-threaded mode.

//   // @ts-ignore
//   if (!globalThis.curve_bn128) {
//     // @ts-ignore
//     globalThis.curve_bn128 = getCurveFromName('bn128', { singleThread: true })
//   }

//   const result = await gpcVerify(
//     proof,
//     {
//       ...request.proofConfig,
//       circuitIdentifier: boundConfig.circuitIdentifier,
//     },
//     revealedClaims,
//     GPC_ARTIFACTS_PATH
//   )

//   if (result === true) {
//     // Claim single coupon from Supabase based on the proof ID, collection, and nullifier
//     // Note: this is no longer a nullifier hash, but a ticket ID, to allow for leniency in case someone resets their zupass account and gets a new nullifier
//     const nullifierHash = revealedClaims.pods.ticket?.entries?.ticketId.value?.toString() ?? '' // revealedClaims.owner?.nullifierHashV4?.toString() ?? ''

//     try {
//       const result = await claimSingleCoupon(proofId, collection, nullifierHash)

//       console.log(`Verified proof: ${proofId}, claimed coupon for collection: ${collection}`)

//       return res.status(200).json({
//         verified: true,
//         coupon: result.coupon,
//         coupon_status: result.status,
//         collection: collection,
//         ticket_type: proofId,
//       })
//     } catch (error) {
//       console.error('Error claiming coupon:', error)
//       return res.status(500).json({
//         verified: true,
//         error: 'Failed to claim coupon',
//         collection: collection,
//         ticket_type: proofId,
//       })
//     }
//   }

//   return res.status(400).json({
//     verified: false,
//     error: 'Proof verification failed',
//   })
// }

// Claim coupon with multiple ticket attempts
async function claimCouponWithTickets(
  proofId: string,
  collection: string,
  claimedBy: string,
  ticketSecrets: string[]
): Promise<{
  coupon: string | null
  status: { success: boolean; error?: string }
}> {
  console.log('claimCouponWithTickets', proofId, collection, claimedBy, `${ticketSecrets.length} tickets`)

  // First, check if user already has claimed a coupon for this specific collection
  const { data: existingCoupon, error: checkError } = await supabaseAdmin
    .from('coupons')
    .select('value')
    .eq('zk_proof_id', proofId)
    .eq('collection', collection)
    .eq('claimed_by', claimedBy)
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check existing coupon: ${checkError.message}`)
  }

  // If user already has this coupon, return it
  if (existingCoupon) {
    return {
      coupon: existingCoupon.value,
      status: { success: true },
    }
  }

  // Try each ticket secret until we find one that hasn't been used
  for (const ticketSecret of ticketSecrets) {
    // Check if this ticket has already been used for this collection
    const { data: usedTicket, error: usedCheckError } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .eq('collection', collection)
      .eq('ticket_used', ticketSecret)
      .maybeSingle()

    if (usedCheckError) {
      console.error(`Failed to check if ticket is used:`, usedCheckError)
      continue // Try next ticket
    }

    if (usedTicket) {
      console.log(`Ticket ${ticketSecret} already used for collection ${collection}, trying next ticket`)
      continue // This ticket was already used, try next one
    }

    // This ticket hasn't been used, try to claim with it
    const { data: availableCoupon, error: findError } = await supabaseAdmin
      .from('coupons')
      .select('id, value')
      .eq('collection', collection)
      .eq('zk_proof_id', proofId)
      .is('claimed_by', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (findError) {
      console.error(`Failed to find available coupon for collection ${collection}:`, findError)
      return {
        coupon: null,
        status: { success: false, error: 'Database error occurred' },
      }
    }

    if (!availableCoupon) {
      console.warn(`No available coupons for collection: ${collection}`)
      return {
        coupon: null,
        status: { success: false, error: 'All coupons claimed' },
      }
    }

    // Claim the coupon with this ticket
    const { error: claimError } = await supabaseAdmin
      .from('coupons')
      .update({
        claimed_by: claimedBy,
        claimed_date: new Date().toISOString(),
        ticket_used: ticketSecret,
      })
      .eq('id', availableCoupon.id)
      .is('claimed_by', null) // Double-check it's still available

    if (claimError) {
      console.error(`Failed to claim coupon ${availableCoupon.id}:`, claimError)
      return {
        coupon: null,
        status: { success: false, error: 'Database error occurred, try again.' },
      }
    }

    // Successfully claimed!
    return {
      coupon: availableCoupon.value,
      status: { success: true },
    }
  }

  // All tickets have been used
  return {
    coupon: null,
    status: { success: false, error: 'All your tickets have already been used to claim this perk' },
  }
}

// Claim single coupon from Supabase
async function claimSingleCoupon(
  proofId: string,
  collection: string,
  claimedBy: string
): Promise<{
  coupon: string | null
  status: { success: boolean; error?: string }
}> {
  console.log('claimSingleCoupon', proofId, collection, claimedBy)
  // First, check if user already has claimed a coupon for this specific collection
  const { data: existingCoupon, error: checkError } = await supabaseAdmin
    .from('coupons')
    .select('value')
    .eq('zk_proof_id', proofId)
    .eq('collection', collection)
    .eq('claimed_by', claimedBy)
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check existing coupon: ${checkError.message}`)
  }

  // If user already has this coupon, return it
  if (existingCoupon) {
    return {
      coupon: existingCoupon.value,
      status: { success: true },
    }
  }

  // Otherwise, claim new coupon for this specific collection
  const { data: availableCoupon, error: findError } = await supabaseAdmin
    .from('coupons')
    .select('id, value')
    .eq('collection', collection)
    .eq('zk_proof_id', proofId)
    .is('claimed_by', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (findError) {
    console.error(`Failed to find available coupon for collection ${collection}:`, findError)
    return {
      coupon: null,
      status: { success: false, error: 'Database error occurred' },
    }
  }

  if (!availableCoupon) {
    console.warn(`No available coupons for collection: ${collection}`)
    return {
      coupon: null,
      status: { success: false, error: 'All coupons claimed.' },
    }
  }

  // Then, claim the specific coupon by ID
  const { error: claimError } = await supabaseAdmin
    .from('coupons')
    .update({
      claimed_by: claimedBy,
      claimed_date: new Date().toISOString(),
    })
    .eq('id', availableCoupon.id)
    .is('claimed_by', null) // Double-check it's still available

  if (claimError) {
    console.error(`Failed to claim coupon ${availableCoupon.id}:`, claimError)
    return {
      coupon: null,
      status: { success: false, error: 'Database error occurred' },
    }
  }

  return {
    coupon: availableCoupon.value,
    status: { success: true },
  }
}
