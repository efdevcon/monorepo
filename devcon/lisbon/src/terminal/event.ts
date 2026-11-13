// Event facts, in one place. The terminal script imports this, and
// vite.config.ts fills {{EVENT.key}} placeholders in terminal/index.html
// from it at build time (so the <noscript> copy needs no JS).

export const EVENT = {
  name: 'Devcon IX',
  city: 'Lisbon',
  // The terminal's hostname once the city is revealed (guest@lisboa).
  host: 'lisboa',
  country: 'Portugal',
  venue: 'CCL – Lisbon Congress Centre',
  dateRange: '12–14 October 2027',
  startISO: '2027-10-12',
  endISO: '2027-10-14',
} as const

// Outbound links, shared by the terminal and the HTML.
export const LINKS = {
  privacy: 'https://devcon.org/en/privacy-notice/',
  privacyContact: 'notices@ethereum.org',
  codeOfConduct: 'https://devcon.org/en/code-of-conduct/',
  home: 'https://devcon.org',
  archive: 'https://archive.devcon.org/',
  supporters: 'https://devcon.org/en/supporters/',
  contact: 'support@devcon.org',
} as const

// Page title and sharing copy, built from the facts above.
export const META = {
  title: `${EVENT.name} · ${EVENT.city} · ${EVENT.dateRange}`,
  description:
    `Devcon, the Ethereum conference for developers, thinkers and makers, comes to ${EVENT.city}. ` +
    `${EVENT.dateRange} at ${EVENT.venue}. Join the waitlist.`,
  imageAlt: `A green-phosphor CRT showing the ${EVENT.name} logo: ${EVENT.city}, ${EVENT.dateRange}`,
} as const
