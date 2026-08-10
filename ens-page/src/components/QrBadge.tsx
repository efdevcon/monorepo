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

  return (
    <div className="fixed bottom-4 right-4 hidden flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-md lg:flex">
      <div className="h-24 w-24 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="text-xs text-neutral-500">Scan to open on mobile</span>
    </div>
  )
}
