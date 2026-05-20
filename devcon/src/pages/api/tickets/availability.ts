import type { NextApiRequest, NextApiResponse } from 'next'
import { getQuotaAvailability } from 'services/pretix'
import { hasAvailableVouchers } from 'services/discountStore'
import { TICKET_WAVES } from 'config/waves'

/**
 * Returns per-wave Pretix availability. Each wave in `TICKET_WAVES` with a
 * configured `quotaId` is queried in parallel; the response is a map keyed by
 * the wave id so the client can look up inventory by wave without coupling to
 * specific quota numbers.
 *
 * Waves without a `quotaId` simply don't appear in the map — the client
 * treats that as "not yet known" and falls back to the time-only logic.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(400).json({ code: 400, message: 'Invalid method.' })
  }

  const waves = TICKET_WAVES.filter((w): w is typeof w & { quotaId: number } => typeof w.quotaId === 'number')

  try {
    const [perWave, vouchersAvailable] = await Promise.all([
      Promise.all(
        waves.map(async w => {
          try {
            const data = await getQuotaAvailability(w.quotaId)
            // Deliberately omit `available_number` from the response. The
            // boolean `available` is enough for every UI consumer (the wave
            // either shows "Open Now" or stays in countdown / sold-out
            // state); the raw count is sensitive — it leaks live inventory
            // to anyone who polls this endpoint, useful for scalper bots,
            // competitive observers, and timing-attack flows. Keep
            // `quotaId` because the client treats it as an opaque key, not
            // a meaningful number.
            return [
              w.id,
              { available: !!data.available, quotaId: w.quotaId },
            ] as const
          } catch (err) {
            console.error(`Unable to fetch quota ${w.quotaId} for wave ${w.id}:`, err)
            return null
          }
        }),
      ).then(entries => Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, unknown]>)),
      hasAvailableVouchers().catch(() => undefined),
    ])

    // CDN cache: `s-maxage=30` matches the in-process `cachedFetch` TTL on
    // `getQuotaAvailability`, so the CDN refreshes at the same cadence the
    // server-side cache would re-fetch anyway. `stale-while-revalidate=60`
    // lets the CDN serve a slightly-stale response while it refreshes in the
    // background — keeps the polling endpoint responsive without the
    // function having to run on every visitor's 60-second tick.
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      code: 200,
      message: '',
      data: {
        waves: perWave,
        vouchers_available: vouchersAvailable,
      },
    })
  } catch (error) {
    console.error('Unable to fetch ticket availability:', error)
    return res.status(500).json({ code: 500, message: 'Unable to fetch ticket availability' })
  }
}
