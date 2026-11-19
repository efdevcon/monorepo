import type { NextApiRequest, NextApiResponse } from 'next'
import { listRows } from 'services/nocodb'

// Server-only helpers for the survey review endpoints
// (pages/api/survey/review/[viewId]/*).

// Rows are cached briefly per survey so that role-chip clicks and moving
// between the review pages don't re-read the whole table each time. Responses
// still appear within this window; saving a note clears the cache.
const ROWS_TTL_MS = 30_000
const rowsCache = new Map<string, { at: number; rows: Promise<Record<string, unknown>[]> }>()

/**
 * Every response of a survey, sorted by Id. `fresh` skips the cache (and
 * refreshes it): the side panel list uses it because it shows which responses
 * have notes, and serverless instances don't share the cache, so clearing it
 * after a note save only helps the instance that saved.
 */
export function getSurveyRows(viewId: string, { fresh = false } = {}): Promise<Record<string, unknown>[]> {
  const cached = rowsCache.get(viewId)
  if (!fresh && cached && Date.now() - cached.at < ROWS_TTL_MS) return cached.rows
  const rows = listRows(viewId, { sort: 'Id' })
  rowsCache.set(viewId, { at: Date.now(), rows })
  // Don't keep a failed load, but don't remove a newer entry either.
  rows.catch(() => {
    if (rowsCache.get(viewId)?.rows === rows) rowsCache.delete(viewId)
  })
  return rows
}

export function invalidateSurveyRows(viewId: string) {
  rowsCache.delete(viewId)
}

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>

/**
 * Wraps a survey review endpoint so a NocoDB failure returns the repo's
 * `{ success: false, error }` JSON instead of Next's HTML error page.
 */
export function surveyHandler(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      console.error('[survey/review]', err)
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'Could not load the survey from NocoDB. Try again in a moment.',
          details: err instanceof Error ? err.message : undefined,
        })
      }
    }
  }
}
