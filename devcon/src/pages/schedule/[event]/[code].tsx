import React from 'react'
import Head from 'next/head'
import { Hero } from 'components/domain/index/hero'
import { SessionSharing } from 'components/domain/session-sharing'
import { APP_CONFIG } from 'utils/config'

/**
 * Shareable speaker-card page, linked from CFP acceptance emails so speakers
 * can share their session on X/Bluesky/Farcaster — the successor of DC7's
 * /sea/schedule/{code} (same Hero speakerMode design), with the event slug in
 * the path so Devcon 7 and Devcon 8 links are distinguishable at a glance:
 *
 *   /schedule/devcon8/{proposal_code}/   (acceptance emails)
 *   /schedule/sea/{proposal_code}/       (Devcon SEA, same design as 2024)
 *
 * Data comes LIVE from Pretalx (not api.devcon.org): acceptance emails go out
 * before the schedule is published/synced, so the API doesn't know these
 * sessions yet. Confirmed talks only in production. The og:image is the
 * Supabase-cached social card (/api/social/schedule), which requires the
 * session to be synced — see the card note in the event map.
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

const SpeakerCard = (props: any) => {
  if (!props.params || !props.talk) return null
  const event = EVENTS[props.params.event]

  // Devcon SEA keeps the 2024 page exactly as it was.
  if (props.params.event === 'sea') {
    return (
      <Hero
        talk={props.talk}
        speakerMode
        imageUrl={`https://devcon.org/api/social/schedule/${props.talk.id}/`}
      />
    )
  }

  // Devcon 8: the DC8 ticket-share design (cosmic scene + tilting card).
  // The og:image intentionally stays the SEA-clone social card until the
  // DC8 brand pass on /api/social/schedule lands.
  const title = `${props.talk.title} — Devcon 8`
  const description = event?.seoDescription ?? 'Join us at Devcon 8, 3 — 6 November 2026 in Mumbai, India'
  const imageUrl = `https://devcon.org/api/social/schedule/${props.talk.id}/`
  const pageUrl = `https://devcon.org/schedule/${props.params.event}/${props.talk.id}/`

  return (
    <>
      <Head>
        <title>{title}</title>
        {/* Same no-flash trick as /ticket: paint the scene color before hydration. */}
        <style>{`html, body { background-color: #1a0a3e; }`}</style>
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
        <meta name="theme-color" key="theme-color" content="#1a0a3e" />
      </Head>
      <SessionSharing talk={props.talk} pageUrl={pageUrl} />
    </>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const event = EVENTS[context.params.event]
  if (!event) {
    return { notFound: true }
  }

  const res = await fetch(
    `${PRETALX_BASE}/events/${event.pretalxSlug}/submissions/${encodeURIComponent(
      context.params.code
    )}/?expand=track,submission_type,speakers`,
    {
      headers: { Authorization: `Token ${process.env.PRETALX_API_KEY}` },
    }
  )
  if (!res.ok) {
    // A code that 404s today may be accepted later — retry on the ISR cadence.
    return { notFound: true, revalidate: 300 }
  }
  const data = await res.json()

  // Acceptance emails link these pages, but only talks the speaker has
  // CONFIRMED are public. Dev/preview shows any state for testing.
  // TEMPORARY: devcon8 is exempt while acceptances roll out (2026-08-26) —
  // re-add it once the CFP confirmation flow is underway by deleting the
  // `event.pretalxSlug !== 'devcon8'` condition.
  if (APP_CONFIG.NODE_ENV === 'production' && event.pretalxSlug !== 'devcon8' && data.state !== 'confirmed') {
    return { notFound: true, revalidate: 300 }
  }

  // Multilingual pretalx fields come as { en: ... } when expanded.
  const name = (v: any) => (typeof v === 'string' ? v : v?.en) ?? ''

  return {
    props: {
      params: context.params,
      talk: {
        id: context.params.code,
        title: data.title ?? '',
        // Pretalx type names carry scheduling details ("Talk (20\"Talk+5\"Q&A)")
        // — keep just the label for display.
        type: name(data.submission_type?.name ?? data.submission_type).replace(/\s*\(.*\)\s*$/, ''),
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
    revalidate: 600,
  }
}

export default SpeakerCard
