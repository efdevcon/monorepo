import { NextPage } from 'next'
import React from 'react'
import { Footer } from './index'
import Hero from 'common/components/hero'
import AmsterdamHero from 'assets/images/amsterdam-hero.jpg'
import AreasToStayCityCenter from 'assets/images/city-guide/city-center.png'
import AreasToStayEast from 'assets/images/city-guide/east.png'
import AreasToStaySouth from 'assets/images/city-guide/south.png'
import AreasToStayWest from 'assets/images/city-guide/west.png'
import Image from 'next/legacy/image'
import css from './city-guide.module.scss'
import { SEO } from 'common/components/SEO'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import Visa from 'assets/icons/visa.svg'
import Clock from 'assets/icons/clock.svg'
import Globe from 'assets/icons/globe.svg'
import PinIcon from 'assets/icons/pin.svg'
import Dollar from 'assets/icons/dollar.svg'
import Water from 'assets/icons/water.svg'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import Link, { useDraggableLink } from 'common/components/link'
import Accordion, { AccordionItem } from 'common/components/accordion'
import Head from 'next/head'

const tabs = [
  {
    text: 'General info',
    value: 'general-info',
  },
  {
    text: 'Airport transit',
    value: 'airport-transit',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['airport-transit']}`}>
          <p className={`header small-text bold`}>Ride Sharing</p>
          <p className="small-text">
            You can easily Uber or Bolt into Amsterdam or to the Airport. Schiphol Airport is not too far from the City
            Center.
          </p>

          <p className={`header small-text bold`}>Metro</p>
          <Link
            href="https://www.amsterdam.info/transport/metro/"
            indicateExternal
            style={{ display: 'inline-flex' }}
            className="small-text hover-underline"
          >
            <p>View Metro Routes</p>
          </Link>

          <br />
          <br />
          <p className="small-text">
            The Metro will likely have a stop close to your accommodation. <br />
            There is a direct metro to Centraal (main station) which also then has access to many more metro and tram
            stops. After midnight, trains from Schiphol Airport to Centraal Station run hourly rather than every 10-15
            minutes, a taxi, Uber, or Bolt will be your best option.
          </p>
        </div>
      )
    },
  },
  {
    text: 'Getting around',
    value: 'getting-around',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['getting-around']}`}>
          <p className={`header small-text bold`}>Public Transport</p>
          <p className="small-text">
            Amsterdam is easy to bike and harder to drive. Cyclists can make use of the many bike-friendly streets while
            parking is expensive in Center.
          </p>
          <p className="small-text">There is a great public transport system: Train, Tram, Metro, &amp; Bus.</p>
          <p className="medium-text underline">Transport System</p>

          <p className="small-text">
            Amsterdam&apos;s public transport network runs on a ticketing system called <i>GVB</i>.
          </p>
          <p className="small-text">
            Downloading the{' '}
            <Link
              href="https://en.gvb.nl/klantenservice/reizen-met-de-gvb-reisapp-0"
              className="small-text hover-underline"
              indicateExternal
            >
              GVB public transport app
            </Link>{' '}
            should come in handy.
            <br />
            Or download the{' '}
            <Link
              href="https://www.iamsterdam.com/media/pdf/visiting-uit/getting-around/artt-map-nz-lijn-2020.pdf?la=en"
              className="small-text hover-underline"
              indicateExternal
            >
              map
            </Link>{' '}
            in advance.
          </p>

          <p className="medium-text underline">Travel passes</p>
          <p className="small-text">
            Buy an{' '}
            <Link
              href="https://www.ov-chipkaart.nl/purchase-an-ov-chipkaart.htm"
              className="small-text hover-underline"
              indicateExternal
            >
              OV-chipkaart
            </Link>{' '}
            for travel around the city
          </p>
          <p className="small-text">Top this up at any public transport station, or buy day passes, etc.</p>

          <p className={`header small-text bold`}>Bike Rentals</p>
          <p className="small-text">A lot of bike rentals can be found around the Centraal Station.</p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link
              href="https://www.macbike.nl/"
              indicateExternal
              className="small-text hover-underline"
              style={{ display: 'inline-flex' }}
            >
              <p>MAC Bike — Popular for tourists.</p>
            </Link>

            <Link
              href="https://www.yellowbike.nl/en/"
              indicateExternal
              className="small-text hover-underline"
              style={{ display: 'inline-flex' }}
            >
              <p>Yellow Bike</p>
            </Link>
            <Link
              href="https://www.rentabike.nl/"
              indicateExternal
              className="small-text hover-underline"
              style={{ display: 'inline-flex' }}
            >
              <p>Rentabike</p>
            </Link>
          </div>
        </div>
      )
    },
  },
  {
    text: 'Areas to stay',
    value: 'areas-to-stay',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['areas-to-stay']}`}>
          <div className={`columns-2`}>
            <div>
              <p className={`header small-text`}>City Center</p>
              <p className="bold">Areas: Old Center, Canal rings, Red light district (can be noisy)</p>

              <ul className={css['list']}>
                <li>Very lively and has the “Amsterdam energy”</li>
                <li>Beautiful old buildings and history</li>
                <li>Accessible to popular and event-related areas</li>
                <li>Walkable to almost everything you&apos;d like to experience</li>
              </ul>
            </div>
            <div className={css['image']}>
              <Image src={AreasToStayCityCenter} alt="City center" layout="fill" objectFit="cover" priority />
            </div>
          </div>
          <div className={`divider`}></div>
          <div className={`columns-2`}>
            <div>
              <p className={`header small-text`}>East</p>
              <p className="bold">Areas: Eastern Docklands, Plantage</p>

              <ul className={css['list']}>
                <li>Maritime heritage, with fantastic views over the water</li>
                <li>Lots of green, botanical gardens and historical buildings</li>
                <li>
                  Most ethnically diverse, traditional Turkish bakeries, Surinamese supermarkets and Middle Eastern
                  lunchrooms
                </li>
              </ul>
            </div>
            <div className={css['image']}>
              <Image src={AreasToStayEast} alt="East area" layout="fill" objectFit="cover" priority />
            </div>
          </div>
          <div className={`divider`}></div>
          <div className={`columns-2`}>
            <div>
              <p className={`header small-text bold`}>South</p>
              <p className="bold">Areas: De Pijp, Oud Zuid</p>

              <ul className={css['list']}>
                <li>Lively area, with a hip and younger international crowd</li>
                <li>Lots of restaurants and bars and places to hang out</li>
                <li>Oud Zuid is more elegant and close to the museum district</li>
              </ul>
            </div>
            <div className={css['image']}>
              <Image src={AreasToStaySouth} alt="South area" layout="fill" objectFit="cover" priority />
            </div>
          </div>
          <div className={`divider`}></div>
          <div className={`columns-2`}>
            <div>
              <p className={`header small-text bold`}>West</p>
              <p className="bold">Areas: Oud West, Westerpark</p>

              <ul className={css['list']}>
                <li>
                  Close to the biggest parks Vondel Park and Westerpark, which combines expansive greenery with
                  industrial venues (Food Hallen, Westergas)
                </li>
                <li>
                  Cool spot to eat and drink&nbsp;(
                  <Link href="https://foodhallen.nl/" indicateExternal className="small-text hover-underline">
                    Food Hallen
                  </Link>
                  )
                </li>
                <li>Explore the varied mix of local hotspots in the Westerpark</li>
              </ul>
            </div>
            <div className={css['image']}>
              <Image src={AreasToStayWest} alt="West area" layout="fill" objectFit="cover" priority />
            </div>
          </div>
        </div>
      )
    },
  },
  {
    text: 'Food and Drink',
    value: 'food-and-drink',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['food-and-drink']}`}>
          <p className={`header small-text bold`}>General food and drink</p>
          <p className="bold">
            There are so many options for eating and drinking in Amsterdam, especially in the City Center — it&apos;s
            hard to name just a few!
          </p>
          <p className="medium-text underline">Best apple pie</p>
          <ul>
            <li className="bold">Winkel34</li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Popular items to eat</p>
          <ul>
            <li>Poffertjes</li>
            <li>Stroopwafel</li>
            <li>Kibbeling</li>
            <li>Dutch Cheeses</li>
            <li>Pannekoeken</li>
          </ul>
          <div className={`divider`}></div>
          <p className="bold">Brown Bars and Wine Bars are in abundance.</p>
          <p>Eating Borrel is super popular at these bars</p>
          <ul>
            <li>Bitterballen</li>
            <li>Kroket</li>
            <li>Friet (fries)</li>
          </ul>

          <div className={`divider`}></div>
          <p className="bold">Amsterdam based breweries</p>
          <ul>
            <li>
              <Link href="https://goo.gl/maps/HZJQwV47YgXdSTt3A" indicateExternal>
                Brouwerij t IJ
              </Link>
            </li>
            <li>Oedipus</li>
            <li>Troost</li>
          </ul>
        </div>
      )
    },
  },
  {
    text: 'Things to try',
    value: 'things-to-try',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['food-and-drink']}`}>
          <p className={`header small-text bold`}>Activities</p>
          <ul>
            <li className="bold">Take a Canal Cruise</li>
            <li>
              <span className="bold">Biking</span>
              <ul>
                <li>
                  Whether in the city limits or a long bike ride outside the city, Amsterdam has great and safe
                  infrastructure for cyclists.
                </li>
              </ul>
            </li>
            <li>
              <span className="bold">Visit the Dutch Cheese Shops</span>
              <ul>
                <li>There are TONS in Centraal</li>
              </ul>
            </li>
            <li className="bold">Coffee Shops (Not Cafes): DYOR 🙃</li>
            <li className="bold">Red Light District is an interesting and historical part of Amsterdam</li>
          </ul>

          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Museums</p>
          <p>A lot of museums are located near each other at Museum square</p>
          <ul>
            <li>Rijksmuseum</li>
            <li>Van Gogh museum</li>
            <li>Stedelijk museum </li>
            <li>MOCO museum</li>
            <li>Heineken Experience</li>
            <li>Anne Frank Museum</li>
            <li>Straat museum (street art)</li>
            <li>Nxt museum</li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Parks</p>
          <p>Main shopping districts is at the Kalverstraat and Leidsestraat</p>
          <ul>
            <li>Vondel Park (most popular and accessible)</li>
            <li>Westerpark </li>
            <li>Oosterpark</li>
            <li>Rembrandt Park</li>
            <li>Sarphatipark, a nice smaller park in De Pijp</li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Markets</p>
          <ul>
            <li>
              <Link href="https://albertcuyp-markt.amsterdam/?lang=en" indicateExternal>
                Albert Cuyp Market
              </Link>
            </li>
            <li>Waterloopplein</li>
            <li>
              <Link href="https://noordermarkt-amsterdam.nl/" indicateExternal>
                Noordermarkt
              </Link>
            </li>
            <li>Ten Kate market</li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Shopping</p>
          <p>Main shopping districts is at the Kalverstraat and Leidsestraat</p>
          <ul>
            <li>Located between Leidsestraat and the canals you can find the nine streets (negen straatjes)</li>
            <li>The big, well known department stores are the Bijenkort and Magna Plaza</li>
            <li>PC Hooftstraat is Amsterdam&apos;s most exclusive shopping street </li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Explore Amsterdam North</p>
          <p>Take a free ferry ride across the river (IJ). Ferries leave from behind Central Station </p>
          <ul>
            <li>
              Go to Buiksloterweg to visit the A&apos;DAM tower, EYE movie museum, swing over the edge of the rooftop
              bar or chill at the garden of Tolhuistuin.
              <ul>
                <li>
                  Places to visit in the area: Nxt museum, Cafe de Ceuvel, Oedipus Brewery, Skatecafe, FC Hyena, Hangar
                </li>
                <li> Walk or bike along the river and take the ferry back from NDSM </li>
              </ul>
            </li>
            <li>
              Go to NDSM to visit the old shipwharf, one of the most artistic areas of Amsterdam
              <ul>
                <li>
                  Places to visit in the area: STRAAT museum (street art), Anne Frank mural painting, NDSM (wharf /
                  warehouse), Nxt museum, Ijver, Noorderlight or relax at the mini-beach of Pllek
                </li>
                <li> Walk or bike along the river and take the ferry back from Buiksloterweg</li>
              </ul>
            </li>
          </ul>
        </div>
      )
    },
  },
  {
    text: 'General tips',
    value: 'general-tips',
    content: () => {
      return (
        <div className={`tab-content small-text ${css['general-tips']}`}>
          <p className={`header small-text bold`}>General</p>
          <p className="bold underline">Places do not open very early in the mornings in Amsterdam</p>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Attractions</p>
          <p className={`${css['no-clearance']} bold`}>
            Pre-purchase tickets where possible for museums and popular places to visit
          </p>
          <ul className={css['indent']}>
            <li>This is to avoid long queues – especially building into the high season (June to August)</li>
          </ul>
          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Restaurants</p>
          <p className={`${css['no-clearance']} bold`}> Book restaurants in advance</p>
          <ul className={css['indent']}>
            <li>They get booked up and packed very quickly, so it&apos;s best to book to avoid disappointment</li>
          </ul>

          <div className={`divider`}></div>
          <p className={`header small-text bold`}>Biking / Cyclists</p>
          <p className={`${css['no-clearance']}`}>Bike Rentals</p>
          <p className={`${css['no-clearance']} bold`}>
            If you are renting a bike, please be very mindful of locking it securely (bikes do get stolen)
          </p>
          <ul className={css['indent']}>
            <li>Also be VERY MINDFUL of where you park your bike</li>
            <li>
              You can&apos;t just park it anywhere on the street, it will be removed by the Gemeente (Amsterdam
              municipality) if placed incorrectly.
            </li>
          </ul>
          <br />
          <p className={`${css['no-clearance']}`}>Cyclists</p>
          <p className={`${css['no-clearance']} bold`}>Mind the cyclists – and cycling lanes</p>
          <ul className={css['indent']}>
            <li>You will annoy cyclists if you are in the lanes</li>
            <li>And will probably just get knocked over by the incoming bikes.</li>
          </ul>
        </div>
      )
    },
  },
]

export const Tabs = (props: any) => {
  const linkAttributes = useDraggableLink()

  return (
    <SwipeToScroll>
      <div className={css['tabs']}>
        {props.tabs.map((tab: any, index: number) => {
          let className = `uppercase ${css['tab']}`

          const toggled = index === 0

          if (toggled) className += ` ${css['always-toggled']} bold`

          return (
            <AnchorLink
              key={tab.value}
              href={`#${tab.value}`}
              className={className}
              {...linkAttributes}
              onClick={(e: any) => {
                if (props.accordionRefs && props.accordionRefs.current[tab.value]) {
                  props.accordionRefs.current[tab.value].open()
                }

                linkAttributes.onClick(e)
              }}
            >
              {tab.text}
            </AnchorLink>
          )
        })}
      </div>
    </SwipeToScroll>
  )
}

