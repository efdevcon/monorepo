import React from 'react'
import Head from 'next/head'
import { isPublicSubmissionState } from 'services/social-cards/submission-state'

/**
 * Speaker deck redirect: devcon.org/presentation/{event}/{code}/ sends a
 * speaker to the Google Slides deck the Devcon team created for their talk.
 * Successor of DC7's /sea/presentation/{code} (kept as is, so the links in old
 * speaker emails keep working), with the event in the path like the
 * /schedule/{event}/{code} share page:
 *
 *   /presentation/devcon8/{proposal_code}/
 *   /presentation/sea/{proposal_code}/        (Devcon SEA, 2024 decks)
 *   /presentation/test/{proposal_code}/       (TEST Devcon 8, pipeline tests)
 *
 * The link comes LIVE from Pretalx: the devcon-api sync writes each deck's URL
 * into a submission question (its id is PRETALX_QUESTIONS_SLIDES_DECK in the
 * API config), so the redirect works as soon as the deck exists, before the
 * schedule is published and synced. Devcon SEA predates that question and its
 * decks live only in the api.devcon.org session data, so it falls back to the
 * API. Accepted/confirmed talks only in production, as on the share page.
 */

const PRETALX_BASE = process.env.PRETALX_BASE_URL || 'https://cfp.devcon.org/api'

const EVENTS: Record<string, { pretalxSlug: string; slidesQuestionId?: number; apiFallback?: boolean }> = {
  // Question ids mirror PRETALX_QUESTIONS_SLIDES_DECK in devcon-api/src/utils/config.ts.
  devcon8: { pretalxSlug: 'devcon8', slidesQuestionId: 181 },
  sea: { pretalxSlug: 'devcon7-sea', apiFallback: true },
  test: { pretalxSlug: 'test-devcon-8', slidesQuestionId: 178 },
}

const CODE_RE = /^[A-Za-z0-9_-]{1,120}$/
// Only ever redirect to Google Docs/Drive: the answer is organiser-written,
// but an open redirect to arbitrary URLs is not worth the shortcut.
const DECK_RE = /^https:\/\/(docs|drive)\.google\.com\//

// While speakers cannot open their decks (Drive sharing paused on the event's
// shared drive), show a notice with the link instead of redirecting straight
// into a Google "request access" page. Flip back to false once access is back.
const DECK_ACCESS_PAUSED: Record<string, boolean> = { devcon8: false }

const AccessPaused = ({ deck }: { deck: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
    <Head>
      <title>Your slides · Devcon</title>
      <meta name="robots" content="noindex" />
    </Head>
    <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4 text-slate-800">
      <h1 className="text-xl font-semibold">Slides are temporarily not editable</h1>
      <p>
        Speakers can&apos;t open or edit their slides right now. We&apos;re restoring access very soon.
      </p>
      <p>Your deck and your edits are safe. Please come back to this same link a bit later.</p>
      <a href={deck} className="self-start text-sm underline text-slate-600" rel="noopener noreferrer">
        Try opening my slides
      </a>
    </div>
  </div>
)

const NoDeck = () => <div className="p-2">No presentation link found. Please contact the organisers.</div>

const PresentationPage = ({ pausedDeck }: { pausedDeck?: string }) =>
  pausedDeck ? <AccessPaused deck={pausedDeck} /> : <NoDeck />

export async function getServerSideProps(context: any) {
  const event = EVENTS[context.params.event]
  const code: string = context.params.code
  if (!event || !CODE_RE.test(code ?? '')) return { notFound: true }

  // Short CDN cache: a deck the sync just created should resolve within a
  // minute, while repeat clicks from an email blast do not all hit Pretalx.
  context.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  let link: string | undefined
  if (event.slidesQuestionId) {
    const res = await fetch(
      `${PRETALX_BASE}/events/${event.pretalxSlug}/submissions/${encodeURIComponent(code)}/?questions=${event.slidesQuestionId}&expand=answers.question`,
      { headers: { Authorization: `Token ${process.env.PRETALX_API_KEY}` } }
    )
    if (!res.ok) return { notFound: true }
    const data = await res.json()
    if (!isPublicSubmissionState(data.state)) return { notFound: true }
    const answer = (data.answers || []).find((a: any) => (a.question?.id ?? a.question) === event.slidesQuestionId)?.answer
    if (typeof answer === 'string') link = answer.trim()
  } else if (event.apiFallback) {
    const res = await fetch(`https://api.devcon.org/sessions/${encodeURIComponent(code)}`)
    if (!res.ok) return { notFound: true }
    const session = await res.json()
    if (typeof session?.data?.resources_presentation === 'string') link = session.data.resources_presentation
  }

  if (link && DECK_RE.test(link)) {
    if (DECK_ACCESS_PAUSED[context.params.event]) return { props: { pausedDeck: link } }
    return { redirect: { destination: link, permanent: false } }
  }
  return { props: {} }
}

export default PresentationPage
