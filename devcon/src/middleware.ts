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

  // Printed QR codes for the event app, optionally with a placement segment
  // (/qr/app/airport-banner). Netlify serves the same redirects in production
  // (netlify.toml); this keeps local runs and previews consistent.
  const qrApp = normalizedPathname.match(/^\/(?:en\/)?qr\/app(?:\/([a-z0-9-]+))?$/)
  if (qrApp) {
    const target = new URL('https://app.devcon.org/')
    target.searchParams.set('mtm_campaign', 'qr')
    target.searchParams.set('mtm_kwd', 'app')
    if (qrApp[1]) target.searchParams.set('mtm_placement', qrApp[1])
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
