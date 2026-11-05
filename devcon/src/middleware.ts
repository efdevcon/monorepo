import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req: NextRequest) {
  const normalizedPathname = req.nextUrl.pathname.replace(/\/$/, '')

  if (
    normalizedPathname === '/qr-code/devcon-8-local-early-bird' ||
    normalizedPathname === '/en/qr-code/devcon-8-local-early-bird'
  ) {
    const redirectUrl = new URL('/en/tickets/store/', req.url)
    redirectUrl.search = req.nextUrl.search
    return NextResponse.redirect(redirectUrl)
  }

  // Printed QR codes: devcon.org/qr/<slug>[/<placement>]. The targets live in
  // a NocoDB table (services/qr-redirects.ts) read by /api/qr/, so the request is
  // rewritten there instead of taking the locale redirect first: one hop per
  // scan, and no redirect rule to maintain here or in netlify.toml.
  // Case-insensitive: a QR may encode the URL in capitals, which scanners
  // pass through as typed. `?svg` (the printable image, also /qr/x.svg) goes
  // to /api/qr-image/ instead: Netlify keys its CDN cache on the rewritten
  // path and ignores the query string, so the image and the redirect must not
  // share a path. No file extension in the target: the runtime answers a
  // rewrite to an extension path with a visible 308.
  const qr = normalizedPathname.match(/^\/(?:(?:en|hi|mr)\/)?qr(?:\/(.*))?$/i)
  if (qr) {
    const rest = (qr[1] ?? '').replace(/\.svg$/i, '')
    const wantsSvg = req.nextUrl.searchParams.has('svg') || /\.svg$/i.test(qr[1] ?? '')
    const target = new URL(`/api/${wantsSvg ? 'qr-image' : 'qr'}/${rest}`, req.url)
    if (wantsSvg) target.searchParams.set('svg', '')
    if (req.nextUrl.searchParams.has('download')) target.searchParams.set('download', '')
    return NextResponse.rewrite(target)
  }

  // In-person ticket QR codes: devcon.org/s/<token>. The page (pages/s/[token])
  // records the scan and binds the browser, so the request must reach it in
  // one hop: rewrite to the English route instead of bouncing through the
  // locale redirect. Case-insensitive like /qr/, tokens are lower-case base32.
  const share = normalizedPathname.match(/^\/(?:(?:en|hi|mr)\/)?s\/([a-z2-7]{12})$/i)
  if (share) {
    const target = new URL(`/en/s/${share[1].toLowerCase()}/`, req.url)
    target.search = req.nextUrl.search // keeps `?view`, the no-count second hop
    return NextResponse.rewrite(target)
  }

  if (req.nextUrl.pathname.startsWith('/grants') || req.nextUrl.pathname.startsWith('/speak')) {
    return
  }

  // The Devcon IX announcement page: lisbon/ builds into public/lisbon/, static
  // files outside the locale router. Next serves public files but does not
  // resolve a directory to its index.html, so /lisbon/ is rewritten there in
  // one hop (no /en/lisbon/). It has to happen here: with i18n on, Next matches
  // next.config.js rewrites against the locale-prefixed path, so a config
  // rewrite for /lisbon/ never fires. The page's assets have extensions and
  // pass through below. nextUrl.pathname has the locale stripped, so
  // /en/lisbon/ lands here too: one URL only, send those to /lisbon/.
  if (normalizedPathname === '/lisbon') {
    if (req.nextUrl.locale !== 'default') {
      const canonical = new URL('/lisbon/', req.url)
      canonical.search = req.nextUrl.search
      return NextResponse.redirect(canonical, 308)
    }
    return NextResponse.rewrite(new URL('/lisbon/index.html', req.url))
  }

  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/ticket/') ||
    req.nextUrl.pathname.includes('/api/') ||
    PUBLIC_FILE.test(req.nextUrl.pathname)
  ) {
    return
  }

  if (req.nextUrl.locale === 'default') {
    const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en'

    return NextResponse.redirect(new URL(`/${locale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url))
  }
}
