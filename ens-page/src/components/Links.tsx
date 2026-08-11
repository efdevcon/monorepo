import { reportClick, type CampaignLink } from '../lib/links'
import { trackedUrl } from '../lib/tracking'

export function LinksSkeleton() {
  return (
    <div className="mt-4 space-y-3 animate-pulse">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-14 rounded-xl bg-neutral-200" />
      ))}
    </div>
  )
}

export function Links({ links }: { links: CampaignLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="mt-4 space-y-3">
      {links.map(link => (
        <a
          key={link.url}
          href={trackedUrl(link.url, link.title)}
          onClick={() => reportClick(link)}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex min-h-14 items-center rounded-xl border border-neutral-200 bg-white py-2 pl-14 pr-4 text-center font-medium text-accent shadow-sm transition duration-150 ease-out hover:scale-[1.03] hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] sm:px-14"
        >
          {link.image && <img src={link.image} alt="" className="absolute left-2 h-10 w-10 rounded-lg object-cover" />}
          <span className="w-full">{link.title}</span>
        </a>
      ))}
    </div>
  )
}
