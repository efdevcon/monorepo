/**
 * Control page for in-person ticket sales: paste a voucher redeem link and/or
 * tick saved links to put a QR on the QR sharing page (/tickets/qr/), watch
 * scans and redemptions, show again or close codes. Admin password only.
 */
import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { RefreshCw, XCircle, LogOut, Trash2, ExternalLink, RotateCcw } from 'lucide-react'
import { TICKETING_ENV } from 'config/ticketing'
import { useAdminKey } from 'components/domain/tickets/qr-share/useAdminKey'
import AdminLogin from 'components/domain/tickets/qr-share/AdminLogin'
import SharePanel from 'components/domain/tickets/qr-share/SharePanel'
import { qrApi } from 'components/domain/tickets/qr-share/api'
import PriceTags from 'components/domain/tickets/qr-share/PriceTags'
import type { PublicShare, QrLink } from 'services/qr-shares'

const LIST_POLL_MS = 10_000

export default function QrAdminPage() {
  const { key, role, checking, login, logout } = useAdminKey()
  if (checking) return null
  if (!key) return <AdminLogin title="QR sharing admin" onLogin={login} />
  if (role !== 'admin') {
    return (
      <div className="p-8 text-center text-[#1a0d33]">
        <p className="mb-4">
          This page needs the admin password. The read-only password works on the QR sharing page, /tickets/qr/.
        </p>
        <button onClick={logout} className="underline">
          Log out
        </button>
      </div>
    )
  }
  return <Dashboard adminKey={key} onLogout={logout} />
}

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

