import { ethers } from 'ethers';

interface PretixItem {
  id: number;
  name: string | { en: string; [key: string]: string };
  description?: string | { en: string; [key: string]: string };
  category?: string;
  active?: boolean;
  has_variations?: boolean;
  variations?: Array<{
    id: number;
    value: string | { en: string;[key: string]: string };
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Ticket types for categorizing different kinds of tickets
 */
export type TicketType = 'attendee' | 'addon' | 'swag' | 'event';
export type TicketPartner = string;

export const DEFAULT_TICKET_PARTNER = 'ens';
export const DEFAULT_TICKET_EVENT_NAME = 'Devconnect ARG';

function normalizeTicketPartner(partner?: string): string {
  const normalized = (partner ?? DEFAULT_TICKET_PARTNER).trim().toLowerCase();
  return normalized || DEFAULT_TICKET_PARTNER;
}

function normalizeTicketEventName(eventName?: string): string {
  const normalized = (eventName ?? DEFAULT_TICKET_EVENT_NAME).trim();
  return normalized || DEFAULT_TICKET_EVENT_NAME;
}

/**
 * Ticket proof structure for privacy-preserving ticket verification.
 * 
 * The identifier is a hash of the original ticket secret - it uniquely identifies
 * the ticket without revealing the original code.
 * 
 * The proof is a signature of (identifier + ticketType + partner + eventName) using the relayer's private key.
 * Anyone with the public key can verify the proof is valid for the identifier AND type,
 * confirming the ticket was validated by our system.
 */
export interface TicketProof {
  /** Hash of the ticket secret - uniquely identifies the ticket without revealing the code */
  identifier: string;
  /** Type of ticket (attendee, addon, swag, event) - cryptographically bound to the proof */
  ticketType: TicketType;
  /** Partner namespace for this proof (normalized) - cryptographically bound to the proof */
  partner: TicketPartner;
  /** Event name for this proof (trimmed) - cryptographically bound to the proof */
  eventName: string;
  /** Signature of (identifier + ticketType + partner + eventName) - proves authenticity, type, partner, and event */
  proof: string;
  /** Public address of the signer for verification */
  signerAddress: string;
}

/**
 * Creates the message to be signed for a ticket proof.
 * Includes the identifier, ticket type, partner, and event name to cryptographically bind them.
 */
function createProofMessage(
  identifier: string,
  ticketType: TicketType,
  partner?: string,
  eventName?: string
): Uint8Array {
  const normalizedPartner = normalizeTicketPartner(partner);
  const normalizedEventName = normalizeTicketEventName(eventName);

  // Concatenate identifier hash with ticket type + partner + eventName for signing
  // This ensures the type/partner/eventName cannot be changed without invalidating the signature
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'string', 'string', 'string'],
      [identifier, ticketType, normalizedPartner, normalizedEventName]
    )
  );
  return ethers.getBytes(messageHash);
}

/**
 * Generates a cryptographic proof for a ticket secret.
 * 
 * Flow:
 * 1. Hash the ticket secret to create a unique identifier (commitment)
 * 2. Create a message combining identifier + ticket type
 * 3. Sign the combined message with the relayer's private key
 * 
 * Verification:
 * - Anyone can verify: ecrecover(hash(identifier + type), proof) === signerAddress
 * - The original ticket secret cannot be derived from the identifier
 * - The ticket type is cryptographically bound and cannot be tampered with
 * - Each ticket has a unique, verifiable proof of authenticity
 */
