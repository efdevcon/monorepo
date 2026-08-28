import React from 'react'
import Head from 'next/head'
import { Hero } from 'components/domain/index/hero'
import { SessionSharing } from 'components/domain/session-sharing'
import { cleanDc8SessionType } from 'services/social-cards/track-images'
import { isPublicSubmissionState } from 'services/social-cards/submission-state'

/**
 * Shareable speaker-card page, linked from CFP acceptance emails so speakers
 * can share their session on X/Bluesky/Farcaster — the successor of DC7's
 * /sea/schedule/{code} (same Hero speakerMode design), with the event slug in
 * the path so Devcon 7 and Devcon 8 links are distinguishable at a glance:
 *
 *   /schedule/devcon8/{proposal_code}/            (acceptance emails)
 *   /schedule/devcon8/{proposal_code}/{version}/  (same page, fresh card)
 *   /schedule/sea/{proposal_code}/                (Devcon SEA, 2024 design)
 *
 * The optional trailing segment is a cache-buster, mirroring /ticket's. X and
 * Farcaster cache a preview per exact URL for about a week — including a
 * failed or half-rendered one — so re-posting the same link keeps serving the
 * dead preview. The page's share buttons therefore mint a fresh token per
 * click (see SessionSharing), and it rides through to the og:image path too.
 * It changes nothing about what the page renders, and the card route keys its
 * cache by session code, so a busted URL is not an extra render.
 *
 * Data comes LIVE from Pretalx (not api.devcon.org): acceptance emails go out
 * before the schedule is published/synced, so the API doesn't know these
 * sessions yet. Confirmed talks only in production.
 */

const PRETALX_BASE = process.env.PRETALX_BASE_URL || 'https://cfp.devcon.org/api'

const EVENTS: Record<string, { pretalxSlug: string; seoDescription?: string }> = {
  devcon8: {
    pretalxSlug: 'devcon8',
    seoDescription: 'Join us at Devcon 8, 3 — 6 November 2026 in Mumbai, India',
  },
  // Devcon SEA renders the original 2024 Hero page, wording and all.
  sea: {
    pretalxSlug: 'devcon7-sea',
  },
}

const CODE_RE = /^[A-Za-z0-9_-]{1,120}$/
// Deliberately narrow: the buster only ever needs to be a short opaque token,
// and it lands in og:url / og:image.
const VERSION_RE = /^[A-Za-z0-9_-]{1,40}$/

const SpeakerCard = (props: any) => {
  if (!props.params || !props.talk) return null
  const event = EVENTS[props.params.event]

  // Devcon SEA keeps the 2024 page exactly as it was.
  if (props.params.event === 'sea') {
    return <Hero talk={props.talk} speakerMode imageUrl={`${props.origin}${props.cardPath}`} />
  }

  // Devcon 8: the DC8 KV scene with the tilting session card.
  const title = `${props.talk.title} — Devcon 8`
  const description = event?.seoDescription ?? 'Join us at Devcon 8, 3 — 6 November 2026 in Mumbai, India'
  // Absolute for the crawlers, same path the on-page card requests relatively
  // — in production both resolve to one URL, so the preload below warms the
  // card the page itself shows (one render, not two).
  const imageUrl = `${props.origin}${props.cardPath}`
  const pageUrl = `${props.origin}${props.pagePath}`

  return (
    <>
      <Head>
        <title>{title}</title>
        {/* Same no-flash trick as /ticket: paint the scene color before hydration. */}
        <style>{`html, body { background-color: #221144; }`}</style>
        {/* Warm the OG cache from the speaker's browser so the crawler's
            scrape (seconds after they post) is a fast cache hit. */}
        <link rel="preload" as="image" href={imageUrl} />
        <meta name="description" key="description" content={description} />
        <meta property="og:type" key="og:type" content="website" />
        <meta property="og:url" key="og:url" content={pageUrl} />
        <meta property="og:title" key="og:title" content={title} />
        <meta property="og:description" key="og:description" content={description} />
        <meta property="og:image" key="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:card" key="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" key="twitter:title" content={title} />
        <meta name="twitter:description" key="twitter:description" content={description} />
        <meta name="twitter:image" key="twitter:image" content={imageUrl} />
        <meta name="theme-color" key="theme-color" content="#221144" />
      </Head>
      <SessionSharing
        talk={props.talk}
        shareBaseUrl={`${props.origin}${props.sharePageBase}`}
        cardImageUrl={props.cardPath}
      />
    </>
  )
}