const List = (props: any) => {
  return (
    <div className={css['list']}>
      <div className={css['row']}>
        <div className={`${css['left']} small-text uppercase`}>
          <Clock className={css['icon']} />
          <p className={`bold`}>Timezone: &nbsp;</p>
          <p>CET (UTC/GMT +1)</p>
        </div>
        <Link
          href="https://www.timeanddate.com/worldclock/netherlands/amsterdam"
          className={`${css['right']} blue uppercase tiny-text hover-underline`}
        >
          Current time
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} small-text uppercase`}>
          <Visa className={css['icon']} />
          <p className="bold">VISA:&nbsp;</p>
          <p>SCHENGEN SHORT-STAY</p>
        </div>
        <Link
          href="https://www.government.nl/topics/immigration-to-the-netherlands/question-and-answer/which-visa-do-i-need-to-travel-to-the-netherlands"
          className={`${css['right']} blue uppercase tiny-text hover-underline`}
        >
          REQUIREMENTS
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} small-text uppercase`}>
          <Dollar className={css['icon']} />
          <p className="bold">Currency:&nbsp;</p>
          <p>EURO (€ EUR)</p>
        </div>
        <Link
          href="https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=EUR"
          className={`${css['right']} blue uppercase tiny-text hover-underline`}
        >
          Exchange Rate
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} small-text uppercase`}>
          <Globe className={css['icon']} />
          <p className="bold">Official language:&nbsp;</p>
          <p> DUTCH </p>
        </div>
        <Link
          href="https://www.iamsterdam.com/en/about-amsterdam/amsterdam-information/history-and-society/language"
          className={`${css['right']} blue uppercase tiny-text hover-underline`}
        >
          Language Guide
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} small-text uppercase`}>
          <Water className={css['icon']} />
          <p className="bold">WATER: &nbsp;</p>
          <p>Tap water is safe to drink in Amsterdam.</p>
        </div>
        <AnchorLink
          href={`#faq`}
          className={`${css['right']} blue uppercase tiny-text hover-underline generic`}
          onClick={(e: any) => {
            if (props.accordionRefs.current.faq) {
              props.accordionRefs.current.faq.open()
            }
          }}
        >
          FAQ
        </AnchorLink>
      </div>
    </div>
  )
}

