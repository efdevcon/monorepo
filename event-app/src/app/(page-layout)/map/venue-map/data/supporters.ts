/**
 * The supporters seated on the map, keyed by the id the catalogue's `tenants`
 * and `variants[n].host` use (areas.ts). One entry per supporter: the card
 * blurb, the site and the X profile the card links, and the white lockup
 * (`public/maps/jwcc/supporters/<logo>.svg`, the website's set) drawn on the
 * booth and, unless `cardLogo` names a fuller one, on the card and list chips.
 * Blurbs are two sentences at most, from the supporter's own site (OpenZeppelin's
 * and Dedaub's wording from Scott, 2026-10-30); a supporter with no X profile
 * on its site (OrdoCode, Walletbeat) has none here.
 */
export type Supporter = {
  name: string;
  logo: string;
  /** A fuller lockup for the card and list chips when `logo` is a compact mark that fits a small booth's top. */
  cardLogo?: string;
  description: string;
  website: string;
  /** X profile URL. */
  x?: string;
};

export const SUPPORTERS = {
  base: { name: "Base", logo: "base", description: "Coinbase's Ethereum Layer 2, built on the OP Stack to bring the next billion users onchain.", website: "https://www.base.org", x: "https://x.com/base" },
  gnosis: { name: "Gnosis", logo: "gnosis", description: "Financial infrastructure on Ethereum: Gnosis Chain, Gnosis Pay's self-custodial card and Circles, governed by GnosisDAO.", website: "https://www.gnosis.io", x: "https://x.com/gnosis_" },
  kleros: { name: "Kleros", logo: "kleros", description: "A decentralised arbitration protocol: disputes resolved by crowdsourced jurors, from curated lists to escrow and insurance.", website: "https://kleros.io", x: "https://x.com/Kleros_io" },
  arkiv: { name: "Arkiv", logo: "arkiv", description: "A Web3 database protocol for Ethereum from the Golem Network: queryable, wallet-owned data that can expire on schedule.", website: "https://arkiv.network", x: "https://x.com/arkivnetwork" },
  openzeppelin: {
    name: "OpenZeppelin",
    logo: "openzeppelin",
    description: "OpenZeppelin is the security standard for onchain finance. Since 2015, its industry-standard Contracts library and 900+ security engagements have secured the world's leading blockchain networks, DeFi protocols, institutions, and enterprises.",
    website: "https://www.openzeppelin.com/",
    x: "https://x.com/OpenZeppelin",
  },
  ens: { name: "ENS", logo: "ens", description: "The Ethereum Name Service: human-readable names for wallets, websites and identity, owned onchain.", website: "https://ens.domains", x: "https://x.com/ensdomains" },
  ordocode: { name: "Ordocode", logo: "ordocode", cardLogo: "ordocode-full", description: "AI-assisted smart-contract development: a plain-language idea becomes a specification, Solidity, tests and machine-checked Lean proofs.", website: "https://ordocode.ai" },
  nethermind: { name: "Nethermind", logo: "nethermind", description: "Core Ethereum builders: the Nethermind execution client, plus research, security audits and infrastructure for the ecosystem.", website: "https://www.nethermind.io", x: "https://x.com/NethermindEth" },
  bitget: { name: "Bitget", logo: "bitget", description: "Bitget Wallet: a self-custody wallet for everyday crypto finance, with swaps, stablecoin earnings, a card and access to Web3 apps.", website: "https://web3.bitget.com/", x: "https://x.com/BitgetWallet" },
  world: { name: "World", logo: "world", description: "World (formerly Worldcoin): proof of human through World ID and the Orb, with World Chain and the World App.", website: "https://world.org", x: "https://x.com/worldcoin" },
  "trail-of-bits": { name: "Trail of Bits", logo: "trail-of-bits", description: "Security research and engineering: audits of smart contracts, blockchains and cryptography, and open-source tools such as Slither.", website: "https://www.trailofbits.com", x: "https://x.com/trailofbits" },
  swarm: { name: "Swarm", logo: "swarm", description: "A decentralised storage and communication system for Ethereum: censorship-resistant hosting and data, with incentives built in.", website: "https://www.ethswarm.org", x: "https://x.com/ethswarm" },
  lfdt: { name: "Linux Foundation Decentralized Trust", logo: "lfdt", description: "The Linux Foundation's home for open-source decentralised technology, including Hyperledger Besu and Web3j.", website: "https://www.lfdecentralizedtrust.org", x: "https://x.com/LFDecentTrust" },
  eez: { name: "EEZ", logo: "eez", cardLogo: "eez-full", description: "The Ethereum Economic Zone: an initiative by Gnosis and ZisK, co-funded by the Ethereum Foundation, for interoperable ZK rollups that settle on Ethereum and keep ETH as gas.", website: "https://eez.io", x: "https://x.com/etheconomiczone" },
  crossbar: { name: "Crossbar", logo: "crossbar", description: "ReRAM semiconductor memory and open-source hardware: fully inspectable hardware wallets and seedless MPC key management on a secure element.", website: "https://crossbar-inc.com", x: "https://x.com/crossbar_inc" },
  unicef: { name: "UNICEF", logo: "unicef", description: "The UNICEF Venture Fund: seed funding and mentorship for open-source technology from emerging markets that benefits children and youth, including its CryptoFund.", website: "https://www.unicefventurefund.org", x: "https://x.com/unicefinnovate" },
  "fair-food-data": { name: "Fair Food Data", logo: "fair-food-data-icon", cardLogo: "fair-food-data", description: "A verifiable record system for recovered food: each batch gets a digital twin of its field, transport and processing data that can carry carbon-credit claims.", website: "https://fairfooddata.org", x: "https://x.com/FFoodData" },
  eag: { name: "Ethereum Applications Guild", logo: "eag", cardLogo: "eag-full", description: "A global non-profit initiated by Vitalik Buterin and HashKey's Xiao Feng to bring Ethereum-native applications to real adoption.", website: "https://ethappsguild.org", x: "https://x.com/EthAppsGuild" },
  eipsinsight: { name: "EIPsInsight", logo: "eipsinsight", description: "Tracks Ethereum standards and governance: proposal lifecycles, upgrade timelines and editor activity across EIPs, ERCs and RIPs.", website: "https://eipsinsight.com", x: "https://x.com/EIPsInsight" },
  growthepie: { name: "growthepie", logo: "growthepie-icon", cardLogo: "growthepie", description: "Open analytics for Ethereum and its Layer 2s: usage, fees, economics and data availability, side by side.", website: "https://www.growthepie.com", x: "https://x.com/growthepie_eth" },
  gcc: { name: "GCC Commons", logo: "gcc", description: "The Global Chinese Community of Universal Digital Commons: a grants fund for Chinese-speaking digital public goods, from Ethereum infrastructure to privacy and governance research.", website: "https://www.gccofficial.org/en", x: "https://x.com/GCCofCommons" },
  "eth-labs": { name: "ETH Labs", logo: "eth-labs", description: "A non-profit R&D lab for Ethereum and ETH, founded in 2026 by former Ethereum Foundation researchers, publishing all of its research openly.", website: "https://ethlabs.org", x: "https://x.com/ethlabs_org" },
  railgun: { name: "Railgun", logo: "railgun-icon", cardLogo: "railgun-full", description: "Private DeFi on Ethereum: a zero-knowledge privacy system for transfers, swaps and other smart-contract interactions from a shielded balance.", website: "https://railgun.org", x: "https://x.com/RAILGUN_Project" },
  walletbeat: { name: "Walletbeat", logo: "walletbeat", cardLogo: "walletbeat-full", description: "An open repository benchmarking the features and security of EVM wallets side by side, started by Fluidkey.", website: "https://www.walletbeat.fyi" },
  nimbus: { name: "Nimbus", logo: "nimbus", cardLogo: "nimbus-full", description: "Status's lightweight Ethereum consensus and execution clients, written in Nim to run well on everyday hardware.", website: "https://nimbus.team", x: "https://x.com/ethnimbus" },
  grapheneos: { name: "GrapheneOS", logo: "grapheneos-icon", cardLogo: "grapheneos-full", description: "A privacy- and security-hardened mobile OS, Android-compatible, developed as an open-source non-profit project.", website: "https://grapheneos.org", x: "https://x.com/GrapheneOS" },
  // Hosts a place rather than a booth (the coffee stand, areas.ts `variants`).
  "cow-swap": { name: "CoW Swap", logo: "cow-swap", description: "Intent-based trading on CoW Protocol: batch auctions with MEV protection, solved by a competing network of solvers.", website: "https://cow.fi", x: "https://x.com/CoWSwap" },
  // Not seated at a booth yet (website supporters; Scott, 2026-10-30).
  circle: { name: "Circle", logo: "circle", description: "Issuer of the USDC and EURC stablecoins, with developer platforms for payments, cross-chain transfers and onchain finance.", website: "https://www.circle.com/", x: "https://x.com/circle" },
  dedaub: {
    name: "Dedaub",
    logo: "dedaub",
    description: "Smart-contract security for Web3 builders: 300+ expert audits, for the Ethereum Foundation, EigenLayer and Chainlink among others, and onchain security tooling from transaction monitoring to a bytecode decompiler.",
    website: "https://www.dedaub.com/",
    x: "https://x.com/dedaub",
  },
} as const satisfies Record<string, Supporter>;

export type SupporterId = keyof typeof SUPPORTERS;
export const supporterLogoUrl = (file: string) => `/maps/jwcc/supporters/${file}.svg`;
