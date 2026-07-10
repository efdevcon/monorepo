import { TicketQuota } from 'types/TicketQuota'

// The Devcon 7 Pretix instance (ticketh.xyz) has been shut down and ticket sales on this
// archived site are long closed, so quota lookups are disabled — the unreachable host was
// failing `getStaticProps` on /tickets and breaking the Netlify build.
export async function GetTicketQuota(id: string = ''): Promise<TicketQuota | undefined> {
  return undefined
}
