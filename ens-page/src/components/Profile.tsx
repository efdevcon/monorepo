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

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="-mt-8 -mx-8 h-40 rounded-t-2xl bg-neutral-200" />
      <div className="-mt-10 mx-auto h-20 w-20 rounded-full bg-neutral-300 ring-4 ring-white" />
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
        <img
          src={profile.header}
          alt=""
          className="-mt-8 -mx-8 w-[calc(100%+4rem)] max-w-none rounded-t-2xl object-cover aspect-[3/1]"
        />
      ) : (
        <div className="-mt-8 -mx-8 h-24 rounded-t-2xl bg-neutral-200" />
      )}

      <div className="flex flex-col items-center text-center">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={profile.displayName}
            className="-mt-10 h-20 w-20 rounded-full object-cover ring-4 ring-white bg-white"
          />
        )}
        <h1 className="mt-3 font-display text-2xl font-bold">{profile.displayName}</h1>
        {profile.description && <p className="mt-1 text-neutral-600">{profile.description}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {profile.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
              className="rounded-full p-2.5 text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
            >
              <Globe className="h-5 w-5" />
            </a>
          )}
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
                className="rounded-full p-2.5 text-neutral-700 transition hover:bg-neutral-100 hover:text-black"
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
