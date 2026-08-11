import type { ComponentType } from 'react'
import { Mail, Globe } from 'lucide-react'
import type { EnsProfile } from '../lib/ens'
import { socialUrl, socialLabel } from '../lib/socials'
import TwitterIcon from '../icons/twitter.svg?react'
import InstagramIcon from '../icons/instagram.svg?react'
import GithubIcon from '../icons/github.svg?react'
import YoutubeIcon from '../icons/youtube.svg?react'
import TelegramIcon from '../icons/telegram.svg?react'
import FarcasterIcon from '../icons/farcaster.svg?react'

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'com.twitter': TwitterIcon,
  'com.instagram': InstagramIcon,
  'com.github': GithubIcon,
  'com.youtube': YoutubeIcon,
  'org.telegram': TelegramIcon,
  'xyz.farcaster': FarcasterIcon,
  email: Mail,
}

// "https://devcon.org/en/" -> "devcon.org": the pill shows a readable name,
// the full URL stays in the href.
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// The full-bleed pieces cancel the card's responsive padding (p-5 sm:p-8),
// so every negative margin/width here carries the matching sm: variant.
const FULL_BLEED = '-mx-5 -mt-5 w-[calc(100%+2.5rem)] max-w-none sm:-mx-8 sm:-mt-8 sm:w-[calc(100%+4rem)]'

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className={`${FULL_BLEED} h-40 rounded-t-2xl bg-neutral-200`} />
      <div className="-mt-8 mx-auto h-16 w-16 rounded-full bg-neutral-300 ring-4 ring-white sm:-mt-10 sm:h-20 sm:w-20" />
      <div className="mx-auto mt-4 h-6 w-40 rounded bg-neutral-200" />
      <div className="mx-auto mt-2 h-4 w-64 rounded bg-neutral-200" />
    </div>
  )
}

export function Profile({ profile }: { profile: EnsProfile }) {
  return (
    <div>
      {/* Full-bleed header, same treatment as devcon.org's FormHeaderImage:
          negative margins cancel the card's p-8 so the artwork runs
          edge-to-edge with matching rounded top corners. */}
      {profile.header ? (
        <img src={profile.header} alt="" className={`${FULL_BLEED} rounded-t-2xl object-cover aspect-[3/1]`} />
      ) : (
        <div className={`${FULL_BLEED} h-24 rounded-t-2xl bg-neutral-200`} />
      )}

      <div className="flex flex-col items-center text-center">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={profile.displayName}
            className="-mt-8 h-16 w-16 rounded-full object-cover ring-4 ring-white bg-white sm:-mt-10 sm:h-20 sm:w-20"
          />
        )}
        <h1 className="mt-4 font-display text-2xl font-bold">{profile.displayName}</h1>
        {profile.description && <p className="mt-1 text-neutral-600">{profile.description}</p>}

        {profile.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-accent transition duration-150 ease-out hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Globe className="h-4 w-4" />
            {hostname(profile.url)}
          </a>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          {profile.socials.map(({ key, value }) => {
            const Icon = ICONS[key]
            const href = socialUrl(key, value)
            const label = socialLabel(key)
            if (!Icon || !href || !label) return null
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="rounded-full p-2 text-accent transition duration-150 ease-out hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-2.5"
              >
                <Icon className="h-5 w-5" />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