const CityGuide: NextPage = () => {
  const accordionRefs = React.useRef({} as { [key: string]: any })

  return (
    <>
      <SEO title="City Guide" description="Devconnect city guide" />
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <Hero
        className={css['city-guide-hero']}
        backgroundClassName={css['background']}
        backgroundTitle="Amsterdam"
        imageProps={{ src: AmsterdamHero, alt: 'Amsterdam' }}
      >
        <div className={css['hero-content']}>
          <p className="uppercase extra-large-text bold secondary title">Amsterdam —</p>

          <div className={css['items']}>
            {tabs.map(tab => {
              return (
                <AnchorLink
                  key={tab.value}
                  href={`#${tab.value}`}
                  className={`uppercase bold`}
                  onClick={() => accordionRefs.current[tab.value] && accordionRefs.current[tab.value].open()}
                >
                  {tab.text}
                </AnchorLink>
              )
            })}
          </div>
        </div>
      </Hero>

      <div className={css['city-guide']}>
        <div className="section fade-in-up">
          <div className={`${css['body']} clear-vertical`} id="general-info">
            <Tabs tabs={tabs} accordionRefs={accordionRefs} />

            <div className={css['general-info']}>
              <div className={css['left']}>
                <p className={`${css['title']} uppercase`}>
                  AMSTERDAM - <span className="bold">[ ahm-stuhr-dahYUMMMm ]</span>
                </p>

                <p className={`uppercase bold big-text ${css['details-1']}`}>
                  Amsterdam is known as one of the world&apos;s most multicultural cities.{' '}
                </p>

                <p className={`${css['details-2']} bold`}>
                  Like Ethereum, it can mean many things to many different people, and there&apos;s something
                  interesting for everyone. So where better to give a distributed (and passionate) ecosystem a more
                  connected feel than in a city brought together by canals 🛶, bike lanes 🚲, and culture 🏫 throughout?{' '}
                </p>

                <br />

                <p>
                  Find additional events and parties happening around Devconnect through the AMS blockchain week
                  website.
                </p>

                <br />

                <div className={css['call-to-action']}>
                  <Link
                    href="https://www.google.com/maps/d/embed?mid=143AuN51prJpx6M62b9xMTAwdXNm-dstJ&hl=en&ehbc=2E312F"
                    indicateExternal
                    className={`button sm orange-fill`}
                  >
                    {/* <PinIcon className={`${css['pin']} icon`} /> */}
                    Venues Map
                  </Link>

                  <Link
                    href="https://amsterdamblockchainweek.org/"
                    indicateExternal
                    className={`button sm orange-fill`}
                  >
                    AMS Blockchain Week
                  </Link>
                </div>
              </div>

              <div className={css['right']}>
                <List accordionRefs={accordionRefs} />
              </div>
            </div>

            <Accordion>
              {tabs.slice(1).map((tab, index) => {
                const tabContent = tabs[index + 1]

                return (
                  <AccordionItem
                    key={tab.value}
                    title={tab.text}
                    id={tab.value}
                    ref={el => (accordionRefs.current[tab.value] = el)}
                  >
                    {tabContent.content && tabContent.content()}
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      </div>

      <div className={css['map']} id="city-map">
        <div className={css['title']}>
          <div className={`section`}>
            <div className="clear-vertical">
              <p className={`large-text bold uppercase`}>Notable Locations</p>
            </div>
          </div>
        </div>

        <iframe
          src="https://www.google.com/maps/d/embed?mid=143AuN51prJpx6M62b9xMTAwdXNm-dstJ&hl=en&ehbc=2E312F"
          width="100%"
          height="100%"
        ></iframe>
      </div>

      <Footer />
    </>
  )
}

export default CityGuide
