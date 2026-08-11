// Campaign attribution without any tracking on this page itself: destinations
// on our own Matomo-tracked properties (devcon.org / ethereum.org and their
// subdomains) get Matomo campaign params appended, so arrivals show up in the
// existing dashboards under Campaigns -> ens-page. External destinations are
// left untouched.
const TRACKED_DOMAINS = ['devcon.org', 'ethereum.org']

export function trackedUrl(url: string, title: string): string {
  try {
    const u = new URL(url)
    if (TRACKED_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith(`.${d}`))) {
      u.searchParams.set('mtm_campaign', 'ens-page')
      u.searchParams.set('mtm_kwd', title)
    }
    return u.toString()
  } catch {
    return url
  }
}
