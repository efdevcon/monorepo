// Campaign attribution without any tracking on this page itself: destinations
// on our own Matomo-tracked properties (devcon.org and subdomains) get Matomo
// campaign params appended, so arrivals show up in the existing dashboards
// under Campaigns -> ens-page. External destinations are left untouched.
export function trackedUrl(url: string, title: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'devcon.org' || u.hostname.endsWith('.devcon.org')) {
      u.searchParams.set('mtm_campaign', 'ens-page')
      u.searchParams.set('mtm_kwd', title)
    }
    return u.toString()
  } catch {
    return url
  }
}
