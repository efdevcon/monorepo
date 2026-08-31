import { useCallback, useEffect, useState } from 'react'
import { ENS_NAME } from './config'
import { fetchEnsProfile, type EnsProfile } from './lib/ens'
import { fetchLinks, type CampaignLink } from './lib/links'
import { Profile, ProfileSkeleton } from './components/Profile'
import { Links, LinksSkeleton } from './components/Links'
import { QrBadge } from './components/QrBadge'

type Loadable<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T }

// The page's signature (borrowed from ethpage): the profile's own header art,
// blurred into a full-viewport ambience behind the glass card. Falls back to
// a soft accent-tinted wash while loading or when no header record exists.
function Backdrop({ header }: { header: string | null }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-neutral-100">
      {header ? (
        <img
          src={header}
          alt=""
          onLoad={() => setLoaded(true)}
          className={`h-full w-full scale-125 object-cover blur-3xl saturate-[1.2] transition-opacity duration-700 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(80% 60% at 50% 0%, rgba(114, 53, 237, 0.16), transparent)' }}
        />
      )}
      <div className="absolute inset-0 bg-neutral-100/75 dark:bg-neutral-950/70" />
    </div>
  )
}

export default function App() {
  const [profile, setProfile] = useState<Loadable<EnsProfile>>({ status: 'loading' })
  const [links, setLinks] = useState<Loadable<CampaignLink[]>>({ status: 'loading' })

  const loadProfile = useCallback(() => {
    setProfile({ status: 'loading' })
    fetchEnsProfile(ENS_NAME)
      .then(data => {
        setProfile({ status: 'ready', data })
        // Tab title and favicon follow the ENS records (Nickname + avatar),
        // like the rest of the page: record edits, no redeploy. Same
        // "Nickname (name.eth)" format as the build-time baked title.
        document.title = data.displayName !== ENS_NAME ? `${data.displayName} (${ENS_NAME})` : ENS_NAME
        const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (icon && data.avatar) icon.href = data.avatar
      })
      .catch(() => setProfile({ status: 'error' }))
  }, [])

  useEffect(() => {
    document.title = ENS_NAME // until the Nickname record loads
    loadProfile()
    // Links API failure hides the section gracefully (spec): stays 'error'.
    fetchLinks()
      .then(data => setLinks({ status: 'ready', data }))
      .catch(() => setLinks({ status: 'error' }))
  }, [loadProfile])

  return (
    <main className="min-h-screen px-4 py-4 font-sans sm:py-6">
      <Backdrop header={profile.status === 'ready' ? profile.data.header : null} />
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white/80 p-5 shadow-xl shadow-neutral-900/5 ring-1 ring-white/60 backdrop-blur-xl dark:bg-neutral-900/75 dark:shadow-black/20 dark:ring-white/10 sm:p-8">
        {profile.status === 'loading' && <ProfileSkeleton />}
        {profile.status === 'error' && (
          <div className="py-12 text-center">
            <p className="text-neutral-600 dark:text-neutral-300">Could not load the {ENS_NAME} profile.</p>
            <button
              onClick={loadProfile}
              className="mt-4 rounded-full bg-neutral-900 px-6 py-2 font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Retry
            </button>
          </div>
        )}
        {profile.status === 'ready' && <Profile profile={profile.data} />}

        {links.status === 'loading' && profile.status !== 'error' && <LinksSkeleton />}
        {links.status === 'ready' && <Links links={links.data} />}
      </div>
      <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-neutral-400">
        Served from IPFS <span className="mx-1 text-neutral-300 dark:text-neutral-600">·</span> profile data lives on{' '}
        <a
          href={`https://app.ens.domains/${ENS_NAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          {ENS_NAME}
        </a>{' '}
        <span className="mx-1 text-neutral-300 dark:text-neutral-600">·</span>
        <span title={document.querySelector<HTMLMetaElement>('meta[name="build"]')?.content ?? undefined}>
          v{__APP_VERSION__}
        </span>
      </p>
      <QrBadge />
    </main>
  )
}
