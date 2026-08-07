import React from 'react'
import Image from 'next/image'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { SEO } from 'components/domain/seo'
import { Snapshot } from 'components/common/snapshot'
import { VenueDetails } from 'components/common/VenueDetails'
import { AccordionGroup } from 'components/domain/travel-guide/AccordionGroup'
import { InfoTable } from 'components/domain/travel-guide/InfoTable'
import { Reveal, RevealGroup } from 'components/common/reveal/Reveal'
import DC8Logo from 'assets/images/dc-8/dc8-logo.png'
import { VideoPlayer } from 'components/domain/travel-guide/VideoPlayer'
import JaaliBottom from './images/decor/jaali-bottom-border.svg'
import JaaliSide from './images/decor/jaali-side-border.svg'
import { Markdown } from 'components/domain/travel-guide/Markdown'
import { Link } from 'components/common/link'
import InfiniteScroll from 'lib/components/infinite-scroll/infinite-scroll'
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Banknote,
  CameraOff,
  CircleCheckBig,
  Clock3,
  GlassWater,
  HandHeart,
  Languages,
  MapPin,
  Shirt,
  Sun,
  Tag,
  Thermometer,
} from 'lucide-react'
import themes from '../themes.module.scss'
import MoonBg from 'assets/icons/dc8-moon-bg.svg'
import HeroBackground from './images/hero/hero-mumbai-varad-parulekar.jpg'
import CityHarbor from './images/city/mumbai-raj-rana.jpg'
import CityTaj from './images/city/mumbai-avinash-a.jpg'
import CityCstNight from './images/city/mumbai-purvesh-parmar.jpg'
import CityGateway from './images/city/mumbai-abhishek-sarkate.jpg'
import CityCstClock from './images/city/mumbai-manthan-sheth.jpg'
import CityTowersDusk from './images/city/mumbai-harsh-kondekar.jpg'
import CitySkyline from './images/city/mumbai-hardik-joshi.jpg'
import CityTaxi from './images/city/mumbai-erik-esly.jpg'
import CityMarineDrive from './images/city/mumbai-satyajeet-mazumdar.jpg'
import CitySeaLink from './images/city/mumbai-sea-link.jpg'
import TravelAirport from './images/travel/airport-t2.jpg'
import TravelTrain from './images/travel/by-train-cst-arch.jpg'
import TravelParking from './images/travel/bkc-parking.jpg'
import VideoDevconMumbaiThumb from './images/videos/video-devcon-mumbai-thumb.jpg'
import WelcomeBoothCard from './images/venue/dc8-img-welcome-booth-card.jpg'
import Dc8LogomarkWhite from './images/venue/dc8-logomark-white.svg'
import VideoNidhiThumb from './images/videos/video-nidhi-thumb.jpg'
import CultureGateway from './images/culture/culture-gateway.jpg'
import CultureMarineDrive from './images/culture/culture-marine-drive.jpg'
import CultureCst from './images/culture/culture-cst.jpg'
import CultureStreetArt from './images/culture/culture-bandra-street-art.jpg'
import CultureElephanta from './images/culture/culture-elephanta-caves.jpg'
import RtdHackathon from './images/community/ethmumbai-hack.jpg'
import RtdMeetup from './images/community/mip-meetup.jpg'
import RtdGroup from './images/community/aya-codex-meetup.jpg'
import FoodStreet from './images/food/mumbaifood-fuseviews.jpg'
import FoodSnacks from './images/food/mumbaifood-sandip-roy.jpg'
import TripshaLogo from './images/stay/tripsha-logo.png'
import FlyfiLogo from './images/stay/flyfi-logo.svg'
import NirantaLogo from './images/stay/niranta-logo.png'
import css from './travel-guide.module.scss'
import cn from 'classnames'
import { useTranslations } from 'next-intl'
import { getMessages } from 'utils/intl'
import type { GetStaticPropsContext } from 'next'

const DEVCON_TELEGRAM_URL = 'https://t.me/+sitvvHw8D8EzN2Yx'
const KANISHK_URL = 'https://x.com/kanishkkhurana'

// Marquee tiles, matched by eye to the Figma strip order
const CAROUSEL_IMAGES = [
  CitySeaLink,
  CityTowersDusk,
  CityHarbor,
  CityTaj,
  CityCstNight,
  CityGateway,
  CityCstClock,
  CitySkyline,
  CityMarineDrive,
]

// Zipped positionally with the translated `stay.hotels` array
const HOTEL_META = [
  { url: 'https://app.tripsha.com/event/69b89b4703d64d0002894a82', Logo: null, logoImg: TripshaLogo, logoAlt: 'Tripsha' },
  { url: 'https://flyfi.io/promo/devcon2026/', Logo: FlyfiLogo, logoImg: null, logoAlt: 'FLYFI.IO' },
  { url: 'https://www.nirantahotels.com/', Logo: null, logoImg: NirantaLogo, logoAlt: 'Niranta Hotels' },
]

// Zipped positionally with the translated `stay.areas` array
const AREA_MAP_URLS = [
  'https://www.google.com/maps/search/South+Mumbai',
  'https://www.google.com/maps/search/Bandra+West+Mumbai',
  'https://www.google.com/maps/search/Central+Mumbai',
  'https://www.google.com/maps/search/Andheri+Mumbai',
]

