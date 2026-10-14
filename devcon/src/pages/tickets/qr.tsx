/**
 * QR sharing page (the device at the desk): a big QR for whatever the admin last pushed from
 * /tickets/qr-admin/, flipping to "Scanned" once the buyer opened it. Polls
 * every 2.5 s so a push from the admin shows up almost at once. Admin or
 * read-only password. Links are pushed from the admin page too; this page
 * only ever shows what is active.
 */
import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import QRCode from 'qrcode'
import { CheckCircle2, LogOut } from 'lucide-react'
import { TICKETING_ENV } from 'config/ticketing'
import { useAdminKey } from 'components/domain/tickets/qr-share/useAdminKey'
import AdminLogin from 'components/domain/tickets/qr-share/AdminLogin'
import { qrApi } from 'components/domain/tickets/qr-share/api'
import PriceTags from 'components/domain/tickets/qr-share/PriceTags'
import type { PublicShare } from 'services/qr-shares'

const POLL_MS = 2_500

export default function QrSharingPage() {
  const { key, checking, login, logout } = useAdminKey()
  if (checking) return null
  if (!key) return <AdminLogin title="QR sharing" onLogin={login} />
  return <SharingScreen adminKey={key} onLogout={logout} />
}

/** The QR as a data URL, rendered in the browser with the same library the
 *  printed QR route uses server-side (qrcode.react ships no types). */
function QrImage({ value }: { value: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: 640, margin: 2, errorCorrectionLevel: 'M' }).then(url => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [value])
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR code" className="h-80 w-80 max-w-full" /> : <div className="h-80 w-80" />
}

function SharingScreen({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  // Embedded in the admin page (?embed=1): no top bar, the admin has its own.
  const embedded = useRouter().query.embed !== undefined
  const [share, setShare] = useState<PublicShare | null>(null)
  const [banner, setBanner] = useState('')
  const [origin, setOrigin] = useState('')

  const load = useCallback(async () => {
    try {
      const a = await qrApi<{ share: PublicShare | null }>(adminKey, 'active')
      setShare(a.share)
      setBanner('')
    } catch (e) {
      setBanner((e as Error).message)
    }
  }, [adminKey])

  useEffect(() => {
    setOrigin(window.location.origin)
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [adminKey, load])

  // Every code is one scan: after it, the QR leaves the screen until the
  // admin pushes the next one ("show again" re-issues a multi-use voucher).
  // Redemption is the admin page's business; this screen never shows it.
  const scanned = share?.status === 'scanned'

  return (
    <div className="flex min-h-screen flex-col items-center bg-white p-4 text-[#1a0d33]">
      <Head>
        <title>QR sharing</title>
      </Head>
      {!embedded && (
        <div className="flex w-full max-w-lg items-center justify-between text-sm text-[#594d73]">
          <span>
            {TICKETING_ENV !== 'production' && (
              <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">DEV</span>
            )}
          </span>
          <button onClick={onLogout} className="flex items-center gap-1">
            <LogOut size={14} /> Log out
          </button>
        </div>
      )}
      {banner && <div className="mt-4 w-full max-w-lg rounded-lg bg-red-100 p-3 text-red-800">{banner}</div>}

      <main className="flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
        {!share ? (
          <p className="text-2xl text-[#594d73]">Waiting for the next code…</p>
        ) : scanned ? (
          <>
            <CheckCircle2 size={160} className="text-green-600" />
            <h1 className="text-3xl font-bold">Scanned</h1>
            <p className="text-[#594d73]">Waiting for the next code…</p>
          </>
        ) : (
          <>
            {/* Same "What" as the admin table: the title, plus the link count a
                voucher carries. */}
            <h1 className="text-2xl font-bold">
              {share.title}
              {share.kind === 'voucher' && share.links.length > 0 && (
                <span className="ml-2 text-base font-normal text-[#594d73]">
                  + {share.links.length} link{share.links.length === 1 ? '' : 's'}
                </span>
              )}
            </h1>
            <PriceTags eth={share.priceEth} fiat={share.priceFiat} size={26} />
            {origin && <QrImage value={`${origin}/s/${share.token}/`} />}
            {/* The caption doubles as a link to the buyer page: handy for testing
                without a second device, same URL the QR encodes. */}
            <a
              href={origin ? `${origin}/s/${share.token}/` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-medium text-[#1a0d33] underline decoration-dotted underline-offset-4"
            >
              {share.kind === 'voucher' ? 'Scan to open the ticket shop' : 'Scan to open the links'}
            </a>
          </>
        )}
      </main>
    </div>
  )
}
