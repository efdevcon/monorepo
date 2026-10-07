/**
 * Hand-curated allowlist for the home page "Devcon 8 Speakers" section.
 *
 * THIS FILE IS THE GATE: only speakers we have publicly announced on X
 * (https://x.com/EFDevcon) belong here. Order = display order in the grid;
 * on small screens the first 16 (2 columns) or 18 (3 columns) show before
 * "View all speakers".
 *
 * Pretalx (Devcon 8 CFP) supplies name, portrait, organization (question 153),
 * X handle (question 142) and the track of the first confirmed session. `title` is hand-filled because Pretalx has no
 * job-title question. After editing, run `pnpm speakers:pull` to refresh
 * speakers.generated.ts + assets/portraits/, and commit both. Hand-supplied
 * portraits are used as-is unless you pass --normalize-manual.
 *
 * Keep this file free of image imports so the pull script can import it.
 */

interface AllowlistBase {
  /** Role / job title. Hand-filled; the pull script prints the Pretalx bio to help. */
  title?: string
  /** Bare X handle override when the Pretalx answer is missing or wrong. */
  xHandle?: string
  /** Short blurb for the focused card. Hand-written (not pulled) so the voice
   *  stays consistent: third person, present tense, no pronouns, ≤ ~2 sentences. */
  bio?: string
  /** Track override (or the only source for manual entries); Pretalx supplies it otherwise. */
  track?: string
  /** URL of the announcement post on X. Provenance only, never rendered. */
  announcedAt?: string
}

export interface PretalxAllowlistEntry extends AllowlistBase {
  /** Pretalx speaker code on cfp.devcon.org/devcon8 — the join key. */
  code: string
  /** Display-name override (e.g. Pretalx name is a handle). */
  name?: string
  /** Organization override for the Pretalx answer. */
  company?: string
  /** Filename in assets/portraits/ to use instead of the Pretalx avatar. */
  portrait?: string
}

export interface ManualAllowlistEntry extends AllowlistBase {
  /** A speaker who is not (yet) in Pretalx. Portrait must exist in assets/portraits/. */
  manual: { id: string; name: string; company: string; portrait: string }
}

export type AllowlistEntry = PretalxAllowlistEntry | ManualAllowlistEntry

export const allowlistId = (entry: AllowlistEntry): string => ('manual' in entry ? entry.manual.id : entry.code)

