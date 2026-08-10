// Ordered list of editions for display. Client-safe module: imported by page
// components, so it must not pull in services/blogs.ts (whose image-mirroring
// chain includes sharp and other server-only dependencies).
export const EDITION_ORDER = [
  'Devcon 8 India',
  'Devconnect ARG',
  'Devcon SEA',
  'Devconnect IST',
  'Devcon VI',
  'Devconnect AMS',
  'Devcon V',
  'Devcon iv',
  'devcon three',
  'devcon two',
  'DEVCON 1',
  'DEV CON 0',
]