// Zipped positionally with the translated `safety.advisories` array
const ADVISORY_URLS = [
  'https://www.smartraveller.gov.au/destinations/asia/india',
  'https://travel.gc.ca/destinations/india',
  'https://www.diplomatie.gouv.fr/fr/information-par-pays/inde/conseils-aux-voyageurs-securite',
  'https://www.auswaertiges-amt.de/de/service/laender/indien-node/indiensicherheit/205998',
  'https://www.nederlandwereldwijd.nl/reisadvies/india',
  'https://www.safetravel.govt.nz/Destinations/India',
  'https://www.mfa.gov.sg/travelling-overseas/travel-advisories-notices-and-visa-information/india/',
  'https://www.gov.uk/foreign-travel-advice/india',
  'https://travel.state.gov/en/international-travel/travel-advisories/india.html',
]

const snapshotValue = (value: string) => <span style={{ fontWeight: 400, color: '#221144' }}>{value}</span>

// Full-bleed banner with the Devcon 8 logomarks bleeding off both edges.
// The logomark SVG paints with `fill="var(--fill-0, white)"`, so `glyphColor`
// recolors it via the CSS variable (the 10% opacity is baked into the SVG).
const ArtBanner = ({
  background,
  textClassName,
  glyphColor,
  children,
}: {
  background: string
  textClassName: string
  glyphColor?: string
  children: string
}) => {
  const glyphStyle = glyphColor ? ({ '--fill-0': glyphColor } as React.CSSProperties) : undefined

  return (
    <div className="relative overflow-hidden py-[40px] px-[20px] md:px-[32px] xl:px-6 text-center" style={{ background }}>
      <div
        className="absolute top-1/2 -translate-y-1/2 -left-[55px] w-[110px] pointer-events-none [&_svg]:w-full [&_svg]:h-auto"
        style={glyphStyle}
      >
        <Dc8LogomarkWhite />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 -right-[55px] w-[110px] pointer-events-none [&_svg]:w-full [&_svg]:h-auto"
        style={glyphStyle}
      >
        <Dc8LogomarkWhite />
      </div>
      <Markdown className={cn('relative text-xl leading-tight tracking-[-0.5px] [&_strong]:font-bold', textClassName)}>
        {children}
      </Markdown>
    </div>
  )
}

// Zipped positionally with the translated `culture.sights` array
const SIGHT_IMAGES = [CultureGateway, CultureMarineDrive, CultureCst, CultureStreetArt, CultureElephanta]
// Zipped positionally with the translated `culture.notes` array
const NOTE_ICONS = [Ban, HandHeart, Tag, CircleCheckBig, CameraOff]
// Zipped positionally with the translated `culture.wear` array
const WEAR_ICONS = [Shirt, HandHeart, MapPin]