export async function generateTicketProof(
  secret: string,
  ticketType: TicketType = 'attendee',
  partner: string = DEFAULT_TICKET_PARTNER,
  eventName: string = DEFAULT_TICKET_EVENT_NAME
): Promise<TicketProof> {
  const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('ETH_RELAYER_PAYMENT_PRIVATE_KEY is not configured');
  }

  const wallet = new ethers.Wallet(privateKey);

  // Create identifier: hash of the secret
  // This uniquely identifies the ticket without revealing the original code
  const identifier = ethers.keccak256(ethers.toUtf8Bytes(secret));

  const normalizedPartner = normalizeTicketPartner(partner);
  const normalizedEventName = normalizeTicketEventName(eventName);

  // Create message that includes identifier + type + partner + eventName
  const message = createProofMessage(
    identifier,
    ticketType,
    normalizedPartner,
    normalizedEventName
  );

  // Sign the combined message to create the proof
  // This cryptographically binds the identifier to the ticket type
  const proof = await wallet.signMessage(message);

  return {
    identifier,
    ticketType,
    partner: normalizedPartner,
    eventName: normalizedEventName,
    proof,
    signerAddress: wallet.address,
  };
}

/**
 * Verifies a ticket proof is valid.
 * 
 * @param identifier - The ticket identifier (hash of original secret)
 * @param ticketType - The ticket type to verify
 * @param proof - The signature to verify
 * @param expectedSigner - The expected signer address (optional, defaults to relayer)
 * @returns true if the proof is valid
 */
export function verifyTicketProof(
  identifier: string,
  ticketType: TicketType,
  proof: string,
  expectedSigner?: string,
  partner: string = DEFAULT_TICKET_PARTNER,
  eventName: string = DEFAULT_TICKET_EVENT_NAME
): boolean {
  try {
    const normalizedPartner = normalizeTicketPartner(partner);
    const normalizedEventName = normalizeTicketEventName(eventName);

    // Recreate the message that was signed
    const message = createProofMessage(
      identifier,
      ticketType,
      normalizedPartner,
      normalizedEventName
    );

    // Recover the signer from the proof
    const recoveredAddress = ethers.verifyMessage(message, proof);

    // If expected signer provided, check it matches
    if (expectedSigner) {
      return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    }

    // Otherwise check against configured relayer
    const privateKey = process.env.ETH_RELAYER_PAYMENT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ETH_RELAYER_PAYMENT_PRIVATE_KEY is not configured');
    }

    const wallet = new ethers.Wallet(privateKey);
    return recoveredAddress.toLowerCase() === wallet.address.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Extracts the variation value (e.g., t-shirt size) from an addon and its item details
 * Returns the short form (e.g., "L" instead of "Large (L)")
 */
function getVariationValue(
  addon: any,
  itemDetails: PretixItem | undefined
): string | null {
  if (!addon.variation || !itemDetails?.has_variations || !itemDetails.variations) {
    return null;
  }

  const variation = itemDetails.variations.find(
    (v) => v.id === addon.variation
  );

  if (!variation) {
    return null;
  }

  const fullValue = typeof variation.value === 'object'
    ? variation.value.en
    : variation.value;

  // Extract short form from parentheses (e.g., "Large (L)" -> "L")
  const match = fullValue.match(/\(([^)]+)\)/);
  return match ? match[1] : fullValue;
}

