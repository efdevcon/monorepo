import attendees from '../../data/devcon-poap-attendees.json'

// Bundled map of lowercased wallet address -> past Devcon/Devconnect event
// labels (from the POAP holder drops). Built by
// src/scripts/builder/build-poap-attendees.ts.
let map: Map<string, string[]> | null = null

/** Past Devcon/Devconnect events whose POAP this address holds (empty if none). */
export function getPastDevconEvents(address: string): string[] {
  if (!address) return []
  if (!map) map = new Map(Object.entries(attendees as Record<string, string[]>))
  return map.get(address.toLowerCase()) ?? []
}