const AdvisoryLinks = ({ label, names }: { label: string; names: string[] }) => (
  <p className={css['body']}>
    {label}{' '}
    {names.slice(0, ADVISORY_URLS.length).map((name, i) => (
      <React.Fragment key={name}>
        {i > 0 && <span className="text-[#594d73]"> · </span>}
        <a
          href={ADVISORY_URLS[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7235ed] font-bold hover:underline"
        >
          {name}
        </a>
      </React.Fragment>
    ))}
  </p>
)

export default function TravelGuidePage() {
  const t = useTranslations('travel_guide')

  const navLinks = [
    { title: t('nav.mumbai'), to: '#mumbai' },
    { title: t('nav.getting_there'), to: '#getting-there' },
    { title: t('nav.where_to_stay'), to: '#where-to-stay' },
    { title: t('nav.safety'), to: '#safety' },
    { title: t('nav.culture'), to: '#culture' },
    { title: t('nav.payments'), to: '#payments' },
    { title: t('nav.events'), to: '#events' },
  ]

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <SEO title={t('title')} />
      <PageHero
        className={`${css['hero-no-side-gradient']} ${css['tg-gutters']} !mb-0`}
        titleClassName={css['hero-title']}
        title={t('title')}
        heroBackground={HeroBackground}
        path={[]}
        navigation={navLinks}
      />

      {/* overflow-anchor: none — Chrome's scroll anchoring otherwise latches
          onto content below an expanding dropdown and auto-scrolls the page,
          making panels appear to expand upward out of view */}
      <div className={cn('[overflow-anchor:none]', css['tg-gutters'])}>

      {/* Section: Aamchi Mumbai! — intro + Good to know */}
      <div
        id="mumbai"
        className={cn('section', css['scroll-anchor'], css['section-pad'], css['section-pad-tight'])}
        style={{
          background: 'radial-gradient(ellipse at center bottom, rgba(255,224,204,1) 0%, rgba(251,250,252,1) 75%)',
        }}
      >
        <div className="flex flex-col gap-[32px] md:gap-[48px] lg:flex-row lg:gap-[64px]">
          <div className="left flex flex-col gap-[16px] md:gap-6 items-start lg:flex-1 lg:min-w-0">
            <h2 className={css['heading-2']}>{t('intro.heading')}</h2>
            <div className="flex flex-col gap-3">
              <p className={css['lead']}>{t('intro.lead')}</p>
              <p className={css['body']}>{t('intro.body')}</p>
            </div>
            <div className="w-full md:w-auto mt-[8px] md:mt-0 flex flex-col md:flex-row md:flex-wrap gap-3">
              <Link to="/tickets" className={css['btn-primary']} target="_blank" rel="noopener noreferrer">
                {t('intro.cta_tickets')}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/speaker-applications#tracks"
                className={css['btn-secondary']}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('intro.cta_whats_on')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="right lg:flex-1 lg:min-w-0">
            <h3 className={css['heading-3']} style={{ marginBottom: 24 }}>
              {t('intro.good_to_know_heading')}
            </h3>
            <div className={css['good-to-know']}>
              <Snapshot
                items={[
                  {
                    Icon: Clock3,
                    title: t('intro.snapshot_labels.timezone'),
                    right: snapshotValue(t('intro.snapshot_values.timezone')),
                  },
                  {
                    Icon: Banknote,
                    title: t('intro.snapshot_labels.currency'),
                    right: snapshotValue(t('intro.snapshot_values.currency')),
                  },
                  {
                    Icon: Languages,
                    title: t('intro.snapshot_labels.languages'),
                    right: snapshotValue(t('intro.snapshot_values.languages')),
                  },
                  {
                    Icon: Thermometer,
                    title: t('intro.snapshot_labels.avg_temp'),
                    right: snapshotValue(t('intro.snapshot_values.avg_temp')),
                  },
                  {
                    Icon: Sun,
                    title: t('intro.snapshot_labels.event_weather'),
                    right: snapshotValue(t('intro.snapshot_values.event_weather')),
                  },
                  {
                    Icon: GlassWater,
                    title: t('intro.snapshot_labels.water'),
                    right: snapshotValue(t('intro.snapshot_values.water')),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Venue details strip */}
      <VenueDetails
        support={{ label: t('venue.label_support'), text: t('venue.support_link'), href: DEVCON_TELEGRAM_URL }}
      />

      {/* Section: Welcome to Mumbai */}
      <div className={cn(css['section-pad'], css['section-pad-welcome'])} style={{ background: '#e5ebff' }}>
        {/* City image marquee */}
        <div className="mb-[48px] lg:mb-[64px] overflow-hidden">
          <InfiniteScroll nDuplications={2} speed="80s" marqueeClassName="!h-[174px]">
            <div className="flex gap-3 pr-3 h-full">
              {CAROUSEL_IMAGES.map((src, i) => (
                <div key={i} className="relative w-[310px] h-[174px] rounded-2xl overflow-hidden shrink-0">
                  <Image src={src} alt={t('welcome.carousel_alt')} fill sizes="310px" className="object-cover" />
                </div>
              ))}
            </div>
          </InfiniteScroll>
        </div>

        <div className="section">
          <div className="flex flex-col gap-[24px] md:gap-[48px] lg:flex-row lg:gap-[64px]">
            <div className="left flex flex-col gap-6 lg:flex-1 lg:min-w-0">
              <h2 className={css['heading-2']}>{t('welcome.heading')}</h2>
              <div className="flex flex-col gap-3">
                <p className={css['lead']}>{t('welcome.lead')}</p>
                <p className={css['body']}>{t('welcome.body_1')}</p>
                <p className={css['body']}>{t('welcome.body_2')}</p>
              </div>
            </div>
            <div className="right flex flex-col gap-[16px] lg:flex-1 lg:min-w-0">
              <InfoTable
                stackOnMobile
                columns={(t.raw('welcome.zone_table.columns') as [string, string])}
                rows={t.raw('welcome.zone_table.rows') as Array<[string, string]>}
              />
              <p className="text-sm leading-5 text-[#594d73] px-0 md:px-6">{t('welcome.zone_caption')}</p>
            </div>
          </div>

          {/* Devcon in Mumbai card with video */}
          <div
            className="relative mt-[48px] lg:mt-[64px] rounded-2xl outline outline-1 outline-white/80 bg-[rgba(255,255,255,0.55)] backdrop-blur-[6px] shadow-[0px_2px_8px_0px_rgba(34,17,68,0.06),0px_1px_2px_0px_rgba(34,17,68,0.1)] p-[20px] md:p-[32px] flex flex-col lg:flex-row gap-[24px] lg:gap-[64px] lg:items-center"
          >
            {/* Faint jaali texture behind the content (2x PNG shown at half
                size). -z-10 keeps it above the card's milky fill but under the
                text/video — the card's backdrop-filter makes it a stacking
                context, so the negative z stays inside the card. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-2xl pointer-events-none bg-repeat opacity-60"
              style={{ backgroundImage: 'url(/travel-guide/jaali-full-bleed-pattern.png)', backgroundSize: '813px 537px' }}
            />
            {/* Desktop: text keeps its ~half-card measure while the video
                narrows to ~424px, centered in the remaining space */}
            <div className="lg:flex-1 xl:flex-none xl:w-[48%] flex flex-col gap-3">
              <h3 className={css['heading-3']}>{t('welcome.devcon_lead')}</h3>
              <p className={css['body']}>{t('welcome.devcon_body_1')}</p>
              <Markdown className={css['prose']}>{t('welcome.devcon_body_2')}</Markdown>
            </div>
            <div className="lg:flex-1 min-w-0 xl:flex xl:flex-col xl:items-center">
              <VideoPlayer
                className="w-full xl:w-[440px] xl:max-w-full"
                src="/travel-guide/kanishk-excited-for-devcon-mumbai.mp4"
                title="Excited for Devcon Mumbai, by @kanishkkhurana"
                poster={VideoDevconMumbaiThumb}
                posterAlt="Devcon Mumbai video"
                caption={
                  <>
                    {t('welcome.video_quote')}{' '}
                    <a
                      href={KANISHK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7235ed] font-bold hover:underline"
                    >
                      @kanishkkhurana
                    </a>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Getting to Mumbai */}
      <div
        id="getting-there"
        className={cn('relative', css['scroll-anchor'], css['section-pad'], css['section-pad-tight'])}
        style={{
          background: 'linear-gradient(to top, #fbfafc 8.5%, #e5ebff 100%)',
        }}
      >
        {/* Top half of the moon graphic pinned to the section bottom (same
            treatment as application-guidelines' .main-bg-moon); the wrapper
            does the clipping — no overflow-hidden on the section, which would
            break the sticky left column. SVG carries 0.25 opacity itself; 0.6
            nets the ~15% from the design. */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1440px] h-[min(719px,100%)] overflow-hidden opacity-60 pointer-events-none [&_svg]:absolute [&_svg]:top-0 [&_svg]:left-0 [&_svg]:w-full [&_svg]:h-auto">
          <MoonBg />
        </div>
        <div className="section relative">
          <div className="flex flex-col gap-[32px] md:gap-[48px] lg:flex-row lg:gap-[64px]">
            <div className="left flex flex-col gap-6 lg:flex-1 lg:min-w-0 lg:sticky lg:top-36 lg:self-start">
              <h2 className={css['heading-2']}>{t('getting_there.heading')}</h2>
              <div className="flex flex-col gap-3">
                <p className={css['lead']}>{t('getting_there.lead')}</p>
                <p className={css['body']}>{t('getting_there.body')}</p>
              </div>
            </div>
            <div className="right lg:flex-1 lg:min-w-0">
              <AccordionGroup
                className="gap-6"
                revealStagger={120}
                items={[
                  {
                    id: 'air',
                    title: t('getting_there.air.title'),
                    children: (
                      <div className="flex flex-col gap-6">
                        <Markdown className={css['prose']}>{t('getting_there.air.body')}</Markdown>
                        <div className="relative aspect-[592/345] rounded overflow-hidden">
                          <Image
                            src={TravelAirport}
                            alt={t('getting_there.air.image_alt')}
                            fill
                            sizes="(max-width: 1024px) 100vw, 592px"
                            className="object-cover"
                          />
                        </div>
                        <h3 className={cn(css['heading-3'], '!mt-6')} style={{ color: '#1a0d33' }}>
                          {t('getting_there.air.from_airport_heading')}
                        </h3>
                        {(t.raw('getting_there.air.options') as Array<{ title: string; body: string }>).map(option => (
                          <div key={option.title} className="flex flex-col gap-3">
                            <p className="text-xl font-extrabold leading-[1.3] text-[#1a0d33]">{option.title}</p>
                            <p className={css['body']}>{option.body}</p>
                          </div>
                        ))}
                        <InfoTable
                          className="!rounded"
                          stackOnMobile
                          columns={(t.raw('getting_there.air.route_table.columns') as [string, string])}
                          rows={t.raw('getting_there.air.route_table.rows') as Array<[string, string]>}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'train',
                    title: t('getting_there.train.title'),
                    children: (
                      <div className="flex flex-col gap-6">
                        <Markdown className={css['prose']}>{t('getting_there.train.body')}</Markdown>
                        <div className="relative aspect-[592/345] rounded overflow-hidden">
                          <Image
                            src={TravelTrain}
                            alt={t('getting_there.train.image_alt')}
                            fill
                            sizes="(max-width: 1024px) 100vw, 592px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'car',
                    title: t('getting_there.car.title'),
                    children: (
                      <div className="flex flex-col gap-6">
                        <Markdown className={css['prose']}>{t('getting_there.car.body')}</Markdown>
                        <div className="relative aspect-[592/345] rounded overflow-hidden">
                          <Image
                            src={TravelParking}
                            alt={t('getting_there.car.image_alt')}
                            fill
                            sizes="(max-width: 1024px) 100vw, 592px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* Travel Tips + Welcome Booth cards */}
          <RevealGroup className="mt-[48px] flex flex-col md:flex-row gap-[24px] items-stretch">
            <Reveal delay={120} className="md:flex-1">
              <div className="h-full rounded-2xl outline outline-1 outline-[rgba(34,17,68,0.1)] bg-[rgba(255,255,255,0.8)] backdrop-blur-[2px] p-6 flex flex-col gap-6">
                <h3 className={css['heading-3']}>{t('getting_there.tips_heading')}</h3>
                <Markdown className={css['prose']}>{t('getting_there.tips')}</Markdown>
                <Markdown className={cn(css['prose'], 'mt-auto')}>{t('getting_there.tips_visa')}</Markdown>
              </div>
            </Reveal>
            <Reveal delay={240} className="md:flex-1">
              <div className="h-full relative rounded-2xl outline outline-1 outline-[rgba(34,17,68,0.1)] overflow-hidden p-6 flex flex-col justify-end min-h-96">
              <Image
                src={WelcomeBoothCard}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 1024px) 100vw, 644px"
                className="object-cover object-top"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(231,236,255,0) 0%, rgba(231,236,255,0.97) 47.5%)' }}
              />
              <div
                className="absolute top-6 left-6"
                style={{ filter: 'drop-shadow(0 2px 16px #ABFBF9) drop-shadow(0 2px 8px rgba(255, 255, 255, 0.68))' }}
              >
                <Image src={DC8Logo} alt="Devcon 8 India" className="h-16 w-auto" />
              </div>
              <div className="relative flex flex-col gap-3">
                <h3 className={css['heading-3']}>{t('getting_there.booth_heading')}</h3>
                <p className={css['body']} style={{ color: '#1a0d33' }}>
                  {t('getting_there.booth_body_1')}
                </p>
                <p className={css['body']} style={{ color: '#1a0d33' }}>
                  {t('getting_there.booth_body_2')}
                </p>
              </div>
              </div>
            </Reveal>
          </RevealGroup>
        </div>
      </div>

      {/* Purple welcome-booth banner */}
      <ArtBanner background="#7235ed" textClassName="text-white">
        {t('getting_there.banner')}
      </ArtBanner>

      {/* Section: Where to stay */}
      <div
        id="where-to-stay"
        className={cn(css['scroll-anchor'], css['section-pad'])}
        style={{
          background: 'linear-gradient(to bottom, #efe7fd 0%, #fff0e6 100%)',
        }}
      >
        {/* .section is a 3-column grid (gutter/content/gutter): gap-y only —
            an x gap would inset the content column off the global margins */}
        <div className="section gap-y-[48px]">
          <div className="flex flex-col gap-[16px] md:gap-6">
            <h2 className={css['heading-2']}>{t('stay.heading')}</h2>
            <div className="flex flex-col gap-[12px] md:gap-[48px] lg:flex-row lg:gap-[64px]">
              <div className="left flex flex-col gap-3 lg:flex-1 lg:min-w-0">
                <p className={css['lead']}>{t('stay.lead')}</p>
                <Markdown className={css['prose']}>{t('stay.body')}</Markdown>
              </div>
              <div className="right lg:flex-1 lg:min-w-0">
                <Markdown className={css['prose']}>{t('stay.aside')}</Markdown>
              </div>
            </div>
          </div>

          {/* One trigger sequences the hotel cards and the More-hotels
              dropdown ladder together */}
          <RevealGroup className="flex flex-col gap-6">
            <h3 className={css['heading-3']}>{t('stay.options_heading')}</h3>
            <div className="flex flex-col md:flex-row gap-[12px] items-stretch">
              {(t.raw('stay.hotels') as Array<{ name: string; body: string; cta: string }>)
                .slice(0, HOTEL_META.length)
                .map((hotel, i) => {
                  const meta = HOTEL_META[i]
                  return (
                    <Reveal key={hotel.name} delay={i * 120} className="md:flex-1">
                    <a
                      href={meta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group h-full flex flex-col justify-between gap-6 rounded-2xl outline outline-1 outline-[rgba(34,17,68,0.1)] bg-[rgba(255,255,255,0.8)] backdrop-blur-[2px] p-[20px] md:p-6 transition-[background-color,box-shadow,transform] duration-150 [transition-timing-function:ease-out] hover:bg-white hover:shadow-md hover:scale-[1.03] active:scale-[0.97]"
                    >
                      <div className="flex flex-col gap-6">
                        <div className="h-[32px] flex items-start">
                          {meta.Logo ? (
                            <meta.Logo className="h-[32px] w-auto" aria-label={meta.logoAlt} />
                          ) : (
                            meta.logoImg && <Image src={meta.logoImg} alt={meta.logoAlt} className="h-[32px] w-auto" />
                          )}
                        </div>
                        <div className="flex flex-col gap-3">
                          <p className="text-xl font-extrabold leading-[1.3] text-[#1a0d33]">{hotel.name}</p>
                          <p className="text-[14px] leading-[20px] text-[#221144]">{hotel.body}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold text-[#7235ed] group-hover:underline">
                        {hotel.cta}
                        <ArrowUpRight size={16} />
                      </span>
                    </a>
                    </Reveal>
                  )
                })}
            </div>

            {/* Continues the hotel cards' 0/120/240ms stagger */}
            <Reveal delay={360}>
              <AccordionGroup
                items={[
                  {
                    id: 'more-hotels',
                    title: t('stay.more_hotels_title'),
                    children: <Markdown className={css['prose']}>{t('stay.more_hotels_body')}</Markdown>,
                  },
                ]}
              />
            </Reveal>
          </RevealGroup>

          <div className="flex flex-col gap-6">
            <h3 className={css['heading-3']}>{t('stay.neighborhoods_heading')}</h3>
            <div className="flex flex-col gap-[24px] xl:flex-row xl:gap-12 items-start">
              <div className="w-full xl:w-[427px] xl:shrink-0">
                <AccordionGroup
                  className="!gap-3"
                  singleOpen
                  items={[
                    ...(t.raw('stay.areas') as Array<{ title: string; commute: string; body: string }>)
                      .slice(0, AREA_MAP_URLS.length)
                      .map((area, i) => ({
                        id: `area-${i}`,
                        title: area.title,
                        subtitle: area.commute,
                        children: (
                          <div className="flex flex-col gap-4">
                            <Markdown className={css['prose']}>{area.body}</Markdown>
                            <a
                              href={AREA_MAP_URLS[i]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm font-bold text-[#7235ed] hover:underline transition-transform duration-150 ease-out active:scale-[0.97]"
                            >
                              {t('stay.view_on_map')}
                              <ArrowUpRight size={16} />
                            </a>
                          </div>
                        ),
                      })),
                    {
                      id: 'areas-to-avoid',
                      title: t('stay.avoid_title'),
                      children: <Markdown className={css['prose']}>{t('stay.avoid_body')}</Markdown>,
                    },
                  ]}
                />
              </div>
              <div className="order-first xl:order-none w-full grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-[12px] xl:flex-1 xl:sticky xl:top-36">
                {[
                  { src: CitySeaLink, alt: 'Bandra–Worli Sea Link' },
                  { src: CityTowersDusk, alt: 'High-rise towers in central Mumbai at dusk' },
                  { src: CityTaj, alt: 'The Taj Mahal Palace hotel in Colaba' },
                  { src: CityMarineDrive, alt: 'The seafront promenade at Marine Drive' },
                ].map(image => (
                  <div key={image.alt} className="relative aspect-[160/90] rounded-2xl overflow-hidden">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 1279px) 50vw, 430px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Safety */}
      <div
        id="safety"
        className={cn('relative overflow-x-clip', css['scroll-anchor'], css['section-pad'], css['section-pad-safety'])}
        style={{ background: '#fff0e6' }}
      >
        {/* Jaali fretwork along the section bottom, behind the content —
            full strength, nudged 4px down to blend into the orange banner below.
            min-w keeps the pattern legible on small screens (the section clips
            the horizontal overhang via overflow-x-clip). */}
        <div
          aria-hidden="true"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full min-w-[1080px] max-w-[1440px] aspect-[1440/84] pointer-events-none [&_svg]:w-full [&_svg]:h-full"
        >
          <JaaliBottom />
        </div>
        <div className="section relative">
          <div className="flex flex-col gap-[48px] lg:flex-row lg:gap-[64px]">
            <div className="left flex flex-col gap-6 lg:flex-1 lg:min-w-0">
              <h2 className={css['heading-2']} style={{ color: '#1a0d33' }}>
                {t('safety.heading')}
              </h2>
              <div className="flex flex-col gap-3">
                <p className={css['lead']}>{t('safety.lead')}</p>
                <p className={css['body']}>{t('safety.body_1')}</p>
                <p className={css['body']}>{t('safety.body_2')}</p>
                <p className={css['body']}>{t('safety.body_3')}</p>
                <p className={css['body']}>{t('safety.body_4')}</p>
                <AdvisoryLinks label={t('safety.advisories_label')} names={t.raw('safety.advisories') as string[]} />
              </div>
            </div>
            <div className="right flex flex-col gap-6 lg:flex-1 lg:min-w-0">
              <InfoTable
                columns={(t.raw('safety.emergency_table.columns') as [string, string])}
                rows={t.raw('safety.emergency_table.rows') as Array<[string, string]>}
              />
              <AccordionGroup
                className="gap-6"
                items={[
                  {
                    id: 'gender-safety',
                    title: t('safety.gender.title'),
                    children: (
                      <div className="flex flex-col gap-3">
                        <p className={css['body']}>{t('safety.gender.body_1')}</p>
                        <p className={css['body']}>{t('safety.gender.body_2')}</p>
                        <AdvisoryLinks
                          label={t('safety.advisories_label')}
                          names={t.raw('safety.advisories') as string[]}
                        />
                        <Markdown className={css['prose']}>{t('safety.gender.body_3')}</Markdown>
                        <Markdown className={css['prose']}>{t('safety.gender.body_4')}</Markdown>
                      </div>
                    ),
                  },
                  {
                    id: 'air-quality',
                    title: t('safety.air.title'),
                    children: <Markdown className={css['prose']}>{t('safety.air.body')}</Markdown>,
                  },
                  {
                    id: 'food-water',
                    title: t('safety.food.title'),
                    children: (
                      <div className="flex flex-col gap-6">
                        <Markdown className={css['prose']}>{t('safety.food.body_1')}</Markdown>
                        <div className="flex gap-3">
                          <div className="relative flex-1 aspect-[310/174] rounded overflow-hidden">
                            <Image
                              src={FoodStreet}
                              alt={t('safety.food.image_alt_1')}
                              fill
                              sizes="(max-width: 1024px) 50vw, 296px"
                              className="object-cover"
                            />
                          </div>
                          <div className="relative flex-1 aspect-[310/174] rounded overflow-hidden">
                            <Image
                              src={FoodSnacks}
                              alt={t('safety.food.image_alt_2')}
                              fill
                              sizes="(max-width: 1024px) 50vw, 296px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <p className={cn(css['body'], 'font-bold')}>{t('safety.food.restaurants_heading')}</p>
                          <Markdown className={css['prose']}>{t('safety.food.restaurants')}</Markdown>
                        </div>
                        <Markdown className={css['prose']}>{t('safety.food.body_2')}</Markdown>
                      </div>
                    ),
                  },
                  {
                    id: 'getting-around',
                    title: t('safety.around.title'),
                    children: (
                      <div className="flex flex-col gap-6">
                        <Markdown className={css['prose']}>{t('safety.around.body_1')}</Markdown>
                        <div className="relative aspect-[592/345] rounded overflow-hidden">
                          <Image
                            src={CityTaxi}
                            alt={t('safety.around.image_alt')}
                            fill
                            sizes="(max-width: 1024px) 100vw, 592px"
                            className="object-cover"
                          />
                        </div>
                        <Markdown className={css['prose']}>{t('safety.around.body_2')}</Markdown>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orange ride-hailing banner */}
      <ArtBanner background="#ffa366" textClassName="text-[#1a0d33]" glyphColor="#160B2B">
        {t('safety.banner')}
      </ArtBanner>

      {/* Section: Culture */}
      <div
        id="culture"
        className={cn(css['scroll-anchor'], css['section-pad'])}
        style={{
          background: 'linear-gradient(to top, #e5ebff 26%, #fbfafc 100%)',
        }}
      >
        <div className="section gap-y-[48px] md:gap-y-[64px]">
          <div className="flex flex-col gap-6">
            <h2 className={css['heading-2']} style={{ color: '#1a0d33' }}>
              {t('culture.heading')}
            </h2>
            <h3 className={css['heading-3']} style={{ color: '#1a0d33' }}>
              {t('culture.sights_heading')}
            </h3>
            {/* One trigger for the whole grid — every set plays its ladder
                sequentially without further scrolling */}
            <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] gap-y-[24px] lg:gap-y-[48px]">
              {(t.raw('culture.sights') as Array<{ title: string; body: string }>)
                .slice(0, SIGHT_IMAGES.length)
                .map((sight, i) => (
                  /* Sets stagger at the page's 120ms rhythm; within a set the
                     text follows its image by 60ms */
                  <div key={sight.title} className="flex gap-4 items-center">
                    <Reveal delay={i * 120} scale={false} className="shrink-0">
                      <div className="relative w-[132px] h-[180px] rounded-2xl overflow-hidden">
                        <Image src={SIGHT_IMAGES[i]} alt={sight.title} fill sizes="132px" className="object-cover" />
                      </div>
                    </Reveal>
                    <Reveal delay={i * 120 + 60} scale={false} className="min-w-0">
                      <div className="flex flex-col gap-2">
                        <p className="text-[16px] font-bold leading-[24px] text-[#1a0d33]">{sight.title}</p>
                        <p className="text-[14px] leading-[20px] text-[#221144]">{sight.body}</p>
                      </div>
                    </Reveal>
                  </div>
                ))}
            </RevealGroup>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className={css['heading-3']} style={{ color: '#1a0d33' }}>
              {t('culture.notes_heading')}
            </h3>
            <div className="flex flex-wrap gap-[12px]">
              {(t.raw('culture.notes') as string[]).slice(0, NOTE_ICONS.length).map((note, i) => {
                const NoteIcon = NOTE_ICONS[i]
                return (
                  <div
                    key={note}
                    className="w-full md:w-auto flex items-center gap-[12px] p-[16px] md:pl-4 md:pr-5 md:py-5 rounded-lg outline outline-1 outline-white/80 bg-[rgba(255,255,255,0.55)] backdrop-blur-[6px] shadow-[0px_2px_8px_0px_rgba(34,17,68,0.06),0px_1px_2px_0px_rgba(34,17,68,0.1)]"
                  >
                    <NoteIcon size={24} className="shrink-0 text-[#ff6600]" />
                    <Markdown className="text-base leading-6 text-[#221144] [&_strong]:font-bold">{note}</Markdown>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className={css['heading-3']} style={{ color: '#1a0d33' }}>
              {t('culture.wear_heading')}
            </h3>
            <div className="flex flex-col md:flex-row gap-[12px] items-stretch">
              {(t.raw('culture.wear') as Array<{ title: string; body: string }>)
                .slice(0, WEAR_ICONS.length)
                .map((item, i) => {
                  const WearIcon = WEAR_ICONS[i]
                  return (
                    <div
                      key={item.title}
                      className="md:flex-1 flex flex-col gap-[12px] p-[20px] rounded-lg outline outline-1 outline-white/80 bg-[rgba(255,255,255,0.55)] backdrop-blur-[6px] shadow-[0px_2px_8px_0px_rgba(34,17,68,0.06),0px_1px_2px_0px_rgba(34,17,68,0.1)]"
                    >
                      <WearIcon size={24} className="shrink-0 text-[#ff6600]" />
                      <div className="flex flex-col gap-1">
                        <p className="text-[16px] font-bold leading-[24px] text-[#221144]">{item.title}</p>
                        <p className="text-[14px] leading-[20px] text-[#221144]">{item.body}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className={css['heading-3']} style={{ color: '#1a0d33' }}>
              {t('culture.festivals_heading')}
            </h3>
            <div className="flex flex-col gap-[48px] lg:flex-row lg:gap-[64px]">
              <div className="left flex flex-col gap-3 lg:flex-1 lg:min-w-0">
                <Markdown className={cn(css['prose'], '[&_strong]:text-[#7235ed]')}>{t('culture.diwali_1')}</Markdown>
                <p className={css['body']}>{t('culture.diwali_2')}</p>
                <p className={css['body']}>{t('culture.diwali_3')}</p>
                <Markdown className={cn(css['prose'], '[&_strong]:text-[#7235ed]', 'mt-3')}>
                  {t('culture.bollywood_1')}
                </Markdown>
                <p className={css['body']}>{t('culture.bollywood_2')}</p>
                <Markdown className={css['prose']}>{t('culture.bollywood_3')}</Markdown>
              </div>
              <div className="right lg:flex-1 lg:min-w-0">
                <VideoPlayer
                  src="/travel-guide/nidzi-local-culture.mp4"
                  title="Must-dos when visiting India, by @nidhisinghattri"
                  poster={VideoNidhiThumb}
                  posterAlt="Must-dos when visiting India, by @nidhisinghattri"
                  caption={
                    <>
                      <a
                        href="https://x.com/nidhisinghattri"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7235ed] font-bold hover:underline"
                      >
                        @nidhisinghattri
                      </a>{' '}
                      {t('culture.video_caption')}
                    </>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Payments & Crypto */}
      <div
        id="payments"
        className={cn(css['scroll-anchor'], css['section-pad'])}
        style={{ background: '#e5ebff' }}
      >
        <div className="section">
          {/* Single column at both new tiers — only the full desktop splits */}
          <div className="flex flex-col gap-[24px] md:gap-[48px] xl:flex-row xl:gap-[64px]">
            <div className="left flex flex-col gap-6 xl:flex-1 xl:min-w-0">
              <h2 className={css['heading-2']}>{t('payments.heading')}</h2>
              <div className="flex flex-col gap-3">
                <h3 className={css['heading-3']} style={{ color: '#1a0d33' }}>
                  {t('payments.cards_heading')}
                </h3>
                <p className={css['lead']}>{t('payments.cards_lead')}</p>
                <p className={css['body']}>{t('payments.cards_body')}</p>
              </div>
              <AccordionGroup
                items={[
                  {
                    id: 'upi',
                    title: t('payments.upi_title'),
                    children: <Markdown className={css['prose']}>{t('payments.upi_body')}</Markdown>,
                  },
                ]}
              />
            </div>
            <div className="right xl:flex-1 xl:min-w-0">
              <div className="relative rounded-2xl outline outline-1 outline-white/80 bg-[rgba(255,255,255,0.55)] backdrop-blur-[6px] shadow-[0px_2px_8px_0px_rgba(34,17,68,0.06),0px_1px_2px_0px_rgba(34,17,68,0.1)] p-[24px] md:p-[32px] flex flex-col gap-6">
                <h3 className={css['heading-3']}>{t('payments.digital_heading')}</h3>
                <div className="flex flex-col gap-3">
                  <p className={css['body']}>{t('payments.digital_1')}</p>
                  <p className={css['body']}>{t('payments.digital_2')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Side events & Community */}
      <div
        id="events"
        className={cn('relative', css['scroll-anchor'], css['section-pad'])}
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 100%), linear-gradient(to bottom, #eeadfc 0%, #ffed7a 100%)',
        }}
      >
        {/* Jaali fretwork on the right edge, behind the content — aspect kept
            (width follows section height). Hidden below lg where it would
            crowd the stacked layout. */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-full opacity-20 pointer-events-none hidden lg:block [&_svg]:h-full [&_svg]:w-auto"
        >
          <JaaliSide />
        </div>
        <div className="section relative">
          <div className="flex flex-col gap-[24px] lg:flex-row lg:gap-[64px] lg:items-center">
            <div className="left flex flex-col gap-[16px] md:gap-6 items-start lg:flex-1 lg:min-w-0">
              <h2 className={css['heading-2']}>{t('events.heading')}</h2>
              <div className="flex flex-col gap-3">
                <p className={css['lead']}>{t('events.lead')}</p>
                <Markdown className={css['prose']}>{t('events.body_1')}</Markdown>
                <p className={css['body']}>{t('events.body_2')}</p>
              </div>
              <Link to="/road-to-devcon" className={css['btn-secondary']}>
                {t('events.cta')}
                <ArrowRight size={16} />
              </Link>
            </div>
            {/* Images sit above the text when stacked; the large hackathon
                image only exists in the side-by-side layout */}
            <div className="right order-first lg:order-none lg:flex-1 lg:min-w-0">
              <div className="flex flex-col gap-[12px] lg:h-[430px]">
                <div className="hidden lg:block relative lg:flex-1 rounded-2xl overflow-hidden">
                  <Image
                    src={RtdHackathon}
                    alt={t('events.image_alt_1')}
                    fill
                    sizes="(max-width: 1024px) 100vw, 624px"
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-[12px] h-[220px] lg:h-auto lg:flex-1 lg:min-h-0">
                  {/* Mobile flips the emphasis: wide image first (250/128 @430) */}
                  <div className="relative w-2/3 md:w-auto md:flex-1 rounded-2xl overflow-hidden">
                    <Image
                      src={RtdMeetup}
                      alt={t('events.image_alt_2')}
                      fill
                      sizes="(max-width: 1024px) 40vw, 195px"
                      className="object-cover"
                    />
                  </div>
                  <div className="relative flex-1 md:flex-none md:w-2/3 rounded-2xl overflow-hidden">
                    {/* Mobile shows the hackathon hall here (the design drops
                        the group photo); md+ shows the group photo as before */}
                    <Image
                      src={RtdHackathon}
                      alt={t('events.image_alt_1')}
                      fill
                      sizes="33vw"
                      className="object-cover md:hidden"
                    />
                    <Image
                      src={RtdGroup}
                      alt={t('events.image_alt_3')}
                      fill
                      sizes="(max-width: 1024px) 60vw, 417px"
                      className="object-cover object-bottom hidden md:block"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Page>
  )
}

export async function getStaticProps(context: GetStaticPropsContext) {
  const locale = context.locale ?? 'en'
  const messages = await getMessages(locale)
  return { props: { messages } }
}
