/**
 * Ticket Order Store Service
 * Manages pending ticket orders between payment request and verification
 *
 * Uses file-based persistence in development to survive hot reloads.
 * In production, replace this with a proper database (PostgreSQL, Redis, etc.)
 */

import { PretixOrderCreateRequest } from '../types/pretix'
import fs from 'fs'
import path from 'path'

export interface PendingTicketOrder {
  paymentReference: string
  orderData: PretixOrderCreateRequest
  totalUsd: string
  createdAt: number
  expiresAt: number
  metadata?: {
    ticketIds: number[]
    addonIds?: number[]
    email: string
  }
}

export interface CompletedTicketOrder {
  paymentReference: string
  pretixOrderCode: string
  txHash: string
  payer: string
  completedAt: number
}

// File-based persistence for development (survives hot reloads)
const STORE_FILE = path.join(process.cwd(), '.ticket-store.json')

interface StoreData {
  pending: Record<string, PendingTicketOrder>
  completed: Record<string, CompletedTicketOrder>
}

function loadStore(): StoreData {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load ticket store:', e)
  }
  return { pending: {}, completed: {} }
}

function saveStore(data: StoreData): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Failed to save ticket store:', e)
  }
}

// Load initial state from file
let storeData = loadStore()
const pendingOrders = new Map<string, PendingTicketOrder>(Object.entries(storeData.pending))
const completedOrders = new Map<string, CompletedTicketOrder>(Object.entries(storeData.completed))

function persistStore(): void {
  const data: StoreData = {
    pending: Object.fromEntries(pendingOrders),
    completed: Object.fromEntries(completedOrders),
  }
  saveStore(data)
}

/**
 * Store a pending ticket order
 */
export function storePendingOrder(order: PendingTicketOrder): void {
  pendingOrders.set(order.paymentReference, order)
  persistStore()
}

/**
 * Get a pending order by payment reference
 */
export function getPendingOrder(paymentReference: string): PendingTicketOrder | undefined {
  // Always reload from file to handle hot reloads in development
  const freshData = loadStore()
  const order = freshData.pending[paymentReference]
  if (!order) return undefined

  // Check if expired
  if (Date.now() / 1000 > order.expiresAt) {
    pendingOrders.delete(paymentReference)
    persistStore()
    return undefined
  }

  // Update in-memory cache
  pendingOrders.set(paymentReference, order)
  return order
}

/**
 * Remove a pending order (after completion or cancellation)
 */
export function removePendingOrder(paymentReference: string): boolean {
  const result = pendingOrders.delete(paymentReference)
  persistStore()
  return result
}

/**
 * Store a completed order
 */
export function storeCompletedOrder(order: CompletedTicketOrder): void {
  completedOrders.set(order.paymentReference, order)
  // Remove from pending
  pendingOrders.delete(order.paymentReference)
  persistStore()
}

/**
 * Get a completed order by payment reference
 */
export function getCompletedOrder(paymentReference: string): CompletedTicketOrder | undefined {
  return completedOrders.get(paymentReference)
}

/**
 * Get completed order by Pretix order code
 */
export function getCompletedOrderByPretixCode(pretixOrderCode: string): CompletedTicketOrder | undefined {
  for (const order of completedOrders.values()) {
    if (order.pretixOrderCode === pretixOrderCode) {
      return order
    }
  }
  return undefined
}

/**
 * Clean up expired pending orders
 */
export function cleanupExpiredOrders(): void {
  const now = Date.now() / 1000
  let changed = false
  for (const [ref, order] of pendingOrders.entries()) {
    if (now > order.expiresAt) {
      pendingOrders.delete(ref)
      changed = true
    }
  }
  if (changed) {
    persistStore()
  }
}

/**
 * Get all pending orders (for debugging)
 */
export function getAllPendingOrders(): PendingTicketOrder[] {
  return Array.from(pendingOrders.values())
}

/**
 * Get store stats (for debugging)
 */
export function getStoreStats(): { pending: number; completed: number } {
  return {
    pending: pendingOrders.size,
    completed: completedOrders.size,
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredOrders, 5 * 60 * 1000)
}
