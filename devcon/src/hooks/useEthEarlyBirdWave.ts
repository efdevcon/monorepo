import { TICKET_WAVE_TIMES } from 'config/waves'
import { useTicketAvailability } from './useTicketAvailability'
import { useWaveCountdown } from './useWaveCountdown'

export interface EthEarlyBirdWaveState {
  // True once the client-side ticker has started. Pre-mount, status defaults
  // to 'countdown' and `countdown` is null — components should treat this as
  // a loading/SSR state and render a neutral placeholder if needed.
  mounted: boolean
  // 'live'      — wave is open right now (Pretix says available, OR we're inside
  //               the 5-minute grace window after a wave time just passed).
  // 'countdown' — next wave is in the future, show the formatted countdown.
  // 'closed'    — all wave times have passed AND Pretix reports no availability.
  status: 'live' | 'countdown' | 'closed'
  // Formatted countdown to the next wave, e.g. "9d 4h 12m 38s".
  // Only meaningful when status === 'countdown'; null otherwise.
  countdown: string | null
  // Next wave Date (callers that want to format their own way).
  upcoming: Date | null
}

/**
 * Single source of truth for the ETH Early Bird wave state across the site.
 * Combines the live Pretix quota poll with the static wave schedule so every
 * surface (tickets table, store card, header strip, hero) renders the same
 * thing at the same time.
 */
export function useEthEarlyBirdWave(): EthEarlyBirdWaveState {
  const wave = useWaveCountdown(TICKET_WAVE_TIMES)
  const availability = useTicketAvailability()

  if (!wave.mounted) {
    return { mounted: false, status: 'countdown', countdown: null, upcoming: null }
  }

  const isLive = !!(availability.available || wave.withinGraceWindow)

  if (isLive) {
    return { mounted: true, status: 'live', countdown: null, upcoming: wave.upcoming }
  }

  if (wave.upcoming) {
    return { mounted: true, status: 'countdown', countdown: wave.countdown, upcoming: wave.upcoming }
  }

  return { mounted: true, status: 'closed', countdown: null, upcoming: null }
}
