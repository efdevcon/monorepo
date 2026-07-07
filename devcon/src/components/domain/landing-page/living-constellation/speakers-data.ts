import type { ConstellationSpeaker, ConstellationEvent } from './types'

// Portraits
import vitalikImg from './assets/portraits/vitalik-buterin.jpg'
import audreyImg from './assets/portraits/audrey-tang.jpg'
import dannyImg from './assets/portraits/danny-ryan.jpg'
import ayaImg from './assets/portraits/aya.jpg'
import josephImg from './assets/portraits/joseph-lubin.jpg'
import hsiaoImg from './assets/portraits/hsiao-wei.jpg'
import justinImg from './assets/portraits/justin-drake.jpg'
import brewsterImg from './assets/portraits/brewster-kahle.jpg'
import staniImg from './assets/portraits/stani-kulechov.jpg'
import sreeramImg from './assets/portraits/sreeram-kannan.jpg'
import poojaImg from './assets/portraits/pooja-ranjan.jpg'
import jesseImg from './assets/portraits/jesse-pollak.jpg'
import hartImg from './assets/portraits/hart-montgomery.jpg'
import rogerImg from './assets/portraits/roger-dingledine.jpg'
// import davidImg from './assets/portraits/david-hoffman.jpg'
import brunoImg from './assets/portraits/bruno-macaes.jpg'
import tomaszImg from './assets/portraits/tomasz.jpg'
import pujaImg from './assets/portraits/puja-ohlhaver.jpg'
import sohamImg from './assets/portraits/soham-sankaran.jpg'
import kurtImg from './assets/portraits/kurt-opsahl.jpg'
import muditImg from './assets/portraits/mudit-gupta.jpg'
import tarunImg from './assets/portraits/tarun-chitra.jpg'
import aayushImg from './assets/portraits/ayush-gupta.jpg'
import umaImg from './assets/portraits/uma-roy.png'
import stewartImg from './assets/portraits/stewart-brand.png'
import kasparImg from './assets/portraits/kaspar-korjus.png'
import coryImg from './assets/portraits/cory-doctorow.png'

// Event logos
import eventDevcon4 from './assets/event-logos/devcon4-prague.png'
import eventDevcon5 from './assets/event-logos/devcon5-osaka.png'
import eventDevcon6 from './assets/event-logos/devcon6-bogota.png'
import eventDevcon7 from './assets/event-logos/devcon7-sea.png'

// Company logos
import logoEthereumFoundation from './assets/company-logos/ethereum-foundation.png'
import logoEtherealize from './assets/company-logos/etherealize.png'
import logoConsensys from './assets/company-logos/consensys.png'
import logoInternetArchive from './assets/company-logos/internet-archive.png'
import logoAave from './assets/company-logos/aave.png'
import logoEigencloud from './assets/company-logos/eigencloud.png'
import logoEthereumCatHerders from './assets/company-logos/ethereum-cat-herders.png'
import logoBase from './assets/company-logos/base.png'
import logoLinuxFoundation from './assets/company-logos/linux-foundation.png'
import logoTorProject from './assets/company-logos/tor-project.png'
import logoBankless from './assets/company-logos/bankless.png'
import logoNethermind from './assets/company-logos/nethermind.png'
import logoPopvaxIndia from './assets/company-logos/popvax-india.png'
import logoFilecoinFoundation from './assets/company-logos/filecoin-foundation.png'
import logoPolygon from './assets/company-logos/polygon.png'
import logoGauntlet from './assets/company-logos/gauntlet.png'
import logoSettlex from './assets/company-logos/settlex.png'
import logoSuccinct from './assets/company-logos/succinct.png'
import logoLongNow from './assets/company-logos/long-now-foundation.png'
import logoPactum from './assets/company-logos/pactum.png'
import logoZkemail from './assets/company-logos/zk-email.png'

const devcon4: ConstellationEvent = { logo: eventDevcon4, label: 'Devcon 4 Prague' }
const devcon5: ConstellationEvent = { logo: eventDevcon5, label: 'Devcon 5 Osaka' }
const devcon6: ConstellationEvent = { logo: eventDevcon6, label: 'Devcon 6 Bogota' }
const devcon7: ConstellationEvent = { logo: eventDevcon7, label: 'Devcon 7 SEA' }

