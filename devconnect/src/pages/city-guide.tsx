import { NextPage } from 'next'
import React, { useEffect } from 'react'
import { Footer } from './index'
import ImageNew from 'next/image'
import Hero from 'common/components/hero'
// import AmsterdamHero from 'assets/images/amsterdam-hero.jpg'
import HeroImage from 'assets/images/city-guide/city-guide.png'
import { useRouter } from 'next/dist/client/router'
import AreasToStayCityCenter from 'assets/images/city-guide/city-center.png'
import AreasToStayEast from 'assets/images/city-guide/east.png'
import AreasToStaySouth from 'assets/images/city-guide/south.png'
import AreasToStayWest from 'assets/images/city-guide/west.png'
import Script from 'next/script'
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
import UberIcon from 'assets/icons/uber.svg'
// import BiTaksiIcon from 'assets/icons/bitaksi.svg'
import moment from 'moment'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import Link, { useDraggableLink } from 'common/components/link'
import Accordion, { AccordionItem } from 'common/components/accordion'
import Head from 'next/head'
import JohnFreelyIstanbul from 'assets/images/city-guide/media/john-freely-istanbul.png'
import MyNameIsRed from 'assets/images/city-guide/media/my-name-is-red.png'
import Distant from 'assets/images/city-guide/media/distant.png'
import FromRussiaWithLove from 'assets/images/city-guide/media/from-russia-with-love.png'
import CrossingTheBridge from 'assets/images/city-guide/media/crossing-the-bridge.png'
import LayersOfIstanbul from 'assets/images/city-guide/media/layers-of-istanbul.png'
import OrientExpress from 'assets/images/city-guide/media/murder-orient-express.png'
import Peace from 'assets/images/city-guide/media/peace.png'
import Skyfall from 'assets/images/city-guide/media/skyfall.png'
import TheCat from 'assets/images/city-guide/media/the-cat.png'
import Alert from 'common/components/alert'
import BitaksiImage from 'assets/images/bitaksi.png'