export const SPEAKER_ALLOWLIST: AllowlistEntry[] = [
  // Pretalx name is just "Vitalik"; org answer is "Ethereum". The keynote has no track yet, hence the override.
  {
    code: 'KYP3UZ',
    name: 'Vitalik Buterin',
    title: 'Co-Founder',
    track: 'Core Protocol',
    bio: 'Vitalik Buterin co-founded Ethereum, first describing it in a 2013 white paper. Vitalik writes and researches across cryptography, scaling and public goods.',
  },
  // Org answer is "Cyber Ambassador Taiwan, civic.ai".
  {
    code: 'SPUYRY',
    title: 'Cyber Ambassador-at-Large',
    company: 'Taiwan',
    bio: "Audrey Tang is Taiwan's Cyber Ambassador-at-Large and served as the country's first digital minister from 2016 to 2024. Audrey brought civic innovation into government, from Taiwan's COVID-19 response to protecting its 2024 elections from cyber interference.",
  }, // Audrey Tang
  {
    code: 'G9LYGU',
    title: 'Researcher',
    xHandle: 'drakefjustin',
    bio: "Justin Drake is a researcher on the Ethereum Foundation's architecture team, working on post-quantum security, zkEVMs and a leaner Ethereum.",
  }, // Justin Drake · Ethereum Foundation
  {
    code: 'W8UUCW',
    title: 'Co-Founder',
    bio: 'Roger Dingledine co-founded the Tor Project and was its original developer, building free software that protects people from tracking, censorship and surveillance. Roger works with journalists and activists worldwide.',
  }, // Roger Dingledine · The Tor Project
  {
    code: 'MWSEWZ',
    title: 'Founder',
    bio: 'Sandeep Nailwal founded Polygon and leads the Polygon Foundation as CEO, building toward seamless onchain payments. Sandeep also founded Blockchain for Impact, which supports medical research and Web3 builders.',
  }, // Sandeep Nailwal · Polygon Labs
  {
    code: 'FZ8PA3',
    title: 'CTO',
    company: 'LF Decentralized Trust',
    bio: "Hart Montgomery is CTO of Linux Foundation Decentralized Trust and executive director of the Post-Quantum Cryptography Alliance. Hart holds a PhD in cryptography from Stanford and helped lead Fujitsu's work on Hyperledger.",
  }, // Hart Montgomery
  {
    code: '8FL8QW',
    title: 'Co-Founder',
    company: 'Aztec',
    bio: 'Zachary Williamson co-founded Aztec Network and chairs the Aztec Foundation. Zachary co-invented PLONK and has spent nearly a decade designing the cryptography behind programmable privacy.',
  }, // Zachary Williamson
  {
    code: 'RMPP9E',
    title: 'Co-Founder',
    bio: 'Barnab\u00e9 Monnot co-founded Ethlabs, a non-profit R&D lab growing Ethereum and ETH. Barnab\u00e9 previously co-led Protocol at the Ethereum Foundation.',
  }, // Barnabé Monnot · Ethlabs
  {
    code: '7BLNXR',
    title: 'Founder',
    company: 'Giveth',
    bio: 'Griff Green leads TheDAO Security Fund and co-founded Giveth and Dappnode. Griff has spent a decade on white-hat rescues, from the cleanup after TheDAO hack to recovering $200M+ in the first Parity multisig hack.',
  }, // Griff Green — TODO confirm title
  // No avatar or org answer in Pretalx, so the portrait and company are hand-supplied.
  {
    code: 'JPTVDC',
    title: 'Co-Founder',
    company: 'Giga',
    xHandle: 'chrisfabian',
    portrait: 'christopher-fabian.webp',
    bio: 'Christopher Fabian co-launched Giga with UNICEF and the ITU to connect every school in the world to the internet, mapping school connectivity in real time and pooling demand to finance it. Christopher also co-founded UNICEF Innovation.',
  }, // Christopher Fabian
  {
    code: 'ZDA7LS',
    title: 'Lawyer & Digital-Rights Researcher',
    company: 'EF Silviculture Society',
    xHandle: 'Fatalmeh',
    bio: 'Fatemeh Fannizadeh is a Swiss-qualified lawyer and digital-rights researcher working where regulation, privacy and governance meet. Fatemeh asks who actually gets to take part in decentralized systems, and why.',
  }, // Fatemeh Fannizadeh
  {
    code: '3JEDML',
    title: 'Protocol Engineering Lead',
    bio: 'Dorde Mijovic leads protocol engineering at the Monad Foundation. Dorde previously worked on the Solidity compiler at the Ethereum Foundation and co-founded a DeFi project.',
  }, // Dorde Mijovic · Monad Foundation
  {
    code: 'LP7S9M',
    title: 'Product & Project Manager',
    company: 'UNICEF Office of Innovation',
    bio: "Kati Illes runs Web3 prototypes and pilots for UNICEF's Ventures and CryptoFund teams, working where humanitarian fintech meets digital public goods.",
  }, // Kati Illes
  {
    code: '3QYPGS',
    title: 'Researcher & Engineer',
    bio: 'Preston Vander Vos is a researcher and engineer at Circle, building Arc, an EVM-compatible blockchain. Preston works across distributed systems, cryptography and mechanism design.',
  }, // Preston Vander Vos · Circle
  {
    code: 'T8KAJP',
    title: 'Co-Founder',
    bio: 'Jan Kalivoda co-founded ack3.ai and works as a security researcher and university lecturer. Jan holds an ETHSecurity badge and is a committed paneer enjoyer.',
  }, // Jan Kalivoda · ack3
  {
    code: 'MPDBM3',
    title: 'Strategy & Operations Lead',
    bio: 'Johanna Moran leads strategy and operations for libp2p, the peer-to-peer networking stack behind IPFS, Filecoin, Ethereum and Polkadot, and represents it at the IETF. Johanna also co-founded Meshworks.',
  }, // Johanna Moran · libp2p
  {
    code: 'J7URYL',
    title: 'Founder',
    bio: "Janmajaya Mall invents new cryptographic primitives at phantom.zone, building encrypted, shared ways to compute that don't depend on the machine underneath. All of it open source.",
  }, // Janmajaya Mall · phantom.zone
  {
    code: 'TKDN87',
    title: 'Integration Engineer',
    bio: "Jason Chaskin is a writer, learner and integration engineer at the Ethereum Foundation, focused on Ethereum's Access Layer.",
  }, // Jason Chaskin · Ethereum Foundation
  {
    code: 'GVKNCK',
    title: 'Founder',
    bio: 'Meinhard Benn has worked with Bitcoin since 2011 and founded SatoshiPay in 2014. Meinhard now builds Freedom Browser, an open-source browser with Swarm, IPFS, Radicle and ENS built in.',
  }, // Meinhard Benn · Freedom Browser
  {
    code: 'DURU3V',
    name: 'Santiago',
    title: 'Developer Relations',
    company: 'Arkiv',
    bio: 'Santiago is DevRel at Arkiv and has hosted 30+ developer workshops and two builder residencies across Africa, Latin America and Europe. Santiago previously worked at ChainSafe, Lisk and Swisstronik.',
  }, // SantiagoDevRel — Pretalx org answer says Golem Network; the speaker's bio confirms Arkiv
  // Pretalx name is lowercase and the org answer is a paragraph, hence both overrides.
  {
    code: 'B9V8HC',
    name: 'Victoria Kozlova',
    title: 'PhD Researcher',
    company: 'Tallinn University of Technology',
    bio: 'Victoria Kozlova is a sociolinguist turned Web3 UI/UX designer turned PhD candidate, researching blockchains and their social implications.',
  },
  // Org answer is "Web3Privacy Now - founder", hence the company override.
  {
    code: 'MAXUYR',
    title: 'Founder',
    company: 'Web3Privacy Now',
    bio: 'PG runs operations at Web3Privacy Now, turning its mission into action for privacy-preserving tech. In crypto since 2016, with a passion for the politics of care, activism and the arts.',
  }, // PG
  {
    code: 'NWGADS',
    title: 'Tokenization Tech Lead',
    bio: 'Eric Marti Haynes leads tokenization tech at Nethermind, having joined as an intern in 2022. Eric designs and builds tokenization systems and researches the standards linking them to DeFi.',
  }, // Eric Marti Haynes · Nethermind
  // No avatar in Pretalx, so the portrait is hand-supplied; org answer
  // (Cambridge Centre for Alternative Finance) and X answer are overridden too.
  {
    code: 'QNSFPZ',
    title: 'Product Lead',
    company: 'Nouns',
    xHandle: 'b3nedictvs',
    portrait: 'ben-biedermann.webp',
    bio: 'Ben Biedermann is a PhD candidate in digital public infrastructure, studying how small jurisdictions govern decentralized technology. Ben is also Product Lead at Nouns Builder DAO, building open-source tools for onchain governance.',
  }, // Ben Biedermann
  // Org answer adds a note about the talk being personal work.
  {
    code: 'BW7UUN',
    title: 'Director of Developer Relations',
    company: 'MetaMask',
    bio: 'Francesco Andreoli leads developer relations at MetaMask and has been in Ethereum since 2016. Francesco works where wallets, smart accounts and AI agents meet, and builds open-source agent tooling to test the ideas.',
  }, // Francesco Andreoli
  {
    code: 'WLADZ7',
    title: 'Core Contributor',
    bio: "cheeky-gorilla is a core contributor to Protocol Guild, which funds the maintainers of Ethereum's core protocol so the work the ecosystem depends on keeps happening.",
  }, // cheeky-gorilla · Protocol Guild
  {
    code: 'G9TNL3',
    title: 'go-ethereum Developer',
    bio: 'lightclient is a go-ethereum developer, the author of EIP-7702 and a long-time contributor to account abstraction.',
  }, // lightclient · Ethereum Foundation
  // Org answer is "EEZ and ZisK".
  {
    code: 'J3CHSG',
    title: 'Co-Founder',
    company: 'ZisK',
    bio: 'Jordi Baylina founded SilentSig and created ZisK, an open-source zkVM. Jordi previously co-founded Polygon Hermez, led Polygon zkEVM, and created Circom and snarkJS.',
  }, // Jordi Baylina
  {
    code: 'BRYZ3G',
    title: 'Partnerships & Scouting Lead',
    bio: 'Telamon Ardavanis leads partnerships and scouting at Edge City, a non-profit society incubator running month-long popup villages. Edge City has hosted 12 villages on 5 continents, with 12,500+ participants from 100+ countries.',
  }, // Telamon Ardavanis · Edge City
  {
    code: 'V88N3U',
    title: 'Head of Privacy',
    bio: 'Asha Shankar is Head of Privacy at Coinbase, leading privacy risk, assessments and incident response. Asha works where data protection law meets blockchain architecture, building privacy programs that hold up under regulatory scrutiny.',
  }, // Asha Shankar · Coinbase
  // Org answer is "Veridise Inc".
  {
    code: 'HDTJHP',
    title: 'Co-Founder & CEO',
    company: 'Veridise',
    bio: 'Jon Stephens co-founded Veridise, which audits and builds security tools for smart contracts, blockchain systems and zero-knowledge tech. Jon is also a computer science PhD student at UT Austin, researching formal methods and program analysis.',
  }, // Jon Stephens
]