/**
 * Server-rendered (not SSG) for the same reason /ticket is: the absolute URLs
 * in og:image / og:url have to name the host the visitor actually reached, and
 * only a request carries that. Netlify's DEPLOY_PRIME_URL / URL are build-only
 * (verified 2026-08-28: a preview still emitted devcon.org), so deploy previews
 * advertised the LIVE production card instead of the change under review, and
 * fetched the card twice. The HTML is cheap; the expensive part (the card
 * render) has its own cache, and the s-maxage below lets the CDN serve repeat
 * scrapes without re-hitting Pretalx.
 */
export async function getServerSideProps(context: any) {
  const event = EVENTS[context.params.event]
  if (!event) {
    return { notFound: true }
  }

  const proto = context.req.headers['x-forwarded-proto'] || 'https'
  const host = context.req.headers.host || 'devcon.org'
  const origin = `${proto}://${host}`

  // Catch-all route: [code] or [code, cacheBuster]. The buster is a URL-only
  // device for social scrapers — it never reaches Pretalx or the card render.
  const segments: string[] = Array.isArray(context.params.code) ? context.params.code : [context.params.code]
  const [code, cacheBuster] = segments
  if (
    segments.length > 2 ||
    !CODE_RE.test(code ?? '') ||
    (cacheBuster !== undefined && !VERSION_RE.test(cacheBuster))
  ) {
    return { notFound: true }
  }

  const res = await fetch(
    `${PRETALX_BASE}/events/${event.pretalxSlug}/submissions/${encodeURIComponent(
      code
    )}/?expand=track,submission_type,speakers`,
    {
      headers: { Authorization: `Token ${process.env.PRETALX_API_KEY}` },
    }
  )
  if (!res.ok) {
    // A code that 404s today may be accepted later — retry on the ISR cadence.
    return { notFound: true }
  }
  const data = await res.json()

  // ISR's replacement: repeat scrapes and refreshes are served by the CDN
  // rather than re-hitting Pretalx on every request.
  context.res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')

  // Only talks we have actually accepted are public — an unannounced,
  // rejected or withdrawn proposal must not be reachable by its code. Policy
  // (and the reason 'accepted' counts too) lives in submission-state.ts,
  // shared with the card renderers.
  if (!isPublicSubmissionState(data.state)) {
    return { notFound: true }
  }

  // Multilingual pretalx fields come as { en: ... } when expanded.
  const name = (v: any) => (typeof v === 'string' ? v : v?.en) ?? ''

  // The buster rides on the image as a PATH segment too (not a query param —
  // same call as /api/ticket/{name}/{buster}.jpg): scrapers and CDNs treat a
  // distinct path as a distinct resource far more reliably than a query
  // string, so the re-scrape refetches the bytes, not just the page. The card
  // route parses it off and keys its cache by code alone, so this costs no
  // extra render once the OG cache is on.
  const busterSegment = cacheBuster ? `${encodeURIComponent(cacheBuster)}/` : ''

  return {
    props: {
      params: context.params,
      origin,
      pagePath: `/schedule/${context.params.event}/${code}/${busterSegment}`,
      cardPath: `/api/social/schedule/${code}/${busterSegment}`,
      // Buster-free base the share buttons mint fresh links from.
      sharePageBase: `/schedule/${context.params.event}/${code}/`,
      talk: {
        id: code,
        title: data.title ?? '',
        // type/track/speakers are unused by the DC8 scene (its card is the
        // rendered social image) but drive the SEA Hero's SpeakerTicket.
        // Strip scheduling details ("Talk (20\"Talk+5\"Q&A)", "Workshop 1h")
        // from the Pretalx type name for display.
        type: cleanDc8SessionType(name(data.submission_type?.name ?? data.submission_type)),
        track: name(data.track?.name ?? data.track),
        speakers: (data.speakers || []).map((s: any) => ({
          name: s.name ?? '',
          // Old uploads still render on the retired hostname; the files were
          // restored onto the live host (2026-08-24), so rewrite instead of
          // showing a broken image.
          avatar: (s.avatar_url ?? s.avatar ?? '').replace(/^https?:\/\/speak\.devcon\.org\//, 'https://cfp.devcon.org/'),
        })),
      },
    },
  }
}

export default SpeakerCard
