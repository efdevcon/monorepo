/**
 * Comprehensive Pretix API Service
 */
import 'dotenv/config'
import { TICKETING, getPretixApiToken } from 'config/ticketing'
import {
  PretixEvent,
  PretixItem,
  PretixCategory,
  PretixQuestion,
  PretixQuota,
  PretixQuotaAvailability,
  PretixPaginatedResponse,
  PretixOrderCreateRequest,
  PretixOrder,
  TicketPurchaseInfo,
  TicketInfo,
  QuestionInfo,
} from '../types/pretix'

// ---------------------------------------------------------------------------
// In-memory TTL cache — avoids redundant Pretix API calls for catalog data
// that changes rarely (items, categories, questions, quotas, event info).
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const DEFAULT_CACHE_TTL_MS = 60_000 // 60 seconds

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T, ttlMs = DEFAULT_CACHE_TTL_MS): T {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
  return data
}

// Dedup in-flight requests so concurrent callers share one fetch
const inflight = new Map<string, Promise<unknown>>()

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<T> {
  const hit = getCached<T>(key)
  if (hit !== undefined) return hit

  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fetcher()
    .then((result) => {
      inflight.delete(key)
      return setCache(key, result, ttlMs)
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff — for critical mutating calls (createOrder,
// confirmOrderPayment) that run AFTER on-chain payment is already verified.
// A transient Pretix 5xx here would mean money taken but no ticket issued.
// ---------------------------------------------------------------------------

const RETRY_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 500

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  // Retry on 5xx server errors and network failures
  const msg = error.message
  return /5\d{2}/.test(msg) || msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT')
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = RETRY_ATTEMPTS): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (i < attempts - 1 && isRetryable(err)) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, i)
        console.warn(`[pretix] ${label} attempt ${i + 1} failed, retrying in ${delay}ms:`, (err as Error).message)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

// ---------------------------------------------------------------------------

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  // Add api/v1/ if not present
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}
const baseUrl = normalizeBaseUrl(TICKETING.pretix.baseUrl)
const organizerName = TICKETING.pretix.organizer
const eventName = TICKETING.pretix.event

function getHeaders() {
  return {
    Authorization: `Token ${getPretixApiToken()}`,
    'Content-Type': 'application/json',
  }
}

function getLocalizedString(obj: Record<string, string> | null, locale = 'en'): string {
  if (!obj) return ''
  return obj[locale] || obj['en'] || Object.values(obj)[0] || ''
}

async function fetchPretix<T>(endpoint: string): Promise<T> {
  const url = `${baseUrl}organizers/${organizerName}/events/${eventName}/${endpoint}`
  const response = await fetch(url, { headers: getHeaders() })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pretix API error ${response.status}: ${text}`)
  }

  return response.json()
}

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const results: T[] = []
  let url: string | null = `${baseUrl}organizers/${organizerName}/events/${eventName}/${endpoint}`

  while (url) {
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Pretix API error ${response.status}: ${text}`)
    }
    const data: PretixPaginatedResponse<T> = await response.json()
    results.push(...data.results)
    url = data.next
  }

  return results
}

export async function getEvent(): Promise<PretixEvent> {
  return cachedFetch('event', () => fetchPretix<PretixEvent>(''))
}

export async function getItems(): Promise<PretixItem[]> {
  return cachedFetch('items', () => fetchAllPages<PretixItem>('items/'))
}

export async function getItem(itemId: number): Promise<PretixItem> {
  return fetchPretix<PretixItem>(`items/${itemId}/`)
}

export async function getCategories(): Promise<PretixCategory[]> {
  return cachedFetch('categories', () => fetchAllPages<PretixCategory>('categories/'))
}

export async function getQuestions(): Promise<PretixQuestion[]> {
  return cachedFetch('questions', () => fetchAllPages<PretixQuestion>('questions/'))
}

export async function getQuotas(): Promise<PretixQuota[]> {
  return cachedFetch('quotas', () => fetchAllPages<PretixQuota>('quotas/'))
}

export async function getQuotaAvailability(quotaId: number): Promise<PretixQuotaAvailability> {
  return cachedFetch(`quota_avail_${quotaId}`, () => fetchPretix<PretixQuotaAvailability>(`quotas/${quotaId}/availability/`), 30_000)
}

