import type { CampaignLink } from '../lib/links'

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
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex min-h-14 items-center rounded-xl border border-neutral-200 bg-white px-14 py-2 text-center font-medium text-accent shadow-sm transition duration-150 ease-out hover:scale-[1.03] hover:border-accent active:scale-[0.97]"
        >
          {link.image && <img src={link.image} alt="" className="absolute left-2 h-10 w-10 rounded-lg object-cover" />}
          <span className="w-full">{link.title}</span>
        </a>
      ))}
    </div>
  )
}