function Dashboard({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const [shares, setShares] = useState<PublicShare[]>([])
  const [links, setLinks] = useState<QrLink[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        qrApi<{ shares: PublicShare[] }>(adminKey, 'list'),
        qrApi<{ links: QrLink[] }>(adminKey, 'links'),
      ])
      setShares(s.shares)
      setLinks(l.links)
      setBanner('')
    } catch (e) {
      setBanner((e as Error).message)
    }
  }, [adminKey])

  useEffect(() => {
    load()
    const t = setInterval(load, LIST_POLL_MS)
    return () => clearInterval(t)
  }, [load])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Each action patches the table with the server's answer right away; the
  // reload that follows only confirms it, so a click never waits for a poll.
  const putOnDevice = (created: PublicShare, resharedId?: number) =>
    setShares(prev => [
      created,
      ...prev.map(s => ({
        ...s,
        active: false,
        // Show again closes only a share nobody scanned; a scanned one stays valid for its buyer.
        ...(s.id === resharedId && s.status === 'open' ? { status: 'closed' as const } : {}),
      })),
    ])
  const reshare = (id: number) =>
    run(async () => {
      const r = await qrApi<{ share: PublicShare }>(adminKey, 'reshare', { method: 'POST', body: { id } })
      putOnDevice(r.share, id)
    })
  const close = (id: number) =>
    run(async () => {
      await qrApi(adminKey, 'close', { method: 'POST', body: { id } })
      setShares(prev => prev.map(s => (s.id === id ? { ...s, status: 'closed', active: false } : s)))
    })
  const reopen = (id: number) =>
    run(async () => {
      const r = await qrApi<{ share: PublicShare }>(adminKey, 'reopen', { method: 'POST', body: { id } })
      setShares(prev => prev.map(s => (s.id === id ? { ...s, status: r.share.status } : s)))
    })
  const remove = (s: PublicShare) => {
    if (!window.confirm(`Delete "${s.title}" from the list? Its code stops working.`)) return
    run(async () => {
      await qrApi(adminKey, 'delete', { method: 'POST', body: { id: s.id } })
      setShares(prev => prev.filter(x => x.id !== s.id))
    })
  }
  const reset = () => {
    const what = shares.length === 1 ? 'the only share' : `all ${shares.length} shares`
    if (!window.confirm(`Delete ${what}? Every code stops working and the device shows "Waiting". The saved links stay.`)) return
    run(async () => {
      await qrApi(adminKey, 'reset', { method: 'POST' })
      setShares([])
    })
  }

  const rowBtn =
    'inline-flex items-center gap-1 rounded-md border border-solid border-[#b3abd1] bg-white px-2 py-1 text-xs font-medium text-[#1a0d33] disabled:opacity-50'

  return (
    <div className="min-h-screen bg-[#f4f1ff] p-4 text-[#1a0d33] md:p-8">
      <Head>
        <title>QR sharing admin</title>
      </Head>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          QR sharing admin
          {TICKETING_ENV !== 'production' && (
            <span className="ml-2 rounded bg-amber-200 px-2 py-0.5 align-middle text-xs font-semibold text-amber-900">DEV</span>
          )}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={onLogout} className="flex items-center gap-1">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>
      {banner && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-800">{banner}</div>}

      {/* The share controls next to a live copy of the QR sharing page: what the
          device shows right now, same login, polling on its own. */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SharePanel adminKey={adminKey} links={links} busy={busy} error={error} run={run} onShared={share => putOnDevice(share)} />
        <aside className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 text-sm text-[#594d73]">
            <span>On the device now</span>
            <Link href="/tickets/qr/" target="_blank" className="flex items-center gap-1 underline">
              Open <ExternalLink size={12} />
            </Link>
          </div>
          <iframe src="/tickets/qr/?embed=1" title="QR sharing page" className="h-[560px] w-full border-0 border-t border-solid border-[#eee]" />
        </aside>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Shares</h2>
          <button onClick={reset} disabled={busy || !shares.length} className={`${rowBtn} border-red-300 text-red-700`} title="Delete every share">
            <Trash2 size={14} /> Reset
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#594d73]">
                <th className="py-1">Shared</th>
                <th>What</th>
                <th>Code</th>
                <th>Price</th>
                <th>Status</th>
                <th>Scans</th>
                <th>Redeemed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shares.map(s => (
                <tr key={s.id} className={`border-t border-solid border-[#eee] ${s.active && s.status === 'open' ? 'bg-[#efe9ff]' : ''}`}>
                  <td className="whitespace-nowrap py-2">{time(s.sharedAt)}</td>
                  <td className="whitespace-nowrap">
                    {/* Same page the buyer sees after scanning (the no-count view). */}
                    <a
                      href={`/s/${s.token}/?view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-4"
                    >
                      {s.title}
                    </a>
                    {s.kind === 'voucher' && s.links.length > 0 && (
                      <span className="ml-1 text-xs text-[#594d73]">+ {s.links.length} link{s.links.length === 1 ? '' : 's'}</span>
                    )}
                    {/* The badge means "this QR is on the screen right now"; after a
                        scan the device shows the Scanned screen instead. */}
                    {s.active && s.status === 'open' && (
                      <span className="ml-2 rounded bg-[#7235ed] px-1.5 py-0.5 text-xs text-white">on device</span>
                    )}
                  </td>
                  <td className="font-mono">{s.voucherCode ?? ''}</td>
                  <td className="whitespace-nowrap">
                    <PriceTags eth={s.priceEth} fiat={s.priceFiat} size={14} />
                  </td>
                  <td>
                    {s.status}
                    {s.scannedAt ? ` ${time(s.scannedAt)}` : ''}
                  </td>
                  <td>{s.scanCount}</td>
                  <td>{s.kind !== 'voucher' ? '' : s.maxUsages === 1 ? (s.redeemed ? 'yes' : 'no') : `${s.redemptions}/${s.maxUsages || '∞'}`}</td>
                  <td className="whitespace-nowrap text-right">
                    {/* Close kills the code and takes the share off the device; now
                        that every share lands on a page, links shares get it too. */}
                    {s.status !== 'closed' ? (
                      <button onClick={() => close(s.id)} disabled={busy} title="Take it off the device and kill its code" className={`${rowBtn} mr-2`}>
                        <XCircle size={14} /> Close
                      </button>
                    ) : (
                      <button onClick={() => reopen(s.id)} disabled={busy} title="Make its code work again (not on the device)" className={`${rowBtn} mr-2`}>
                        <RotateCcw size={14} /> Re-open
                      </button>
                    )}
                    {!(s.kind === 'voucher' && s.redeemed) && (
                      <button
                        onClick={() => reshare(s.id)}
                        disabled={busy}
                        title="Put it back on the device with a fresh code"
                        className={`${rowBtn} border-[#7235ed] text-[#7235ed]`}
                      >
                        <RefreshCw size={14} /> Show again
                      </button>
                    )}
                    <button onClick={() => remove(s)} disabled={busy} title="Delete this share" className="ml-2 rounded p-1 text-[#594d73] hover:bg-[#f4f1ff] disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!shares.length && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-[#594d73]">
                    Nothing shared yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