const tabs = [
  {
    text: 'General info',
    value: 'general-info',
  },
  {
    text: 'Useful Information',
    value: 'plan-your-travels',
    content: () => {
      return (
        <div className={`tab-content ${css['plan-your-travels']}`}>
          {/* <p>
            <b>Timezone</b>: GMT+3 (all year, as Turkey has no daylight savings time)
          </p> */}
          {/* <p className="big-text">
            <b>Visa requirements</b>: Get your Visa before your travels,{' '}
            <Link href="https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa">if you need one</Link>!
          </p> */}
          {/* <p className="big-text">
            <b>Need a Visa invitation letter?</b> Check if you need a visa{' '}
            <Link
              indicateExternal
              href="https://team.notion.site/pse-team/Istanbul-Tourist-Visa-30-90-days-E-Visa-Public-5f83cc372a224c1e9b3ed6d6170aa0a8"
            >
              here
            </Link>
            &nbsp;and if you need an invitation letter, you can{' '}
            <Link indicateExternal href="https://forms.gle/zDQ6ax5Ukr75gDXt5">
              fill out this form
            </Link>
            . You will need to purchase a{' '}
            <Link indicateExternal href="https://devconnect.org/cowork">
              Cowork ticket
            </Link>{' '}
            before we can issue a letter.
          </p> */}

          <p className="big-text">
            <b>Wifi: </b>
            It&apos;s always nice to be connected while on-the-go or have a backup in case of poor connectivity: We
            recommend purchasing a local SIM card or a large package of an e-SIM. We have secured discounts from two
            different e-SIM providers for you:
            <br />
            <br />
            <b>a)</b> The local provider <Link href="https://roamless.com/">Roamless</Link> offers you 2GB for free and
            when they are used, you get another $5 free credit if you add $20 or more into your Roamless wallet. Use the
            code "DEVCONNECT".
            <br />
            <b>b)</b> <Link href="https://www.airalo.com/turkey-esim">Airalo</Link> offers a 20% discount for all
            Devconnect cowork attendees to receive 20% off their chosen data package with the code “DEVCONNECT” up until
            30th November, 2023.
          </p>

          <p className="big-text">
            In addition, you can purchase a local sim card or e-sim with better rates through official stores of
            Turkcell, TurkTelecom, and Vodafone. Please make sure to go to the official stores to get the standard
            rates, they will require your passport to issue your Sim card.
          </p>

          <p className="big-text">
            <b>Exchange Rate: </b>
            The best exchange rate you can find currently is ~22.80, the exchanges near the Devconnect co-work venue are
            ~28.10 you can potentially find better around the gold market / grand bazaar. Although credit cards all
            widely used it is good to have some cash in case of emergency or sometimes Ubers and taxis want cash during
            late nights or busy times.
          </p>

          {/* <p className="big-text">
            <b>Weather whispers: </b>
            Istanbul in autumn is a mix of crisp air with occasional rain showers. Pack some cozy layers and don't
            forget your rain jacket.
          </p>

          <p className="big-text">
            <b>The “City with seven hills”: </b>
            Pack some good shoes to walk around.
          </p> */}

          <div className={css['airports']}>
            <div>
              <Link href="https://goo.gl/maps/mZRy5WnRe4JBfoBK9" />
              <div className={css['header']}>
                <p className="bold">IST</p>
                <div className="grey bold">40km to venue</div>
              </div>
              <p className="bold big-text">Istanbul International Airport</p>
              <p>
                Approx. cost to venue by taxi: ~700-900 <b>TRY</b>
              </p>
              <div className={css['directions']}>
                <PinIcon /> <div className="tag tiny-text bold">Get Directions</div>
                <div className="flex justify-end grow">
                  <Link className={css['taxi-link']} href="https://www.uber.com/tr/en/ride/">
                    <UberIcon className="h-[32px] w-[32px]" />
                  </Link>
                  <Link className={css['taxi-link']} href="https://www.bitaksi.com/en#bitaksi">
                    <ImageNew src={BitaksiImage} height="32" width="32" alt="haha" />
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <Link href="https://goo.gl/maps/XPAryow8Dagvxeer6" />
              <div className={css['header']}>
                <p className="bold">SAW</p>
                <div className="grey bold">60km to venue</div>
              </div>
              <p className="bold big-text">Sabiha Gökçen Airport</p>
              <p>
                Approx. cost to venue by taxi: ~900-1100 <b>TRY</b>
              </p>
              <div className={css['directions']}>
                <PinIcon /> <div className="tag tiny-text bold">Get Directions</div>
                <div className="flex justify-end grow">
                  <Link className={css['taxi-link']} href="https://www.uber.com/tr/en/ride/">
                    <UberIcon className="h-[32px] w-[32px]" />
                  </Link>
                  <Link className={css['taxi-link']} href="https://www.bitaksi.com/en#bitaksi">
                    <ImageNew src={BitaksiImage} height="32" width="32" alt="haha" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="big-text">
            <p className="mt-5">
              <b>From the Airport to the city</b>
            </p>
            <ul>
              {/* <li>We recommend using public transport (metro+bus) because taxis are not easy to find + traffic ⚠️</li> */}
              <li>For taxis, use Uber or BiTaksi to ensure you can get the best, fair rate.</li>
              <li>
                Another option to get from the airports to Taskim are couch type buses or the M2 metro. There are couch
                type Havaist (IST) and Havabus (SAW) buses to the city. Find the bus to Taksim. Depending on your final
                destination either:
                <ul>
                  <li>Get off at Levent and take M2 metro.</li>
                  <li>Get off at Taksim and walk to your place.</li>
                </ul>
              </li>
            </ul>

            <p>Keep in mind there can be traffic in rush hours (17pm-19pm)</p>

            <p>
              <b>Public transport</b>
            </p>
            <ul>
              <li>
                <b>
                  <Link href="https://www.metro.istanbul/en/" indicateExternal>
                    Metro / Tram:
                  </Link>
                </b>{' '}
                The fastest, not everywhere
              </li>
              <li>
                <b>Taxi / Taxibus:</b> only 20,000 taxis for 20m inhabitants. Taxibus are cheap and convenient
              </li>
              <li>
                <b>Bus:</b> Go everywhere, but traffic
              </li>
              <li>
                <b>Ferry:</b> to cross the Bosphorus
              </li>
              <li>
                {' '}
                👉 To use all public transportation in Istanbul you will need the Istanbulkart (might not work seamless
                for non-locals) or simply use contactless payments. 💳 Get the card and top it up at kiosks near metro
                stations, piers, and bus stations. 💵 Approximate costs: 9.90 TL ($0.4) per trip
              </li>
            </ul>

            <p>
              <b>Apps</b>
            </p>
            <ul>
              <li>
                <b>
                  <Link href="https://www.uber.com/tr/en/ride/" indicateExternal>
                    Uber
                  </Link>{' '}
                  or{' '}
                  <Link href="https://www.bitaksi.com/en#bitaksi" indicateExternal>
                    BiTaksi
                  </Link>
                  :
                </b>{' '}
                to order taxis
              </li>
              <li>
                <b>isbike:</b> city bikes by the municipality.
              </li>
              <li>
                <b>Google Maps or Moovit:</b> for route planning and real-time information on public transport.
              </li>
            </ul>
          </div>

          <Link
            className="button orange margin-top-less margin-right-less"
            href="https://itublockchain.notion.site/itublockchain/Tourist-Guide-by-ITU-Blockchain-e09893e5555b4f8e9b4c6ae854b599cd "
          >
            <PinIcon />
            Tourist Guide by ITU
          </Link>
        </div>
      )
    },
  },
  {
    text: 'Tips from a Local',
    value: 'local-tips',
    content: () => {
      return (
        <div className="tab-content">
          <p>
            <b>Practical information</b>
          </p>
          <ul>
            <li>We recommend downloading a VPN before arriving to Istanbul.</li>
            <li>
              <b>Credit Card:</b> Widely used in Istanbul, you don't need much cash.
            </li>
            <li>
              <b>Best exchange:</b> We recommend avoiding exchanges at the airport for their poor rates. There are lots
              of change offices in every district.
            </li>
            <li>
              <b>Tipping culture:</b> 5-10% or rounding up.
            </li>
            <li>
              <b>Tap water:</b> NOT safe to drink. Bottled water is easy to find.
            </li>
          </ul>
          <p>
            <b>"The shoe shiner scam"</b>
          </p>
          <p>
            Beware of shoe shiners in Istanbul who may{' '}
            <Link indicateExternal href="https://turkishtravelblog.com/shoe-shine-scam-istanbul/">
              drop their brush near you
            </Link>
            , then offer to shine your shoe in gratitude - they will greatly overcharge you out of claimed desperation,
            so politely decline. Stick to regular shoe shiners at their stools to avoid being scammed.
          </p>
          <p>
            <b>Negotiate on markets</b>
          </p>
          <p>
            Always bargain at bazaars, like the Grand Bazar or Spice Market. There&apos;s always room for some discount.
            These guys are sales experts!
          </p>
          <p>
            <b>Taxis</b>
          </p>
          <ul>
            <li>Risk of scamming in regular taxis is high.</li>
            <li>Use Uber or BiTaksi apps to find a taxi, follow your route, and always check the license plate.</li>
            <li>
              It can get difficult to find a taxi in rush hours or crowded areas, so better use public transport then.
            </li>
            <li>
              If you need to use a regular taxi, always check that the taximeter is turned on and counting when
              you&apos;re driving.
            </li>
            <li>
              There can indeed be extra fees for crossing highways, bridges, and tunnels, and taxi drivers might ask you
              for it.
            </li>
            <li>
              In case you think you were overcharged or have a problem take note of the taxi plate. You can file a
              complaint at the “White Desk” of the municipality by calling “153”, from the{' '}
              <Link indicateExternal href="https://cozummerkezi.ibb.istanbul/application/cozummerkezi">
                website
              </Link>
              ,{' '}
              <Link indicateExternal href="https://play.google.com/store/apps/details?id=com.tr.gov.ibb.istanbulsenin">
                Android
              </Link>
              , or{' '}
              <Link indicateExternal href="https://apps.apple.com/tr/app/lstanbul-senin/id1534342254?l=tr">
                Apple
              </Link>{' '}
              apps.
            </li>
          </ul>
          <p>
            <b>How do I behave around the cats “miyav”?</b>{' '}
          </p>
          <p>
            Many locals view the cats as communally-owned pets rather than traditional strays, and it&apos;s common to
            feed them. Here there is a documentary about cats in Istanbul: “Kedi”{' '}
            <Link indicateExternal href="https://www.youtube.com/watch?v=PpG0z-npFIY&amp;ab_channel=vlogbrothers">
              https://www.youtube.com/watch?v=PpG0z-npFIY&amp;ab_channel=vlogbrothers
            </Link>
          </p>
          <p>
            <b>Be friendly</b> 🙂
          </p>
          <p>It&#39;s essential to be friendly and get along well with taxi drivers and local shopkeepers.</p>
          <p>
            <b>Do locals speak English?</b>
          </p>
          <p>
            Yes they do, even though their English may not be very fluent. Shopkeepers are very helpful in every matter,
            and you can feel comfortable asking them questions. :)
          </p>
          <Link
            className="button orange margin-top-less margin-right-less"
            href="https://kaanuzdogan.com/kaans-foodie-guide-during-devconnect-istanbul"
          >
            <PinIcon />
            Kaan's Foodie Guide
          </Link>
          <Link
            className="button orange margin-top-less margin-right-less"
            href="https://itublockchain.notion.site/itublockchain/Food-and-Drink-Guide-by-ITU-Blockchain-9598ce3a51494d72a842d71d3692d3d3"
          >
            <PinIcon />
            ITU Food and Drink Guide
          </Link>
          <Link
            className="button orange margin-top-less "
            href="https://www.google.com/maps/@41.0481054,28.9906437,15z/data=!3m1!4b1!4m3!11m2!2sqfLohimFSFu5m5WNqdu32w!3e3?entry=ttu"
          >
            <PinIcon />
            Lunch and dinner spots around ICC
          </Link>
        </div>
      )
    },
  },
  {
    text: 'Safety',
    value: 'safety',
    content: () => {
      return (
        <div className="tab-content">
          <p>
            Safety is our first and primary consideration now, and we are closely monitoring the situation, including
            working closely with local security providers, law enforcement, and external risk advisory partners to
            understand and anticipate risks to Devconnect. We have also conducted an internal review of our security
            arrangements and crisis response plans, to make sure they are appropriate.
          </p>

          <Link href="https://www.gov.il/en/Departments/news/spoke-nsc171023" indicateExternal>
            The Israel government has also released a notice warning any Israelis in the country to leave Turkey
            immediately.
          </Link>

          <br />
          <br />

          <p>
            We recommend to stay informed about the situation and follow the advice of local authorities and your
            embassy. You can find lists of foreign embassies and consulates{' '}
            <Link href="https://www.embassypages.com/city/istanbul" indicateExternal>
              here
            </Link>{' '}
            and{' '}
            <Link href="https://www.allaboutturkey.com/consulate.html" indicateExternal>
              here
            </Link>
            .
          </p>

          <p>
            Additionally, you can stay informed by monitoring local media, like{' '}
            <Link href="https://www.hurriyetdailynews.com/index/istanbul" indicateExternal>
              Hürriyet
            </Link>{' '}
            or{' '}
            <Link href="https://www.dailysabah.com/" indicateExternal>
              Sabah
            </Link>
            .
          </p>

          <p>
            Please take note of the following safety recommendations, and develop your own individual risk mitigation
            plan.
          </p>

          <p>
            <b>Before you arrive</b>
          </p>

          <ul>
            <li>
              Pre-arrange your mobile data for your phone connection. We secured{' '}
              <Link href="#plan-your-travels">discounted rates with providers Airalo and Roamless for you</Link>.
            </li>
            <li>
              Familiarize yourself with <Link href="#general-info">local emergency contacts.</Link>
            </li>
          </ul>

          <p>
            <b>Upon Arrival</b>
          </p>

          <ul>
            <li>
              We are setting up 'Welcome booths' at the airport to help you find your way to your hotel. They will be
              available during the weekend prior to Devconnect (from Friday to Monday (~8AM to 11:59PM)).
            </li>
            <li>Carry some local currency and ensure your credit cards are functioning to avoid hassles.</li>
            <li>
              Crypto payments for goods and services are illegal in Turkey. It is legal to own crypto and trade crypto,
              but keep in mind to avoid using it for payments.
            </li>
          </ul>

          <p>
            <b>Personal safety</b>
          </p>

          <ul>
            <li>
              Always keep an eye on your personal belongings, especially in crowded and tourist areas to prevent petty
              theft.
            </li>
            <li>Pro tip: Keep digital or photocopies of your ID and important documents in a secure place.</li>
            <li>
              For solo travelers, and particularly solo female travelers, avoid walking alone at night and use trusted
              taxi services like BiTaksi or Uber. Regularly check in with friends or colleagues.
            </li>
            <li>
              Use reputable apps like{' '}
              <Link href="https://www.bitaksi.com/en" indicateExternal>
                BiTaksi
              </Link>{' '}
              or Uber, and always check the license plate matches what's shown in the app.
            </li>
            <li>
              For{' '}
              <Link href="https://queerintheworld.com/lgbt-istanbul/" indicateExternal>
                LGBTQ+ travelers
              </Link>{' '}
              it's recommended to keep in mind the religious and political situation and the more conservative
              atmosphere
            </li>
            <li>
              Respect the dress code for religious sites like the Blue Mosque. Fatih, the neighborhood where the Blue
              Mosque and many other historical buildings are located, is quite conservative. It's better to follow the
              dress code there.
            </li>
          </ul>

          <p>
            <b>Transportation</b>
          </p>

          <ul>
            <li>
              Use public transport because traffic in Istanbul can get crazy (especially during peak times), with
              drivers being reckless or ignoring traffic signs.
            </li>
            <li>
              When you use BiTaksi or Uber, verify the license plate, sit in the back, and insist on using the seatbelt.
            </li>
          </ul>

          <p>
            <b>In case of emergencies</b>
          </p>

          <ul>
            <li>Always identify the nearest emergency exits at your hotels and event venues.</li>
            <li>
              In the event of a fire, earthquake, or any emergency, remain calm and follow instructions from
              authorities.
            </li>
          </ul>

          <p>
            <b>Protests and demonstrations</b>
          </p>

          <ul>
            <li>
              Be aware that protests may occur in popular tourist areas. While most are peaceful and organized, if you
              encounter one, we suggest leaving the area calmly without running or drawing attention.
            </li>
            <li>
              Common locations for protests and demonstrations are the Blue Mosque, the Hagia Sophia, the Fatih Mosque,
              and Taksim Square, and more recently, a few peaceful “sit-ins” have occurred at some Starbucks locations.
            </li>
          </ul>

          <p>
            <b>Counterterrorism awareness</b>
          </p>

          <ul>
            <li>
              Be alert and aware of your surroundings when in high-profile public spaces, transportation hubs, and
              tourist places.
            </li>
            <li>Minimize time spent near government facilities whenever possible.</li>
          </ul>

          <p>
            By following these guidelines, you can help ensure a secure visit to Istanbul and Devconnect, allowing you
            to focus on enjoying the various events and on making progress for Ethereum.
          </p>

          {/* <p>
            Istanbul is generally a safe city, but it&apos;s still a major city, so please consider the following tips:
          </p>
          <ul>
            <li>
              <b>Keep an eye on your belongings</b>, especially in crowded and touristic areas like the Grand Bazaar or
              during peak times in public transport.
            </li>
            <li>
              <b>Use reputable apps like BiTaksi or Uber</b>, and always check the license plate matches what&#39;s
              shown in the app.
            </li>
            <li>
              <b>Use public transport</b> (check the “Getting around” section above), as traffic in Istanbul can get
              crazy (especially during peak times), with drivers being reckless or ignoring traffic signs.
            </li>
            <li>
              <b>Solo Travelers</b>: Especially if you&#39;re a solo female traveler, avoid walking alone at night (use
              BiTaski or Uber), stay in busy or tourist areas (check the neighborhood section above), check in with
              friends and tell them where you go, and <b>trust your instincts!</b>{' '}
              <b>If something doesn&#39;t feel right, trust your gut.</b> For example, if a taxi driver seems
              untrustworthy, don&#39;t feel obligated to get into the car.
            </li>
            <li>
              <b>Respect the dress code for religious sites</b> like the Blue Mosque. Fatih, the neighborhood where the
              Blue Mosque and many other historical buildings are located, is quite conservative. It&#39;s better to
              follow the dress code there.
            </li>
            <li>
              <b>Earthquake safety</b>: While Istanbul was not affected by the heavy earthquakes in Turkey and Syria in
              February 2023, earthquake safety might be on some of your minds. It is difficult to predict the occurrence
              of an earthquake. For earthquake preparedness, it is good to inform yourself about the safety of the
              district you are staying. The Cowork venue (ICC) has been{' '}
              <Link indicateExternal href="/files/earthquake_document.pdf">
                certified for being suitable in terms of earthquake regulations legislation
              </Link>
              .
            </li>
          </ul>
          <p>
            When you keep these tips in mind, you&apos;ll for sure have a memorable and enjoyable Devconnect experience.
          </p> */}
        </div>
      )
    },
  },
  // {
  //   text: 'Arriving in Istanbul',
  //   value: 'getting-around',
  //   content: () => {
  //     return (

  //     )
  //   },
  // },
  {
    text: 'Where to Stay',
    alwaysOpen: true,
    value: 'where-to-stay',
    content: () => {
      return (
        <div className={`tab-content ${css['getting-around']}`}>
          <Alert title="Hotel Discounts" className="margin-bottom-less tab-content">
            <p className="margin-bottom-much-less bold">
              🏠We have secured discounted rates with several hotels in the vicinity of the Istanbul Congress Center,
              the Devconnect Cowork venue!
            </p>
            <p className="margin-bottom-much-less bold">
              We expect the available rooms to fill up within a few days, so please submit your booking request asap.
              The rooms are allocated on first come first served basis.
            </p>
            <p className="bold">
              Booking for a group, or have questions? Please contact Kerry Botensten{' '}
              <Link indicateExternal href="mailto:kerry@tripsha.com">
                kerry@tripsha.com
              </Link>
              &nbsp;or&nbsp;
              <Link indicateExternal href="https://t.me/kerrybotes">
                telegram
              </Link>
              .
            </p>
          </Alert>

          <p className="big-text">
            The Bosporus Strait divides Istanbul's neighborhoods into two sides: the European side and the Asian side.
            The Devconnect Cowork venue and probably most Devconnect venues will be located on the European side.
          </p>

          <p className="big-text bold">
            We highly recommend staying in walking distance to the ICC or close to Metro lines M2 and F1 for ease of
            moving around in the city (ICC is connected to Taksim and Osmanbey station).
          </p>

          <div className={css['areas']}>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Nişantaşı/Maçka and Osmanbey</div>
              <p>
                {' '}
                The Devconnect Cowork is right between these two neighborhoods! They are considered central, and elegant
                districts. Taksim and Osmanbey stations are both approximately a 7-minute walking distance from the ICC.
              </p>
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Şişli</div>
              <p> You can reach the ICC venue by walking from many areas in Şişli.</p>
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Beyoğlu</div>
              <p>
                You can reach Beyoğlu via public transport in about 20 minutes. In the neighborhood, you find the famous
                Taksim Square and Istiklal Street, known for their nightlife, and restaurant options.
              </p>
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Karaköy/Galata</div>
              <p>
                Trendy neighborhood, known for its art galleries, boutiques, and cafes. It takes about 15-20 minutes by
                public transport to the ICC.
              </p>
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Beşiktaş</div>A hipster neighborhood close
              to the Bosphorus, filled with bars, cafes, restaurants, and a large student population. It takes 15-20
              minutes by public transport from Beşiktaş Meydan to the ICC venue.{' '}
            </div>
          </div>

          <Link
            className="button orange margin-top-less margin-right-less"
            href="https://itublockchain.notion.site/itublockchain/Accommodation-Guide-by-ITU-Blockchain-261d65cdd210452aa7f7679f5583164e"
          >
            <PinIcon />
            Accommodation Guide by ITU
          </Link>
        </div>
      )
    },
  },
  {
    text: 'History and Culture',
    alwaysOpen: true,
    value: 'history-and-culture',
    content: () => {
      return (
        <div className={`tab-content ${css['history-and-culture']}`} style={{ overflow: 'hidden' }}>
          <p className="">
            Istanbul lies in a geographically unique spot, being the only city that covers two continents - Europe and
            Asia. Istanbul is not only a fusion of continents, it&apos;s also a unique blend of cultures. Ancient
            histories intertwine with the modern world, and many civilizations have left their imprints over the
            millennia.{' '}
          </p>
          <p className="">
            Alone the different names Istanbul has been called give you a sense of the variety of cultures you can
            experience in the city. Initially founded by Greek settlers in the 7th century BC, it was known as{' '}
            <Link indicateExternal href="https://ethereum.org/en/history/#byzantium">
              Byzantium
            </Link>
            . The city later came under Roman rule and was renamed{' '}
            <Link indicateExternal href="https://ethereum.org/en/history/#constantinople">
              Constantinople
            </Link>{' '}
            by the Roman Emperor Constantine the Great. It wasn&#39;t until the 1930s that the city was officially named{' '}
            <Link indicateExternal href="https://ethereum.org/en/history/#istanbul">
              Istanbul
            </Link>
            .{' '}
          </p>

          <p>
            Curious how the city has developed over time? Here are some videos showing Istanbul in the{' '}
            <Link indicateExternal href="https://www.youtube.com/watch?v=Pejti3plPAg">
              1920s
            </Link>
            ,{' '}
            <Link indicateExternal href="https://www.youtube.com/watch?v=wO2-ownJAYc">
              1930s
            </Link>
            , and{' '}
            <Link indicateExternal href="https://www.youtube.com/watch?v=fK09Vz75EyQ">
              1960s
            </Link>
            .
          </p>

          <p className="">
            If you want to delve deeper into understanding Istanbul&apos;s culture, you can get started with some of the
            following movie and book recommendations from a local.{' '}
          </p>

          <p className="bold">Books</p>

          <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
            <div className={css['media']}>
              {[
                {
                  thumbnail: JohnFreelyIstanbul,
                  thumbnailAlt: "Bookcover: John Freely's Istanbul",
                  title: "John Freely's Istanbul",
                  author: 'John Freely',
                  description:
                    'John Freely is an American Academician who has lived in Istanbul for many years and is a lover of Istanbul. In this book, he describes Istanbul in a very detailed and easy-to-read manner. Istanbulites, who love Freely very much, named the Boğaziçi University Western Languages Faculty building after John Freely.',
                },
                {
                  thumbnail: MyNameIsRed,
                  thumbnailAlt: 'Bookcover: My Name Is Red',
                  title: 'My Name Is Red',
                  author: 'Orhan Pamuk',
                  description:
                    ' Orhan Pamuk is a Nobel Prize winner author who was raised in Istanbul. All of his books are related to Istanbul. If you are interested in Postmodernism in Literature, you can find no better narrative builder than Pamuk. You can also read "Snow", and "The Museum of Innocence" from Pamuk',
                },
                {
                  thumbnail: OrientExpress,
                  thumbnailAlt: 'Bookcover: Murder on the Orient Express',
                  title: 'Murder on the Orient Express',
                  author: 'Agatha Christie',
                  description:
                    "Do you like detective novels? Agatha Christie's work can help you get to know Istanbul.",
                },
                {
                  thumbnail: Peace,
                  thumbnailAlt: 'Bookcover: Peace',
                  title: 'Peace',
                  author: 'Ahmet Hamdi Tanpınar',
                  description:
                    'If you are a true bookworm and would like to learn both the Turkish way of life and Istanbul in fine detail and with a poetic-masterfully written novel, Tanpınar will be the best choice for you. It is THE masterpiece.',
                },
              ].map(entry => {
                return (
                  <div className={css['media-item']} key={entry.title}>
                    <div className={css['image']}>
                      <ImageNew src={entry.thumbnail} alt={entry.thumbnailAlt || 'Media thumbnail'} />
                    </div>
                    <div className={css['meta']}>
                      <div className="bold">{entry.title}</div>
                      <div className="small-text bold">{entry.author}</div>
                      <div className="small-text">{entry.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SwipeToScroll>

          <p className="bold">Movies</p>

          <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
            <div className={css['media']}>
              {[
                {
                  thumbnail: Distant,
                  thumbnailAlt: 'Movie poster: Distant',
                  title: 'Distant',
                  author: 'Nuri Bilge Ceylan',
                  description:
                    'You can see the Historical European Quarter of Istanbul in this film. Distant won Palme d&apos;Or and Gran Prize of the Jury, Best Actor prizes from the Cannes Film Festival.',
                },
                {
                  thumbnail: FromRussiaWithLove,
                  thumbnailAlt: 'Movie poster: From Russia With Love',
                  title: 'From Russia With Love',
                  author: 'James Bond',
                  description:
                    'In this film, you can see the legendary “Orient Express” Train line that connects Paris to Istanbul.',
                },
                {
                  thumbnail: Skyfall,
                  thumbnailAlt: 'Movie poster: Skyfall',
                  title: 'Skyfall',
                  author: 'James Bond',
                  description:
                    'People can see some of the most iconic places of Istanbul such as Grand Bazaar and Eminönü and Bosphorus in this Film.',
                },
              ].map(entry => {
                return (
                  <div className={css['media-item']} key={entry.title}>
                    <div className={css['image']}>
                      <ImageNew src={entry.thumbnail} alt={entry.thumbnailAlt || 'Media thumbnail'} />
                    </div>
                    <div className={css['meta']}>
                      <div className="bold">{entry.title}</div>
                      <div className="small-text bold">{entry.author}</div>
                      <div className="small-text">{entry.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SwipeToScroll>

          <p className="bold">Documentaries</p>

          <SwipeToScroll scrollIndicatorDirections={{ right: true }}>
            <div className={css['media']}>
              {[
                {
                  thumbnail: CrossingTheBridge,
                  thumbnailAlt: 'Movie poster: Crossing the Bridge: The Sound of Istanbul',
                  title: 'Crossing the Bridge: The Sound of Istanbul',
                  author: '',
                  description:
                    'Award-winning director Fatih Akin takes us on a journey through Istanbul, the city that bridges Europe and Asia, and challenges familiar notions of East and West. He looks at the vibrant musical scene which includes traditional Turkish music plus rock and hip-hop.',
                },
                {
                  thumbnail: TheCat,
                  thumbnailAlt: 'Movie poster: The Cat',
                  title: 'The Cat',
                  author: '',
                  description:
                    'A profile of İstanbul and its unique people, seen through the eyes of the most mysterious and beloved animal humans have ever known, the Cat.',
                },
                {
                  thumbnail: LayersOfIstanbul,
                  thumbnailAlt: 'Movie poster: Layers of Istanbul (Netflix)',
                  title: 'Layers of Istanbul (Netflix)',
                  author: '',
                  description:
                    'Layers of Istanbul documentary has 6 episodes that comprise Zeyrek, Sultanahmet Square, Sultanahmet Bazaar, Cankurtaran, and Haliç-Vefa, as well as Galata. The documentary utilizes special filming techniques to create 3D models of the structures through scanning, revealing previously unseen details.',
                },
              ].map(entry => {
                return (
                  <div className={css['media-item']} key={entry.title}>
                    <div className={css['image']}>
                      <ImageNew src={entry.thumbnail} alt={entry.thumbnailAlt || 'Media thumbnail'} />
                    </div>
                    <div className={css['meta']}>
                      <div className="bold">{entry.title}</div>
                      <div className="small-text bold">{entry.author}</div>
                      <div className="small-text">{entry.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SwipeToScroll>
        </div>
      )
    },
  },
  {
    text: 'Emergency Number',
    value: 'general-info',
  },
] as any

export const Tabs = (props: any) => {
  const linkAttributes = useDraggableLink()
  const router = useRouter()

  React.useEffect(() => {
    const path = router.asPath
    const anchor = path.split('#').slice(1).pop()

    if (anchor) {
      const decoded = decodeURI(anchor)

      const anchoredTab = props.tabs.find((tab: any) => {
        return tab.value === decoded
      })

      if (anchoredTab) {
        if (props.accordionRefs && props.accordionRefs.current[anchoredTab.value]) {
          props.accordionRefs.current[anchoredTab.value].open()
        }
      }
    }
  }, [])

  return (
    <SwipeToScroll noBounds>
      <div className={css['tabs']}>
        {props.tabs.map((tab: any, index: number) => {
          let className = `${css['tab']}`

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
  const [currentTime, setCurrentTime] = React.useState<any>(null)

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(moment.utc().add(3, 'hours').format('LTS'))
    }, 1000)

    return () => {
      clearInterval(clockInterval)
    }
  }, [])

  return (
    <div className={css['list']}>
      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Clock className={`${css['icon']} icon`} />
          <p className={`bold`}>Timezone: &nbsp;</p>
          <p>GMT+3</p>
        </div>
        <Link
          href="https://www.timeanddate.com/worldclock/turkey/istanbul"
          className={`${css['right']} uppercase hover-underline`}
        >
          {currentTime && <span className="bold">{currentTime}</span>}
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Visa className={`${css['icon']} icon`} />
          <p>
            <b>Visa:</b> tourist visa (30/90 days) & e-visa
          </p>
        </div>
        <Link
          href={`https://team.notion.site/pse-team/Istanbul-Tourist-Visa-30-90-days-E-Visa-Public-5f83cc372a224c1e9b3ed6d6170aa0a8`}
          className={`${css['right']} orange uppercase small-text hover-underline generic`}
          // onClick={(e: any) => {
          //   if (props.accordionRefs.current['plan-your-travels']) {
          //     props.accordionRefs.current['plan-your-travels'].open()
          //   }
          // }}
          indicateExternal
        >
          Requirements
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Dollar className={`${css['icon']} icon`} />
          <p>
            <b>Currency:</b> Turkish Lira (€ EUR)
          </p>
        </div>
        <Link
          href="https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=TRY"
          className={`${css['right']} orange uppercase small-text hover-underline`}
          indicateExternal
        >
          Exchange Rate
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Globe className={`${css['icon']} icon`} />
          <p className="bold">Official language:&nbsp;</p>
          <p> Turkish </p>
        </div>
        {/* <Link
          href="https://www.iamsterdam.com/en/about-amsterdam/amsterdam-information/history-and-society/language"
          className={`${css['right']} orange uppercase tiny-text hover-underline`}
        >
          Language Guide
        </Link> */}
      </div>

      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Water className={`${css['icon']} icon`} />
          <b>Average November weather</b>: 9ºC(47ºF) to 15ºC (59ºF)
        </div>
      </div>

      {/* <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <AnchorLink
            href={`#where-to-stay`}
            className={`uppercase hover-underline generic`}
            onClick={(e: any) => {
              if (props.accordionRefs.current['where-to-stay']) {
                props.accordionRefs.current['where-to-stay'].open()
              }
            }}
          >
            <p className="bold">🏠 Hotel Discounts</p>
          </AnchorLink>
        </div>
        <AnchorLink
          href={`#where-to-stay`}
          className={`${css['right']} orange uppercase tiny-text hover-underline generic`}
          onClick={(e: any) => {
            if (props.accordionRefs.current['where-to-stay']) {
              props.accordionRefs.current['where-to-stay'].open()
            }
          }}
        >
          Contact
        </AnchorLink>
      </div> */}

      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <b>Emergency Number</b>
        </div>
        <div className={css['right']}>112</div>
      </div>

      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <b>Devconnect Emergency Number</b>
        </div>
        <div className={css['right']}>+90 537 797 04 28</div>
      </div>

      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Link href="https://forms.gle/VpDbaJK18HYitJgq9" className="font-bold">
            Incident Report Form
          </Link>
        </div>
        <div className={css['right']}>
          <Link href="https://forms.gle/VpDbaJK18HYitJgq9" indicateExternal className="orange">
            REPORT INCIDENT
          </Link>
        </div>
      </div>
    </div>
  )
}

const CityGuide: NextPage = () => {
  const accordionRefs = React.useRef({} as { [key: string]: any })
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <SEO title="City Guide" description="Devconnect city guide" />
      {/* <Head> */}
      <Script async src="https://platform.twitter.com/widgets.js" charSet="utf-8" />
      {/* </Head> */}
      <Hero
        className={css['city-guide-hero']}
        backgroundClassName={css['background']}
        backgroundTitle="Cityguide"
        backgroundStyle="fill"
        imageProps={{ src: HeroImage, alt: 'Amsterdam' }}
      >
        <div className={css['hero-content']}>
          <p className="uppercase extra-large-text bold secondary">İstanbuL city guide</p>

          <div className={css['hero-text']}>
            <p className="extra-large-text bold">
              <u>Definitive Guide for Devconnect</u>
            </p>
            <p className="extra-large-text">Hoşgeldin</p>
          </div>
        </div>
      </Hero>

      <div className={css['city-guide']}>
        <div className="section fade-in-up">
          <div className={`${css['body']} clear-vertical`} id="general-info">
            <Tabs tabs={tabs} accordionRefs={accordionRefs} />
            <div className={css['general-info']}>
              <div className={css['left']}>
                <p className={`${css['title']} uppercase bold`}>
                  <span className="orange">TURKIYE</span> - [ TUR-KI-YEHHHH ]
                </p>
                <p className="bold big-text">Our destination for Devconnect 2023 is Istanbul!</p>
                <br />
                <p className="big-text margin-bottom-less">
                  One could argue that it is exactly the right time for us to go to Istanbul with Devconnect. Türkiye
                  has seen{' '}
                  <Link
                    href="https://www.reuters.com/technology/cryptoverse-digital-coins-lure-inflation-weary-argentines-turks-2023-05-02/"
                    indicateExternal
                  >
                    one of the highest crypto adoption rates
                  </Link>{' '}
                  in recent years. This can remind us of the positive impact Ethereum can have, offering financial
                  inclusion and empowerment. There are multiple active blockchain university clubs and a thriving
                  Ethereum community in Türkiye.
                </p>
                <p className="big-text margin-bottom-less">
                  Apart from that, Istanbul has a rich culture and heritage because it is home to many cultures and
                  bridges two continents, Europe and Asia. It is a popular destination for visitors with a major
                  international airport (IST). It&apos;s very affordable to live, public transport is efficient and
                  cheap, hospitality is genuine, and there&apos;s a lot to explore: bazaars, kebaps, baklava, and the
                  Bosporus strait.
                </p>
                <p>
                  This guide aims to equip you with everything needed for the best Devconnect experience in Istanbul.
                  For once, you don&apos;t have to DYOR because we&apos;ve done it for you. From accommodation
                  recommendations to getting around in the city and tips from locals, you can consider this your
                  ultimate Devconnect travel resource.
                </p>
              </div>

              <div className={css['right']}>
                <p className={`${css['quick-tips-header']} grey section-header margin-bottom-much-less`}>Quick Tips</p>
                <List accordionRefs={accordionRefs} />
              </div>
            </div>

            <p
              className="section-header orange margin-top-less margin-bottom-much-less border-top padding-top-less"
              id="plan-your-travels"
            >
              Useful Information
            </p>
            <div>{tabs[1].content()}</div>

            <Accordion>
              {tabs.slice(2, tabs.length - 1).map((tab: any) => {
                const tabContent = tab

                return (
                  <AccordionItem
                    key={tab.value}
                    title={<p className="uppercase orange large-text bold">{tab.text}</p>}
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
              <p className={`large-text bold uppercase`}>Devconnect Venues</p>
            </div>
          </div>
        </div>

        <iframe
          src="https://www.google.com/maps/d/embed?mid=1LBiKhOl9rfvkVf2QloJIL539Sr6xrXo&ehbc=2E312F"
          width="100%"
          height="100%"
        ></iframe>
      </div>

      <Footer />
    </>
  )
}

export default CityGuide
