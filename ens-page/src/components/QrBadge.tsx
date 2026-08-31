import { useMemo } from 'react'
import qrcode from 'qrcode-generator'
import { ENS_NAME } from '../config'

// Desktop-only corner badge: scanning it opens the canonical eth.limo URL on
// a phone, no matter which gateway or preview the desktop visitor is on.
// Generated locally (zero-dependency) so the IPFS bundle stays self-contained.
export function QrBadge() {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(`https://${ENS_NAME}.limo/`)
    qr.make()
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true })
  }, [])

  // Show only when the right gutter actually fits the badge: the card is
  // max-w-2xl (672px) centered, the badge ~190px incl. its right offset, so
  // the viewport needs 672 + 2×~220 ≈ 1120px before it stops crowding the
  // card (Tailwind's lg=1024 was too early).
  return (
    <div className="fixed bottom-4 right-4 hidden flex-col items-center gap-2 rounded-2xl bg-white/80 p-4 shadow-md ring-1 ring-white/60 backdrop-blur-xl dark:bg-neutral-900/80 dark:ring-white/10 min-[1120px]:flex">
      {/* The QR sits on a solid white tile so it stays scannable in dark mode. */}
      <div
        className="h-24 w-24 rounded-lg bg-white p-1 [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Scan to open on mobile</span>
    </div>
  )
}
