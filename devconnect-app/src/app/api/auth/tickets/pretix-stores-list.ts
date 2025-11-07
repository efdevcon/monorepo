import { config } from '@dotenvx/dotenvx';
import path from 'path';

// Load and decrypt the encrypted .env.stores file
// Use process.cwd() to get the project root instead of __dirname
const parsed = config({
  path: path.join(process.cwd(), 'src/app/api/auth/tickets/.env.stores'),
});

export const mainStore = {
  organizerSlug: 'devconnect',
  eventSlug: 'cowork',
  eventName: "Devconnect ARG — Ethereum World's Fair",
  eventId: 23, // confirmed
  url: 'https://ticketh.xyz',
  apiKey: process.env.PRETIX_API_KEY || '',
};

const stores: {
  organizerSlug: string;
  eventSlug: string;
  eventName: string;
  eventId: number | undefined;
  url: string;
  apiKey: string;
}[] = [
  mainStore,
  {
    organizerSlug: 'devconnect',
    eventSlug: 'efouting',
    eventName: 'EF Outing',
    eventId: undefined, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: process.env.PRETIX_API_KEY || '',
  },
  {
    organizerSlug: 'zk',
    eventSlug: 'id',
    eventName: 'zkID and Client-side Proving Day',
    eventId: 119, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ZK || '',
  },
  {
    organizerSlug: 'zk',
    eventSlug: 'obfuscation-day',
    eventName: 'Obfuscation Day',
    eventId: 194, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ZK || '',
  },
  {
    organizerSlug: 'zk',
    eventSlug: 'tls',
    eventName: 'zkTLS',
    eventId: 111, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ZK || '',
  },
  {
    organizerSlug: 'zk',
    eventSlug: 'app-to-fhe',
    eventName: 'Applications to FHE',
    eventId: 193, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ZK || '',
  },
  {
    organizerSlug: 'sop',
    eventSlug: 'bridge-atlas',
    eventName: 'Bridge Atlas',
    eventId: 91, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_SOP || '',
  },
  {
    organizerSlug: 'solidity',
    eventSlug: 'summit',
    eventName: 'Solidity Summit',
    eventId: 76, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_SOLIDITY || '',
  },
  {
    organizerSlug: 'remix',
    eventSlug: 'ztd',
    eventName: 'Zero to Dapp',
    eventId: 98, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_REMIX || '',
  },
  {
    organizerSlug: 'ethereumprivacy',
    eventSlug: 'stack',
    eventName: 'Ethereum Privacy Stack',
    eventId: 141, // unconfirmed?
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ETHEREUMPRIVACY || '',
  },
  {
    organizerSlug: 'organizer',
    eventSlug: 'hangout',
    eventName: 'Ethereum Community & Event Organizer Hangout',
    eventId: 137, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ORGANIZER || '',
  },
  {
    organizerSlug: 'ethcon',
    eventSlug: 'ethcon',
    eventName: 'EthCon',
    eventId: 82, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_ETHCON || '',
  },
  {
    organizerSlug: 'defi',
    eventSlug: 'today',
    eventName: 'DeFi Today',
    eventId: 107, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_DEFI || '',
  },
  {
    organizerSlug: 'dss',
    eventSlug: 'dss',
    eventName: 'DeFi Security Summit',
    eventId: 86, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_DSS || '',
  },
  {
    organizerSlug: 'creci',
    eventSlug: 'regulation',
    eventName: 'Crecimiento Regulation Day',
    eventId: 104, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_CRECI || '',
  },
  {
    organizerSlug: 'creci',
    eventSlug: 'worldcup',
    eventName: 'Crecimiento Startup Worldcup',
    eventId: 106, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_CRECI || '',
  },
  {
    organizerSlug: 'creci',
    eventSlug: 'creator-economy',
    eventName: "Newtro and Whabbit present 'The Creator Economy'",
    eventId: 168, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_CRECI || '',
  },
  {
    organizerSlug: 'app',
    eventSlug: 'town-hall',
    eventName: 'App Town Hall',
    eventId: 142, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_APP || '',
  },
  {
    organizerSlug: 'agentic',
    eventSlug: 'zero',
    eventName: 'Agentic Zero',
    eventId: 71, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_AGENTIC || '',
  },
  {
    organizerSlug: 'AA',
    eventSlug: 'trustless.interop',
    eventName: 'trustless://interop.landscape',
    eventId: 110, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_AA || '',
  },
  {
    organizerSlug: 'AA',
    eventSlug: 'trustless.eil',
    eventName: 'trustless://eil',
    eventId: 109, // confirmed
    url: 'https://ticketh.xyz',
    apiKey: parsed.parsed?.PRETIX_API_KEY_AA || '',
  },
];

export default stores;
