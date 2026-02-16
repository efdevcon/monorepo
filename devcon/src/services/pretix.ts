/**
 * Comprehensive Pretix API Service
 */
import 'dotenv/config'
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

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  // Add api/v1/ if not present
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}
const baseUrl = normalizeBaseUrl(process.env.PRETIX_BASE_URL || 'https://ticketh.xyz/api/v1/')
const organizerName = process.env.PRETIX_ORGANIZER || 'devcon'
const eventName = process.env.PRETIX_EVENT || '7'

function getHeaders() {
  const apiToken = process.env.PRETIX_API_TOKEN
  if (!apiToken) {
    throw new Error('PRETIX_API_TOKEN environment variable is not set')
  }
  return {
    Authorization: `Token ${apiToken}`,
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
  return fetchPretix<PretixEvent>('')
}

export async function getItems(): Promise<PretixItem[]> {
  return fetchAllPages<PretixItem>('items/')
}

export async function getItem(itemId: number): Promise<PretixItem> {
  return fetchPretix<PretixItem>(`items/${itemId}/`)
}

export async function getCategories(): Promise<PretixCategory[]> {
  return fetchAllPages<PretixCategory>('categories/')
}

export async function getQuestions(): Promise<PretixQuestion[]> {
  return fetchAllPages<PretixQuestion>('questions/')
}

export async function getQuotas(): Promise<PretixQuota[]> {
  return fetchAllPages<PretixQuota>('quotas/')
}

export async function getQuotaAvailability(quotaId: number): Promise<PretixQuotaAvailability> {
  return fetchPretix<PretixQuotaAvailability>(`quotas/${quotaId}/availability/`)
}

export async function createOrder(order: PretixOrderCreateRequest): Promise<PretixOrder> {
  const url = `${baseUrl}organizers/${organizerName}/events/${eventName}/orders/`
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(order),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Pretix order creation failed ${response.status}: ${text}`)
  }

  return response.json()
}

export async function getOrder(orderCode: string): Promise<PretixOrder> {
  return fetchPretix<PretixOrder>(`orders/${orderCode}/`)
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
 * Get complete ticket purchase information including items, questions, and availability
 */
export async function getTicketPurchaseInfo(locale = 'en'): Promise<TicketPurchaseInfo> {
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

  // Build quota availability lookup
  const itemAvailability = new Map<number, { available: boolean; count: number | null }>()
  for (const quota of quotas) {
    try {
      const avail = await getQuotaAvailability(quota.id)
      for (const itemId of quota.items) {
        const existing = itemAvailability.get(itemId)
        if (!existing || (avail.available && !existing.available)) {
          itemAvailability.set(itemId, {
            available: avail.available,
            count: avail.available_number,
          })
        }
      }
    } catch (e) {
      console.error(`Failed to fetch availability for quota ${quota.id}:`, e)
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
        currency: event.currency,
        available: availability.available,
        availableCount: availability.count,
        isAdmission: item.admission,
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
      question: getLocalizedString(q.question, locale),
      helpText: q.help_text ? getLocalizedString(q.help_text, locale) : null,
      type: q.type,
      required: q.required,
      appliesToItems: q.items,
      options: q.options.map((opt) => ({
        id: opt.id,
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