export async function getPaidTicketsByEmail(
  email: string,
  store: {
    organizerSlug: string;
    eventSlug: string;
    eventName: string;
    eventId: number | undefined;
    url: string;
    apiKey: string;
  }
) {
  const apiKey = store.apiKey;
  const baseUrl = store.url;
  const organizerSlug = store.organizerSlug;
  const eventSlug = store.eventSlug;

  if (!apiKey) {
    throw new Error('PRETIX_API_KEY is missing');
  }

  const headers = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Fetch items (products/tickets) to get item details
  const itemsUrl = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/items/`;
  const itemsResponse = await fetch(itemsUrl, {
    headers,
    next: { revalidate: 3600 }, // doesn't need to be revalidated often, its store config and won't change often
  });

  if (!itemsResponse.ok) {
    throw new Error(`Failed to fetch items: ${itemsResponse.status}`);
  }

  const itemsData = await itemsResponse.json();
  const itemsMap = new Map<number, PretixItem>(
    itemsData.results.map((item: any) => [item.id, item])
  );

  // Fetch orders
  const url = `${baseUrl}/api/v1/organizers/${organizerSlug}/events/${eventSlug}/orders`;
  const params = new URLSearchParams({
    status: 'p',
    search: email,
  });

  const response = await fetch(`${url}?${params}`, { headers });

  if (!response.ok) {
    console.error('Pretix API error:', response);
    throw new Error(`Pretix API error: ${response.status}`);
  }

  const data = await response.json();
  const orders = data.results || [];

  const isMainTicket =
    store.organizerSlug === 'devconnect' && store.eventSlug === 'cowork';

  // console.log('orders', orders);
  const results = await Promise.all(orders
    .map(async (order: any) => {
      const mainPositions = isMainTicket
        ? order.positions.filter(
            (position: any) =>
              position.attendee_email &&
              position.attendee_email.toLowerCase() === email.toLowerCase() &&
              !position.addon_to
          )
        : order.positions;

      // console.log('mainPositions', order.positions);

      const tickets = await Promise.all(mainPositions.map(async (position: any) => {
        // Resolve main ticket item details
        const mainItemDetails = itemsMap.get(position.item);

        // Get addons for this position
        const addons = await Promise.all(order.positions
          .filter((p: any) => p.addon_to === position.id)
          .map(async (addon: any) => {
            const itemDetails = itemsMap.get(addon.item);
            const name = itemDetails?.name;
            const description = itemDetails?.description;
            const variationValue = getVariationValue(addon, itemDetails);
        // console.log('addon', addon);
        // console.log('itemDetails', JSON.stringify(itemDetails, null, 2));

            // Build itemName with variation value if it exists
            let itemName = typeof name === 'object'
              ? name.en
              : name || `Item ${addon.item}`;

            if (variationValue) {
              itemName = `${itemName} - ${variationValue}`;
            }

            // Generate proof for addon ticket
            // Determine if it's swag (t-shirt, etc.) or a regular addon
            const addonType: TicketType = variationValue ? 'swag' : 'addon';
            let ticketProof: TicketProof | null = null;
            try {
              ticketProof = await generateTicketProof(
                addon.secret,
                addonType,
                DEFAULT_TICKET_PARTNER,
                store.eventName
              );
            } catch (e) {
              console.warn('Failed to generate proof for addon:', e);
            }

            return {
              id: addon.item,
              secret: addon.secret,
              ticketProof,
              itemName: itemName,
              description:
                typeof description === 'object' ? description.en : description,
              price: addon.price,
              attendeeName: addon.attendee_name,
              category: itemDetails?.category,
              active: itemDetails?.active,
            };
          }));

        const mainName = mainItemDetails?.name;
        const mainDescription = mainItemDetails?.description;
        const checkins = Array.isArray(position.checkins) ? position.checkins : [];
        const ticketHasCheckedIn = checkins.length > 0;

        // Generate proof for main ticket
        // Use 'attendee' for main cowork tickets, 'event' for side event tickets
        const mainTicketType: TicketType = isMainTicket ? 'attendee' : 'event';
        let ticketProof: TicketProof | null = null;
        try {
          ticketProof = await generateTicketProof(
            position.secret,
            mainTicketType,
            DEFAULT_TICKET_PARTNER,
            store.eventName
          );
        } catch (e) {
          console.warn('Failed to generate proof for ticket:', e);
        }

        return {
          secret: position.secret,
          ticketProof,
          attendeeName: position.attendee_name,
          attendeeEmail: position.attendee_email || order.email,
          price: position.price,
          // Use item details from the items endpoint
          itemId: position.item,
          itemName:
            typeof mainName === 'object'
              ? mainName.en
              : mainName || position.item_name || 'Ticket',
          itemDescription:
            typeof mainDescription === 'object'
              ? mainDescription.en
              : mainDescription,
          addons: addons,
          hasCheckedIn: ticketHasCheckedIn,
        };
      }));

      return {
        orderCode: order.code,
        orderDate: order.datetime,
        email: order.email,
        eventName: store.eventName,
        eventSlug: store.eventSlug,
        eventId: store.eventId || null,
        tickets,
      };
    }));

  return results.filter((ticket: any) => ticket.tickets.length > 0);
}