export async function createOrder(order: PretixOrderCreateRequest): Promise<PretixOrder> {
  return withRetry('createOrder', async () => {
    const url = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/`
    const payload = TICKETING.pretix.testmode ? { ...order, testmode: true } : order
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Pretix order creation failed ${response.status}: ${text}`)
    }

    return response.json()
  })
}

export async function getOrder(orderCode: string): Promise<PretixOrder> {
  return cachedFetch(`order:${orderCode}`, () => fetchPretix<PretixOrder>(`orders/${orderCode}/`), 5_000)
}

export async function markOrderPaid(orderCode: string): Promise<PretixOrder> {
  const url = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/${orderCode}/mark_paid/`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to mark order as paid ${response.status}: ${text}`)
  }

  return response.json()
}

/**
 * Issue a manual refund for an order via the Pretix refund API.
 * Creates a proper refund record (provider=manual, source=external) against
 * the order's payment, then cancels the order. This avoids the "OVERPAID"
 * display that mark_refunded causes with external payment providers.
 */
export async function markOrderRefunded(orderCode: string, refundAmount?: string, txHash?: string, chainId?: number): Promise<void> {
  return withRetry(`markOrderRefunded(${orderCode})`, async () => {
    // 1. Fetch order to get payment details
    const order = await getOrder(orderCode)
    const payment = order.payments?.find(
      (p: any) => (p.provider === 'x402_crypto' || p.provider === 'manual') && p.state === 'confirmed'
    )

    const amount = refundAmount ?? (payment as any)?.amount ?? order.total

    // 2. Create a manual refund record
    if (payment) {
      const refundUrl = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/${orderCode}/refunds/`
      const refundRes = await fetch(refundUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          state: 'done',
          source: 'external',
          amount,
          payment: payment.local_id,
          provider: 'manual',
          mark_canceled: false,
          mark_pending: false,
          execution_date: new Date().toISOString().slice(0, 10),
          comment: txHash
            ? `Crypto refund issued on-chain: ${chainId ? `https://${chainId === 1 ? 'etherscan.io' : chainId === 10 ? 'optimistic.etherscan.io' : chainId === 42161 ? 'arbiscan.io' : chainId === 8453 ? 'basescan.org' : chainId === 84532 ? 'sepolia.basescan.org' : chainId === 137 ? 'polygonscan.com' : 'blockscan.com'}/tx/${txHash}` : txHash}`
            : 'Crypto refund issued on-chain',
        }),
      })

      if (!refundRes.ok) {
        const text = await refundRes.text()
        console.warn(`[pretix] Failed to create refund record for ${orderCode} (${refundRes.status}): ${text}`)
        // Fall through to cancel — refund record is nice-to-have, cancellation is essential
      }
    }

    // 3. Cancel the order to invalidate the ticket
    const cancelComment = txHash
      ? `Your order has been refunded on-chain: ${chainId ? `https://${chainId === 1 ? 'etherscan.io' : chainId === 10 ? 'optimistic.etherscan.io' : chainId === 42161 ? 'arbiscan.io' : chainId === 8453 ? 'basescan.org' : chainId === 84532 ? 'sepolia.basescan.org' : chainId === 137 ? 'polygonscan.com' : 'blockscan.com'}/tx/${txHash}` : txHash}`
      : 'Your order has been refunded.'

    const cancelUrl = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/${orderCode}/mark_canceled/`
    const cancelRes = await fetch(cancelUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ send_email: true, comment: cancelComment }),
    })

    if (!cancelRes.ok) {
      const text = await cancelRes.text()
      throw new Error(`Failed to cancel order ${orderCode} (${cancelRes.status}): ${text}`)
    }
  })
}

/**
 * Confirm an existing payment on an order and attach info data.
 * This confirms the payment created by the order's payment_provider (e.g. x402_crypto)
 * instead of creating a new manual payment via mark_paid/.
 */