export const CONSTELLATION_SPEAKERS: ConstellationSpeaker[] = [
  {
    id: 'vitalik',
    name: 'Vitalik Buterin',
    title: 'Co-Founder',
    company: 'Ethereum',
    color: '#6366f1',
    image: vitalikImg,
    event: devcon7,
    companyLogo: logoEthereumFoundation,
  },
  {
    id: 'audrey',
    name: 'Audrey Tang',
    title: 'Digital Minister',
    company: 'Taiwan',
    color: '#8b5cf6',
    image: audreyImg,
    event: devcon7,
  },
  {
    id: 'danny',
    name: 'Danny Ryan',
    title: 'President',
    company: 'Etherealize',
    color: '#a855f7',
    image: dannyImg,
    event: devcon6,
    companyLogo: logoEtherealize,
  },
  {
    id: 'aya',
    name: 'Aya Miyaguchi',
    title: 'Board Member',
    company: 'Ethereum Foundation',
    color: '#d946ef',
    image: ayaImg,
    event: devcon7,
    companyLogo: logoEthereumFoundation,
  },
  {
    id: 'joseph',
    name: 'Joseph Lubin',
    title: 'Founder',
    company: 'ConsenSys',
    color: '#ec4899',
    image: josephImg,
    event: devcon5,
    companyLogo: logoConsensys,
  },
  {
    id: 'hsiao',
    name: 'Hsiao-Wei Wang',
    title: 'Researcher',
    company: 'Independent',
    color: '#f43f5e',
    image: hsiaoImg,
    event: devcon6,
  },
  {
    id: 'justin',
    name: 'Justin Drake',
    title: 'Researcher',
    company: 'Ethereum Foundation',
    color: '#6366f1',
    image: justinImg,
    event: devcon7,
    companyLogo: logoEthereumFoundation,
  },
  {
    id: 'brewster',
    name: 'Brewster Kahle',
    title: 'Founder',
    company: 'Internet Archive',
    color: '#8b5cf6',
    image: brewsterImg,
    event: devcon6,
    companyLogo: logoInternetArchive,
  },
  {
    id: 'stani',
    name: 'Stani Kulechov',
    title: 'Founder & CEO',
    company: 'Aave',
    color: '#f97316',
    image: staniImg,
    event: devcon7,
    companyLogo: logoAave,
  },
  {
    id: 'sreeram',
    name: 'Sreeram Kannan',
    title: 'Founder',
    company: 'EigenCloud',
    color: '#06b6d4',
    image: sreeramImg,
    event: devcon6,
    companyLogo: logoEigencloud,
  },
  {
    id: 'pooja',
    name: 'Pooja Ranjan',
    title: 'Project Manager',
    company: 'Ethereum Cat Herders',
    color: '#14b8a6',
    image: poojaImg,
    event: devcon7,
    companyLogo: logoEthereumCatHerders,
  },
  {
    id: 'jesse',
    name: 'Jesse Pollak',
    title: 'Creator',
    company: 'Base',
    color: '#2563eb',
    image: jesseImg,
    event: devcon7,
    companyLogo: logoBase,
  },
  {
    id: 'hart',
    name: 'Hart Montgomery',
    title: 'CTO',
    company: 'Linux Foundation',
    color: '#8b5cf6',
    image: hartImg,
    event: devcon7,
    companyLogo: logoLinuxFoundation,
  },
  {
    id: 'roger',
    name: 'Roger Dingledine',
    title: 'Co-Founder',
    company: 'Tor Project',
    color: '#d946ef',
    image: rogerImg,
    event: devcon7,
    companyLogo: logoTorProject,
  },
  {
    id: 'stewart',
    name: 'Stewart Brand',
    title: 'Co-Founder',
    company: 'Long Now Foundation',
    color: '#f97316',
    image: stewartImg,
    event: devcon4,
    companyLogo: logoLongNow,
  },
  {
    id: 'bruno',
    name: 'Bruno Maçães',
    title: 'Author',
    company: 'Independent',
    color: '#22c55e',
    image: brunoImg,
    event: devcon7,
  },
  {
    id: 'tomasz',
    name: 'Tomasz Stańczak',
    title: 'Founder',
    company: 'Nethermind',
    color: '#06b6d4',
    image: tomaszImg,
    event: devcon7,
    companyLogo: logoNethermind,
  },
  {
    id: 'puja',
    name: 'Puja Ohlhaver',
    title: 'Technologist',
    company: 'Independent',
    color: '#7c3aed',
    image: pujaImg,
    event: devcon7,
  },
  {
    id: 'soham',
    name: 'Soham Sankaran',
    title: 'Founder',
    company: 'Pop Vax',
    color: '#22c55e',
    image: sohamImg,
    event: devcon7,
    companyLogo: logoPopvaxIndia,
  },
  {
    id: 'kurt',
    name: 'Kurt Opsahl',
    title: 'General Counsel',
    company: 'Filecoin Foundation',
    color: '#0891b2',
    image: kurtImg,
    event: devcon6,
    companyLogo: logoFilecoinFoundation,
  },
  {
    id: 'mudit',
    name: 'Mudit Gupta',
    title: 'CISO',
    company: 'Polygon',
    color: '#e11d48',
    image: muditImg,
    event: devcon7,
    companyLogo: logoPolygon,
  },
  {
    id: 'tarun',
    name: 'Tarun Chitra',
    title: 'Founder',
    company: 'Gauntlet',
    color: '#f97316',
    image: tarunImg,
    event: devcon7,
    companyLogo: logoGauntlet,
  },
  {
    id: 'aayush',
    name: 'Aayush Gupta',
    title: 'Founder',
    company: 'zkemail',
    color: '#2563eb',
    image: aayushImg,
    event: devcon7,
    companyLogo: logoZkemail,
  },
  // { id: 'david', name: 'David Hoffman', title: 'Co-Founder', company: 'Bankless', color: '#f97316', image: davidImg, event: devcon7, companyLogo: logoBankless },
  {
    id: 'uma',
    name: 'Uma Roy',
    title: 'Co-Founder',
    company: 'Succinct Labs',
    color: '#8b5cf6',
    image: umaImg,
    event: devcon7,
    companyLogo: logoSuccinct,
  },
  {
    id: 'kaspar',
    name: 'Kaspar Korjus',
    title: 'Co-Founder',
    company: 'Pactum AI',
    color: '#06b6d4',
    image: kasparImg,
    event: devcon4,
    companyLogo: logoPactum,
  },
  {
    id: 'cory',
    name: 'Cory Doctorow',
    title: 'Author',
    company: 'Independent',
    color: '#e11d48',
    image: coryImg,
    event: devcon7,
  },
]
