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
            return [
              w.id,
              { available: !!data.available, available_number: data.available_number ?? null, quotaId: w.quotaId },
            ] as const
          } catch (err) {
            console.error(`Unable to fetch quota ${w.quotaId} for wave ${w.id}:`, err)
            return null
          }
        }),
      ).then(entries => Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, unknown]>)),
      hasAvailableVouchers().catch(() => undefined),
    ])

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