export async function confirmOrderPayment(
  orderCode: string,
  paymentLocalId: number,
  info?: Record<string, unknown>
): Promise<void> {
  return withRetry(`confirmOrderPayment(${orderCode})`, async () => {
    // Use custom x402 plugin endpoint that passes mail_text to payment.confirm()
    // so {payment_info} is populated in the "payment received" email
    const paymentUrl = `${baseUrl}organizers/${organizerName}/events/${eventName}/x402/confirm/${orderCode}/${paymentLocalId}/`
    const body: Record<string, unknown> = { force: true }
    if (info) body.info = JSON.stringify(info)

    const response = await fetch(paymentUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      // Fall back to standard confirm endpoint if custom endpoint not available
      if (response.status === 404) {
        console.warn(`[pretix] Custom confirm endpoint not found, falling back to standard confirm`)
        const fallbackUrl = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/${orderCode}/payments/${paymentLocalId}/confirm/`
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        })
        if (!fallbackRes.ok) {
          const text = await fallbackRes.text()
          throw new Error(`Failed to confirm payment ${paymentLocalId} on order ${orderCode} (${fallbackRes.status}): ${text}`)
        }
        return
      }
      const text = await response.text()
      throw new Error(`Failed to confirm payment ${paymentLocalId} on order ${orderCode} (${response.status}): ${text}`)
    }
  })
}


/**
 * Get complete ticket purchase information including items, questions, and availability.
 * Results are cached for 60s (catalog) / 30s (availability) to avoid hammering the Pretix API.
 */
export async function getTicketPurchaseInfo(locale = 'en'): Promise<TicketPurchaseInfo> {
  return cachedFetch(`ticketPurchaseInfo:${locale}`, () => _buildTicketPurchaseInfo(locale))
}

async function _buildTicketPurchaseInfo(locale: string): Promise<TicketPurchaseInfo> {
  // Fetch all data in parallel
  const [event, items, categories, questions, quotas] = await Promise.all([
    getEvent(),
    getItems(),
    getCategories(),
    getQuestions(),
    getQuotas(),
  ])

  // Build category lookup
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // Build quota availability lookup — fetch all quotas in parallel
  const itemAvailability = new Map<number, { available: boolean; count: number | null }>()
  const quotaResults = await Promise.allSettled(
    quotas.map(async (quota) => {
      const avail = await getQuotaAvailability(quota.id)
      return { quota, avail }
    })
  )
  for (const result of quotaResults) {
    if (result.status === 'rejected') {
      console.error('Failed to fetch quota availability:', result.reason)
      continue
    }
    const { quota, avail } = result.value
    for (const itemId of quota.items) {
      const existing = itemAvailability.get(itemId)
      if (!existing || (avail.available && !existing.available)) {
        itemAvailability.set(itemId, {
          available: avail.available,
          count: avail.available_number,
        })
      }
    }
  }

  // Build addon category items lookup
  const addonCategoryItems = new Map<number, PretixItem[]>()
  for (const item of items) {
    if (item.category) {
      const cat = categoryMap.get(item.category)
      if (cat?.is_addon) {
        const existing = addonCategoryItems.get(item.category) || []
        existing.push(item)
        addonCategoryItems.set(item.category, existing)
      }
    }
  }

  // Format tickets
  const tickets: TicketInfo[] = items
    .filter((item) => item.active)
    .map((item) => {
      const availability = itemAvailability.get(item.id) || { available: true, count: null }

      // Get addon info
      const addons = item.addons.map((addon) => {
        const category = categoryMap.get(addon.addon_category)
        const addonItems = addonCategoryItems.get(addon.addon_category) || []

        return {
          categoryId: addon.addon_category,
          categoryName: category ? getLocalizedString(category.name, locale) : '',
          minCount: addon.min_count,
          maxCount: addon.max_count,
          items: addonItems.map((ai) => ({
            id: ai.id,
            name: getLocalizedString(ai.name, locale),
            description: getLocalizedString(ai.description, locale) || null,
            price: ai.default_price,
            available: itemAvailability.get(ai.id)?.available ?? true,
            variations: ai.variations
              .filter((v) => v.active)
              .map((v) => ({
                id: v.id,
                name: getLocalizedString(v.value, locale),
                price: v.default_price || ai.default_price,
              })),
          })),
        }
      })

      return {
        id: item.id,
        name: getLocalizedString(item.name, locale),
        description: getLocalizedString(item.description, locale) || null,
        price: item.default_price,
        originalPrice: item.original_price || null,
        currency: event.currency,
        available: availability.available,
        availableCount: availability.count,
        isAdmission: item.admission,
        requireVoucher: item.require_voucher,
        variations: item.variations.map((v) => ({
          id: v.id,
          name: getLocalizedString(v.value, locale),
          price: v.default_price || item.default_price,
          available: v.active,
        })),
        addons,
      }
    })

  // Format questions
  const formattedQuestions: QuestionInfo[] = questions
    .filter((q) => !q.hidden)
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      id: q.id,
      identifier: q.identifier,
      question: getLocalizedString(q.question, locale),
      helpText: q.help_text ? getLocalizedString(q.help_text, locale) : null,
      type: q.type,
      required: q.required,
      appliesToItems: q.items,
      options: q.options.map((opt) => ({
        id: opt.id,
        identifier: opt.identifier,
        answer: getLocalizedString(opt.answer, locale),
      })),
      ...(q.dependency_question && {
        dependsOn: {
          questionId: q.dependency_question,
          values: q.dependency_values,
        },
      }),
    }))

  return {
    event: {
      name: getLocalizedString(event.name, locale),
      currency: event.currency,
      dateFrom: event.date_from,
      dateTo: event.date_to,
      location: event.location ? getLocalizedString(event.location, locale) : null,
    },
    tickets,
    questions: formattedQuestions,
    categories: categories.map((c) => ({
      id: c.id,
      name: getLocalizedString(c.name, locale),
      isAddon: c.is_addon,
    })),
  }
}

/**
 * Calculate total price for an order
 */
export function calculateOrderTotal(
  items: { itemId: number; variationId?: number; price: string }[]
): string {
  const total = items.reduce((sum, item) => sum + parseFloat(item.price), 0)
  return total.toFixed(2)
}

/**
 * Voucher validation result
 */
export interface VoucherInfo {
  valid: boolean
  code: string
  priceMode: 'none' | 'set' | 'subtract' | 'percent'
  value: string
  itemId: number | null
  maxUsages: number
  redeemed: number
  error?: string
}

/**
 * Validate a voucher code against the Pretix API
 */
export async function validateVoucher(code: string): Promise<VoucherInfo> {
  const invalid = (error: string): VoucherInfo => ({
    valid: false,
    code,
    priceMode: 'none',
    value: '0',
    itemId: null,
    maxUsages: 0,
    redeemed: 0,
    error,
  })

  try {
    const data = await fetchPretix<{ count: number; results: any[] }>(
      `vouchers/?code=${encodeURIComponent(code)}`
    )

    if (!data.results || data.results.length === 0) {
      return invalid('Voucher code not found')
    }

    const voucher = data.results[0]

    // Check expiration
    if (voucher.valid_until) {
      const expiresAt = new Date(voucher.valid_until).getTime()
      if (Date.now() > expiresAt) {
        return invalid('Voucher has expired')
      }
    }

    // Check usage limits
    if (voucher.max_usages > 0 && voucher.redeemed >= voucher.max_usages) {
      return invalid('Voucher has been fully redeemed')
    }

    return {
      valid: true,
      code: voucher.code,
      priceMode: voucher.price_mode || 'none',
      value: voucher.value || '0',
      itemId: voucher.item || null,
      maxUsages: voucher.max_usages || 0,
      redeemed: voucher.redeemed || 0,
    }
  } catch (e) {
    return invalid(`Failed to validate voucher: ${(e as Error).message}`)
  }
}

/**
 * Compute the discounted price for an item given a voucher
 */
export function applyVoucherDiscount(
  originalPrice: string,
  voucher: VoucherInfo
): string {
  const price = parseFloat(originalPrice)
  const value = parseFloat(voucher.value)

  switch (voucher.priceMode) {
    case 'set':
      return value.toFixed(2)
    case 'subtract':
      return Math.max(0, price - value).toFixed(2)
    case 'percent':
      return Math.max(0, price - (price * value) / 100).toFixed(2)
    case 'none':
    default:
      return originalPrice
  }
}
