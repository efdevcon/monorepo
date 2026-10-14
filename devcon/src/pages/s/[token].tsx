/**
 * Buyer landing page behind the QR sharing page's code (devcon.org/s/<token>).
 * Two hops so a refresh is not a scan: the QR URL records the scan, binds a
 * voucher share to the first browser (cookie) and redirects to the same page
 * with `?view`, which only renders: the redeem button plus the links flagged
 * for this page, or the list of links (always a page, one link or many, so
 * the buyer sees where they are). Closed, unknown or someone else's tokens all get the same
 * "already used" page, which never reveals the redeem URL.
 */
import type { GetServerSideProps } from 'next'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { TICKETING_ENV } from 'config/ticketing'
import PriceTags from 'components/domain/tickets/qr-share/PriceTags'
import {
  getShareByToken,
  updateShare,
  canOpenShare,
  bindsBrowser,
  bindingKeyFor,
  listLinks,
  isWebUrl,
  type ShareLink,
  type SharePatch,
} from 'services/qr-shares'

const COOKIE = 'qr_share_browser'

type Props =
  | {
      state: 'voucher'
      token: string
      title: string
      priceEth: string | null
      priceFiat: string | null
      description: string | null
      targetUrl: string
      redeemed: boolean
      links: ShareLink[]
    }
  | { state: 'links'; token: string; links: ShareLink[] }
  | { state: 'used' }
  | { state: 'error' }

function readCookie(header: string | undefined): string | null {
  const m = (header ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-z0-9]+)`))
  return m ? m[1] : null
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, query, req, res }) => {
  const token = String(params?.token ?? '').toLowerCase()
  const viewing = query.view !== undefined
  try {
    const share = await getShareByToken(token, TICKETING_ENV)
    if (!share || share.status === 'closed') return { props: { state: 'used' } }
    const cookieKey = readCookie(req.headers.cookie)
    const access = canOpenShare(share, cookieKey)
    if (access === 'other') return { props: { state: 'used' } }
    if (!viewing) {
      // The scan itself: count, bind, then bounce to the view so a refresh
      // of what the buyer sees never counts again.
      const now = new Date().toISOString()
      const patch: SharePatch = { scanCount: share.scanCount + 1, status: 'scanned' }
      if (!share.scannedAt) patch.scannedAt = now
      if (access === 'first' && bindsBrowser(share)) {
        // One key per browser, shared by every share it opens; the cookie is
        // (re)set either way so its lifetime restarts at each new share.
        patch.browserKey = bindingKeyFor(cookieKey).key
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
        res.setHeader('Set-Cookie', `${COOKIE}=${patch.browserKey}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${secure}`)
      }
      await updateShare(share.id, patch)
      return { redirect: { destination: `/s/${token}/?view`, permanent: false } }
    }
    if (share.kind === 'links') return { props: { state: 'links', token, links: share.links.filter(l => isWebUrl(l.url)) } }
    // Links picked for this share first, then the ones flagged for every
    // redeem page, without repeating a URL.
    const flagged = (await listLinks()).filter(l => l.showOnRedeemPage).map(l => ({ label: l.label, url: l.url }))
    const seen = new Set<string>()
    const extra = [...share.links, ...flagged].filter(l => (seen.has(l.url) ? false : (seen.add(l.url), true)))
    return {
      props: {
        state: 'voucher',
        token,
        title: share.title,
        priceEth: share.priceEth,
        priceFiat: share.priceFiat,
        description: share.description,
        targetUrl: share.targetUrl && isWebUrl(share.targetUrl) ? share.targetUrl : '',
        redeemed: share.redeemed,
        links: extra,
      },
    }
  } catch (e) {
    console.error('[s/token]', (e as Error).message)
    return { props: { state: 'error' } }
  }
}

// Every button opens in a new tab so the buyer keeps this page (and its
// voucher button) while reading terms or filling a form.
const LinkButton = ({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={
      primary
        ? 'block w-full rounded-xl bg-[#7235ed] px-6 py-5 text-center text-xl font-semibold text-white no-underline shadow-md active:scale-[0.99]'
        : 'block w-full rounded-xl border border-solid border-[#b3abd1] bg-white px-6 py-4 text-center text-lg font-medium text-[#1a0d33] no-underline'
    }
  >
    {children}
  </a>
)

const STATUS_POLL_MS = 5_000

export default function SharePage(initial: Props) {
  // The admin can close (and re-open) a share while the buyer is looking at
  // it: poll a public yes/no endpoint and show "already used" while closed.
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (initial.state !== 'voucher' && initial.state !== 'links') return
    const token = initial.token
    const tick = async () => {
      try {
        const r = await fetch(`/api/qr-share/status/?token=${token}`, { cache: 'no-store' })
        const json = (await r.json()) as { open?: boolean }
        if (typeof json.open === 'boolean') setClosed(!json.open)
      } catch {
        // offline or flaky: keep what we have, try again next tick
      }
    }
    const t = setInterval(tick, STATUS_POLL_MS)
    return () => clearInterval(t)
  }, [initial])
  const props: Props = closed ? { state: 'used' } : initial
  return (
    <div className="min-h-screen bg-[#f4f1ff] px-4 py-10 font-sans text-[#1a0d33]">
      <Head>
        <title>Devcon tickets</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-[#7235ed]">Devcon 8 Mumbai</h1>
        {props.state === 'voucher' && (
          <>
            <h2 className="text-3xl font-bold">Redeem your voucher</h2>
            <p className="text-lg">{props.title}</p>
            <PriceTags eth={props.priceEth} fiat={props.priceFiat} size={22} />
            {props.redeemed && (
              <p className="rounded-lg bg-amber-100 p-3 text-amber-900">
                This voucher looks redeemed already. The ticket shop will tell you for sure.
              </p>
            )}
            <LinkButton href={props.targetUrl} primary>
              Open the ticket shop
            </LinkButton>
            {props.links.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-[#594d73]">Links</p>
                {props.links.map(l => (
                  <LinkButton key={l.url} href={l.url}>
                    {l.label}
                  </LinkButton>
                ))}
              </div>
            )}
          </>
        )}
        {props.state === 'links' && (
          <>
            <h2 className="text-3xl font-bold">Links</h2>
            {props.links.map(l => (
              <LinkButton key={l.url} href={l.url} primary>
                {l.label}
              </LinkButton>
            ))}
          </>
        )}
        {props.state === 'used' && (
          <>
            <h2 className="text-3xl font-bold">This code has already been used</h2>
            <p className="text-lg text-[#594d73]">Ask the Devcon team for a new one.</p>
          </>
        )}
        {props.state === 'error' && (
          <>
            <h2 className="text-3xl font-bold">Something went wrong</h2>
            <p className="text-lg text-[#594d73]">Please show this screen to the Devcon team and try again.</p>
          </>
        )}
      </main>
    </div>
  )
}
