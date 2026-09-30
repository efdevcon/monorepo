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

  // Printed QR codes: /qr/<target> with an optional placement segment
  // (/qr/app/airport, /qr/guide/venue). Netlify serves the same redirects in
  // production (netlify.toml); this keeps local runs and previews consistent.
  const qr = normalizedPathname.match(/^\/(?:en\/)?qr\/(app|guide)(?:\/([a-z0-9-]+))?$/)
  if (qr) {
    const target = qr[1] === 'app' ? new URL('https://app.devcon.org/') : new URL('/en/travel-guide/', req.url)
    target.searchParams.set('mtm_campaign', 'qr')
    target.searchParams.set('mtm_kwd', qr[1])
    if (qr[2]) target.searchParams.set('mtm_placement', qr[2])
    return NextResponse.redirect(target)
  }

  if (req.nextUrl.pathname.startsWith('/grants') || req.nextUrl.pathname.startsWith('/speak')) {
    return
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
