/**
 * Pretix API Types
 */

export interface PretixPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PretixLocalizedString {
  [locale: string]: string
}

export interface PretixEvent {
  name: PretixLocalizedString
  slug: string
  currency: string
  date_from: string
  date_to: string | null
  date_admission: string | null
  is_public: boolean
  presale_start: string | null
  presale_end: string | null
  location: PretixLocalizedString | null
  geo_lat: number | null
  geo_lon: number | null
  has_subevents: boolean
  seating_plan: number | null
  plugins: string[]
  testmode: boolean
  live: boolean
}

export interface PretixCategory {
  id: number
  name: PretixLocalizedString
  description: PretixLocalizedString | null
  position: number
  is_addon: boolean
}

export interface PretixItemAddon {
  addon_category: number
  min_count: number
  max_count: number
  position: number
  multi_allowed: boolean
  price_included: boolean
}

export interface PretixItemVariation {
  id: number
  value: PretixLocalizedString
  active: boolean
  description: PretixLocalizedString | null
  position: number
  default_price: string | null
  price: string
  original_price: string | null
  free_price: boolean
  available_from: string | null
  available_until: string | null
  sales_channels: string[]
  require_membership: boolean
}

export interface PretixItem {
  id: number
  name: PretixLocalizedString
  internal_name: string | null
  description: PretixLocalizedString | null
  active: boolean
  category: number | null
  position: number
  default_price: string
  free_price: boolean
  admission: boolean
  available_from: string | null
  available_until: string | null
  sales_channels: string[]
  require_voucher: boolean
  hide_without_voucher: boolean
  allow_cancel: boolean
  min_per_order: number | null
  max_per_order: number | null
  has_variations: boolean
  variations: PretixItemVariation[]
  addons: PretixItemAddon[]
  bundles: any[]
  original_price: string | null
  require_membership: boolean
  require_approval: boolean
  generate_tickets: boolean | null
  show_quota_left: boolean | null
  checkin_attention: boolean
  meta_data: Record<string, string>
}

export interface PretixQuestionOption {
  id: number
  position: number
  identifier: string
  answer: PretixLocalizedString
}

export interface PretixQuestion {
  id: number
  question: PretixLocalizedString
  help_text: PretixLocalizedString | null
  type: 'N' | 'S' | 'T' | 'B' | 'C' | 'M' | 'F' | 'D' | 'H' | 'W' | 'CC' | 'TEL' // Number, String, Text, Boolean, Choice, Multiple choice, File, Date, Time, Datetime, Country code, Phone
  required: boolean
  position: number
  ask_during_checkin: boolean
  hidden: boolean
  identifier: string
  items: number[] // Item IDs this question applies to
  options: PretixQuestionOption[]
  dependency_question: number | null
  dependency_values: string[]
  valid_number_min: number | null
  valid_number_max: number | null
  valid_date_min: string | null
  valid_date_max: string | null
  valid_datetime_min: string | null
  valid_datetime_max: string | null
  valid_file_portrait: boolean
}

export interface PretixQuota {
  id: number
  name: string
  size: number | null
  items: number[]
  variations: number[]
  subevent: number | null
  close_when_sold_out: boolean
  closed: boolean
  release_after_exit: boolean
  available_number: number | null
  available: boolean
  ignore_for_event_availability: boolean
}

export interface PretixQuotaAvailability {
  available: boolean
  available_number: number | null
  total_size: number | null
  pending_orders: number
  paid_orders: number
  exited_orders: number
  cart_positions: number
  blocking_vouchers: number
  waiting_list: number
}

export interface PretixOrderPosition {
  item: number
  variation: number | null
  price: string
  attendee_name: string | null
  attendee_name_parts: Record<string, string>
  attendee_email: string | null
  company: string | null
  street: string | null
  zipcode: string | null
  city: string | null
  country: string | null
  state: string | null
  addon_to: number | null
  subevent: number | null
  answers: PretixAnswerInput[]
  seat: string | null
  voucher: string | null
}

export interface PretixAnswerInput {
  question: number
  answer: string
  options?: number[]
}

export interface PretixOrderCreateRequest {
  email: string
  locale?: string
  sales_channel?: string
  payment_provider?: string
  invoice_address?: {
    is_business: boolean
    company?: string
    name?: string
    name_parts?: Record<string, string>
    street?: string
    zipcode?: string
    city?: string
    country?: string
    state?: string
    vat_id?: string
    internal_reference?: string
  }
  positions: PretixOrderPosition[]
  fees?: {
    fee_type: string
    value: string
    description?: string
    internal_type?: string
    tax_rule?: number
  }[]
  comment?: string
  payment_info?: Record<string, unknown>
  checkin_attention?: boolean
  custom_followup_at?: string
  testmode?: boolean
  consume_carts?: string[]
  force?: boolean
  send_email?: boolean
}

export interface PretixOrder {
  code: string
  status: 'n' | 'p' | 'e' | 'c' // pending, paid, expired, canceled
  testmode: boolean
  secret: string
  email: string
  phone: string | null
  locale: string
  datetime: string
  expires: string
  payment_date: string | null
  payment_provider: string | null
  fees: any[]
  total: string
  comment: string
  invoice_address: any
  positions: any[]
  payments: { local_id: number; provider: string; payment_url: string | null; state: string; details?: Record<string, unknown> }[]
  downloads: any[]
  checkin_attention: boolean
  require_approval: boolean
  sales_channel: string
  url: string
  last_modified: string
}

// Formatted types for the API response (simplified for clients)
export interface TicketInfo {
  id: number
  name: string
  description: string | null
  price: string
  originalPrice: string | null
  currency: string
  available: boolean
  availableCount: number | null
  isAdmission: boolean
  requireVoucher: boolean
  variations: {
    id: number
    name: string
    price: string
    available: boolean
  }[]
  addons: {
    categoryId: number
    categoryName: string
    minCount: number
    maxCount: number
    items: {
      id: number
      name: string
      description: string | null
      price: string
      available: boolean
      variations: {
        id: number
        name: string
        price: string
      }[]
    }[]
  }[]
}

export interface QuestionInfo {
  id: number
  identifier: string
  question: string
  helpText: string | null
  type: string
  required: boolean
  appliesToItems: number[]
  options: {
    id: number
    identifier: string
    answer: string
  }[]
  dependsOn?: {
    questionId: number
    values: string[]
  }
}

export interface TicketPurchaseInfo {
  event: {
    name: string
    currency: string
    dateFrom: string
    dateTo: string | null
    location: string | null
  }
  tickets: TicketInfo[]
  questions: QuestionInfo[]
  categories: {
    id: number
    name: string
    isAddon: boolean
  }[]
  attendeeNameAsked: boolean
  attendeeNameRequired: boolean
}
