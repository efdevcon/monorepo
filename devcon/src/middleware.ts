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
  const qr = normalizedPathname.match(/^\/(?:(?:en|hi|mr)\/)?qr(?:\/(.*))?$/)
  if (qr) {
    return NextResponse.rewrite(new URL(`/api/qr/${qr[1] ?? ''}`, req.url))
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
