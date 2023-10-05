import { NextPage } from 'next'
import React from 'react'
import { Footer } from './index'
import ImageNew from 'next/image'
import Hero from 'common/components/hero'
// import AmsterdamHero from 'assets/images/amsterdam-hero.jpg'
import HeroImage from 'assets/images/city-guide/city-guide.png'
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

const tabs = [
  {
    text: 'General info',
    value: 'general-info',
  },
  {
    text: 'Getting to Istanbul',
    value: 'plan-your-travels',
    content: () => {
      return (
        <div className={`tab-content ${css['plan-your-travels']}`}>
          {/* <p>
            <b>Timezone</b>: GMT+3 (all year, as Turkey has no daylight savings time)
          </p> */}
          <p className="big-text">
            <b>Visa requirements</b>: Get your Visa before your travels,{' '}
            <Link href="https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa">if you need one</Link>!
          </p>
          <p className="big-text">
            Need a Visa invitation letter? You&apos;ll need a ticket for the Devconnect Cowork first, then you can&nbsp;
            <Link href="https://forms.gle/zDQ6ax5Ukr75gDXt5" indicateExternal>
              fill out this form
            </Link>
            . You will hear back from us via email within 2 weeks.
          </p>

          <p className="big-text bold margin-top-less">Istanbul Airports</p>

          <div className={css['airports']}>
            <Link href="https://goo.gl/maps/mZRy5WnRe4JBfoBK9">
              <div className={css['header']}>
                <p className="bold">IST</p>
                <div className="grey bold">40km to venue</div>
              </div>
              <p className="bold big-text">Istanbul International Airport</p>
              <p>
                Approx. cost to venue by taxi: ~350 <b>TRY</b>
              </p>
              <div className={css['directions']}>
                <PinIcon /> <div className="tag tiny-text bold">Get Directions</div>
              </div>
            </Link>

            <Link href="https://goo.gl/maps/XPAryow8Dagvxeer6">
              <div className={css['header']}>
                <p className="bold">SAW</p>
                <div className="grey bold">60km to venue</div>
              </div>
              <p className="bold big-text">Sabiha Gökçen Airport</p>
              <p>
                Approx. cost to venue by taxi: ~450 <b>TRY</b>
              </p>
              <div className={css['directions']}>
                <PinIcon /> <div className="tag tiny-text bold">Get Directions</div>
              </div>
            </Link>
          </div>

          {/* <b>Airports</b>: Istanbul International Airport (IST) (European side), Sabiha Gökçen Airport (Asian side)
          </p> */}
          {/* <p>
            <b>Official language</b>: Turkish. Thank you ={' '}
            <Link href="https://forvo.com/word/te%C5%9Fekk%C3%BCr_ederim/">Teşekkür ederim</Link>, GM = GA (Günaydın)
          </p> */}
          {/* <p>
            <b>E-SIM providers</b>: Holafly or Airalo{' '}
          </p>
          <p>
            <b>SIM cards with best 4G coverage:</b> Turkcell or Türk Telekom. We recommend buying physical SIM cards in
            a local shop, not at the airport.
          </p> */}
          {/* <p>
            <b>Average November weather</b>: High: 15ºC (59 ºF), Low: 9ºC (47ºF)
          </p> */}
        </div>
      )
    },
  },
  {
    text: 'Experience the City',
    value: 'experience-the-city',
    content: () => {
      return (
        <div className={`tab-content ${css['experience-the-city']}`}>
          <p className="large-text">
            There is an active and vibrant local Ethereum community in Istanbul, and they are excited to welcome
            Devconnect attendees to their city. Many shared small videos with us, showing what Istanbul has to offer.
            Watch the videos, and experience Istanbul&apos;s magic! ✨
          </p>

          <SwipeToScroll noBounds>
            <div className={css['tweets']}>
              {/* <blockquote className="twitter-tweet" data-dnt="true" {...linkAttr}>
                <p lang="en" dir="ltr">
                  🏡In the company of cats, Istanbul will evoke a feeling of home for each one of you.❤️
                  <br />
                  <br />
                  As a part of <a href="https://twitter.com/ITUblockchain?ref_src=twsrc%5Etfw">@ITUblockchain</a> , the
                  excitement is building for{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  🎢
                  <br />
                  <br />
                  Stay tuned for greatness! 🤩{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/QKfuY9ktrW">https://t.co/QKfuY9ktrW</a>{' '}
                  <a href="https://t.co/NAMBAld825">pic.twitter.com/NAMBAld825</a>
                </p>
                &mdash; Tuğçe (@0xtugcee){' '}
                <a href="https://twitter.com/0xtugcee/status/1685606937503657984?ref_src=twsrc%5Etfw">July 30, 2023</a>
              </blockquote> */}
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  There are so many little details that I love about Istanbul! And yes,{' '}
                  <a href="https://twitter.com/ITUblockchain?ref_src=twsrc%5Etfw">@ITUblockchain</a> is the first
                  one…🥺💖 <br />
                  <br />I don&apos;t know which one is second but this metro station is definitely lit 😏😎
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  🐈 <a href="https://t.co/SW36SyCOPp">pic.twitter.com/SW36SyCOPp</a>
                </p>
                &mdash; dilara aka buzagi | pepethe.lens 🌿 (@thebuzagi){' '}
                <a href="https://twitter.com/thebuzagi/status/1685999231201423360?ref_src=twsrc%5Etfw">July 31, 2023</a>
              </blockquote>
              {/* <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  Hey people! Are you excited for Devconnect Istanbul? <br />
                  Cause we are very excited to host you in our home and I wanted to share some videos from daily life.{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/CxMgkAFOSk">pic.twitter.com/CxMgkAFOSk</a>
                </p>
                &mdash; Alamalu (@alamaluu){' '}
                <a href="https://twitter.com/alamaluu/status/1685361500528021504?ref_src=twsrc%5Etfw">July 29, 2023</a>
              </blockquote> */}

              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  Are you ready for Istanbul 🇹🇷{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a> <br />
                  <br />
                  and cats… lots of cats…🐈 <a href="https://t.co/UntAaToUHC">pic.twitter.com/UntAaToUHC</a>
                </p>
                &mdash; hatun (@0xhatun){' '}
                <a href="https://twitter.com/0xhatun/status/1686113561486000128?ref_src=twsrc%5Etfw">July 31, 2023</a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  we&apos;re preparing a comprehensive Istanbul guide with local recommendations{' '}
                  <a href="https://twitter.com/Sublockchain?ref_src=twsrc%5Etfw">@Sublockchain</a> <br />
                  <br />
                  but before that here&apos;s a little video i found <br />
                  📍Macka Democracy Park (also known as Cats Heaven) 🐱✨{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  <a href="https://t.co/gA71shWEIP">pic.twitter.com/gA71shWEIP</a>
                </p>
                &mdash; Helin Cagine (@helincesxyz){' '}
                <a href="https://twitter.com/helincesxyz/status/1684630930697199616?ref_src=twsrc%5Etfw">
                  July 27, 2023
                </a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  I couldn&#39;t fit my favorites in Istanbul into a single
                  <br />
                  frame. I added some synergy with a clip😛
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>
                  <br />
                  <br />
                  ⬇️Everybody says Taksim Square, Madien&#39;s Towers
                  <br />
                  etc. Here are the things you should do in Istanbul, like
                  <br />
                  the ones from Istanbul <a href="https://t.co/9PDSTJevVX">pic.twitter.com/9PDSTJevVX</a>
                </p>
                &mdash; Gökçe🌱| eckoger.lens (🌸,🌿) (@eckoger){' '}
                <a href="https://twitter.com/eckoger/status/1685658517296824320?ref_src=twsrc%5Etfw">July 30, 2023</a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  Hey <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a> are you ready for
                  city of cats? <a href="https://t.co/Qjqa8bKWsB">pic.twitter.com/Qjqa8bKWsB</a>
                </p>
                &mdash; 0xDogan.eth (@DoganEth){' '}
                <a href="https://twitter.com/DoganEth/status/1685412911429148672?ref_src=twsrc%5Etfw">July 29, 2023</a>
              </blockquote>
              {/* <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  - N e v e r - leave İstanbul without taking bosphorus boat tour 🚢🌊✨
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  <a href="https://t.co/B4PCzw6sMJ">pic.twitter.com/B4PCzw6sMJ</a>
                </p>
                &mdash; Buse Kaya (@bbusekay){' '}
                <a href="https://twitter.com/bbusekay/status/1685730350683590657?ref_src=twsrc%5Etfw">July 30, 2023</a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  The Maltepe Orhanzgazi City Park, Fill Area Maltepe, and Maltepe Beach Parks are nice to run around.
                  <br />
                  <br />
                  It&#39;s well maintained, quiet, and peaceful with nice views{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/h8e68EhIpZ">pic.twitter.com/h8e68EhIpZ</a>
                </p>
                &mdash; braqzen (@braqzen){' '}
                <a href="https://twitter.com/braqzen/status/1686040982523940864?ref_src=twsrc%5Etfw">July 31, 2023</a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  👀 Here are just a few of the wonderful places in this enchanting city of Istanbul🪄that I can show
                  you 🤩📸
                  <br />
                  <br />
                  As a member of the <a href="https://twitter.com/ITUblockchain?ref_src=twsrc%5Etfw">
                    @ITUblockchain
                  </a>{' '}
                  family, looking forward to be host you all in{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  🤭💜✨<a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/E20lR9gMzz">pic.twitter.com/E20lR9gMzz</a>
                </p>
                &mdash; beril (@0xberil_){' '}
                <a href="https://twitter.com/0xberil_/status/1685627443384639488?ref_src=twsrc%5Etfw">July 30, 2023</a>
              </blockquote>
              <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  I suggest all the fellas who is coming to Istanbul for{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a> to get los in the C I
                  H A N G I R streets✨✨
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  <a href="https://t.co/oczbVDvhQa">pic.twitter.com/oczbVDvhQa</a>
                </p>
                &mdash; avicado 🪄 (@avicadointech){' '}
                <a href="https://twitter.com/avicadointech/status/1686020838284308482?ref_src=twsrc%5Etfw">
                  July 31, 2023
                </a>
              </blockquote> */}
              {/* <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="und" dir="ltr">
                  ..
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/P9FV0OxiO7">https://t.co/P9FV0OxiO7</a>{' '}
                  <a href="https://t.co/SuX7xLlFRL">pic.twitter.com/SuX7xLlFRL</a>
                </p>
                &mdash; Artstein (@Artsteiin){' '}
                <a href="https://twitter.com/Artsteiin/status/1685709292995821569?ref_src=twsrc%5Etfw">July 30, 2023</a>
              </blockquote> */}
              {/* <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="en" dir="ltr">
                  Discover the vibrant heart of Istanbul in this mesmerizing video challenge!🌅 <br />
                  <br />
                  Join the{' '}
                  <a href="https://twitter.com/hashtag/DevconnectIST?src=hash&amp;ref_src=twsrc%5Etfw">
                    #DevconnectIST
                  </a>{' '}
                  video challenge and capture the city&#39;s magic yourself!🤗
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a>{' '}
                  <a href="https://t.co/qmpui0aNR8">https://t.co/qmpui0aNR8</a>{' '}
                  <a href="https://t.co/tQZ4kqYtRL">pic.twitter.com/tQZ4kqYtRL</a>
                </p>
                &mdash; ITU Blockchain (@ITUblockchain){' '}
                <a href="https://twitter.com/ITUblockchain/status/1685592269892509696?ref_src=twsrc%5Etfw">
                  July 30, 2023
                </a>
              </blockquote> */}
              {/* <blockquote className="twitter-tweet" data-dnt="true">
                <p lang="tr" dir="ltr">
                  <a href="https://twitter.com/EFDevconnect?ref_src=twsrc%5Etfw">@EFDevconnect</a> in İstanbul⚘{' '}
                  <a href="https://t.co/2wwByk65Ny">pic.twitter.com/2wwByk65Ny</a>
                </p>
                &mdash; karababa.eth🦇🔊 (@BabaBlack_){' '}
                <a href="https://twitter.com/BabaBlack_/status/1684582970957635587?ref_src=twsrc%5Etfw">
                  July 27, 2023
                </a>
              </blockquote> */}
            </div>
          </SwipeToScroll>

          <p className="big-text margin-top-less">
            Istanbul&#39;s magic lies in the narrow lanes of its bazaars, the calls to prayer, the cats strolling
            around, the rhythms of Turkish music, and, of course, the delicious food. Istanbul is considered a
            cat&apos;s heaven - locals take good care of their strays, giving them food and shelter -, and a
            foodie&apos;s paradise - Turkish cuisine is meat-heavy, but vegetables play a significant role as well, and
            for the foodies amongst you,{' '}
            <Link indicateExternal href="https://twitter.com/kaanuzdogan/status/1684913443759968256?s=20">
              here is a restaurant guide
            </Link>{' '}
            put together by a local community member. There is also{' '}
            <Link indicateExternal href="https://www.instagram.com/thegoodday_istanbul">
              this lovely Instagram account
            </Link>{' '}
            for inspiration about Istanbul&apos;s city, culture, local shops, and nature.
          </p>

          <Link
            className="button orange margin-top-less margin-right-less"
            href="https://kaanuzdogan.com/kaans-foodie-guide-during-devconnect-istanbul"
          >
            <PinIcon />
            Restaurant Guide
          </Link>
          <Link
            className="button orange margin-top-less"
            href="https://www.google.com/maps/d/edit?mid=1eX7T0uqj9dfXHBFcw2mH9qXGfQtdr0A&usp=sharing"
          >
            <PinIcon />
            Food Map
          </Link>
        </div>
      )
    },
  },
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

          <p className="large-text">
            The Bosporus Strait divides Istanbul&apos;s neighborhoods into two sides: the European side and the Asian
            side. The Devconnect Cowork venue and probably most Devconnect venues will be located on the European side.
            We recommend staying around the green metro line. <b>Here are the neighborhoods we recommend staying in:</b>
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
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Üsküdar</div>
              is a good and affordable alternative on the Asian side, very local with few tourists. The frequent ferries
              allow easy access to the European side with a 10-minute ride to Beşiktaş and a ~40 minutes metro
              connection under the sea to the historical peninsula. Ferries are operating until late.{' '}
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">The Historic Peninsula</div>
              <p>
                {' '}
                The touristic center, including the neighborhood <b>Sultanahmet</b> with many famous landmarks like the
                Blue Mosque, Hagia Sophia, Topkapi Palace, and the Grand Bazaar, all within walking distance of each
                other. Check out{' '}
                <Link href="https://istanbulclues.com/istanbul-historic-peninsula/" indicateExternal>
                  this resource
                </Link>{' '}
                for a map and more details.
              </p>
            </div>
            <div className={css['area']}>
              <div className="large-text orange margin-bottom-much-less bold">Moda in Kadıköy (far, but nice)</div>
              <b>Moda in Kadıköy</b> is one of the most beautiful, hip, and modern districts. It has a lovely coast,
              many good restaurants, cafes and bars. The district attracts most students and upper-middle-class young
              adults. However, Kadıköy is far from the venue, requiring a ~1-hour ride with public transport. It might
              be a good place to stay for a local experience outside Devconnect week.
            </div>
          </div>

          {/* <h3 id="far-but-nice" className="margin-top-less">
            Far but nice:
          </h3>
          <p>
            <b>Moda in Kadıköy</b> is one of the most beautiful, hip, and modern districts. It has a lovely coast, many
            good restaurants, cafes and bars. The district attracts most students and upper-middle-class young adults.
            However, Kadıköy is far from the venue, requiring a ~1-hour ride with public transport. It might be a good
            place to stay for a local experience outside Devconnect week.{' '}
          </p> */}
          <p className="big-text margin-top">
            <b>More information about all neighborhoods:</b>
          </p>
          <Link
            className="large-text"
            href="https://propertyexperts-tr.com/en/Blog/districts-of-istanbul"
            indicateExternal
          >
            Districts of Istanbul
          </Link>
          <br />
          <Link
            className="large-text"
            href="https://exploretraveloasis.com/the-coolest-neighbourhoods-in-istanbul/"
            indicateExternal
          >
            The coolest neighbourhoods in Istanbul
          </Link>
          <br />
          <Link
            className="large-text"
            href="https://www.isthomes.com/news/best-5-areas-to-live-on-the-asian-side-of-istanbul"
            indicateExternal
          >
            Best 5 areas to live on the asian side of Istanbul
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
        <div className={`tab-content ${css['history-and-culture']}`}>
          <p className="large-text">
            Istanbul lies in a geographically unique spot, being the only city that covers two continents - Europe and
            Asia. Istanbul is not only a fusion of continents, it&apos;s also a unique blend of cultures. Ancient
            histories intertwine with the modern world, and many civilizations have left their imprints over the
            millennia.{' '}
          </p>
          <p className="big-text">
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
          <p className="big-text">
            If you want to delve deeper into understanding Istanbul&apos;s culture, you can get started with some of the
            following movie and book recommendations from a local.{' '}
          </p>

          <p className="bold">Books</p>

          <SwipeToScroll>
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

          <SwipeToScroll>
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

          <SwipeToScroll>
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
    text: 'Arrival',
    value: 'arriving-in-the-city',
    content: () => {
      return (
        <div className="tab-content">
          <p>
            <b>Currency</b>: Turkish Lira{' '}
          </p>
          <p>
            <b>Credit Card:</b> Widely used in Istanbul, you don&apos;t need much cash.{' '}
          </p>
          <p>
            <b>Best exchange:</b> We recommend avoiding exchanges at the airport for their poor rates. There are lots of
            change offices in every district.
          </p>
          <p>
            <b>E-SIM providers</b>: Holafly or Airalo{' '}
          </p>
          <p>
            <b>SIM cards with best 4G coverage:</b> Turkcell or Türk Telekom. We recommend buying physical SIM cards in
            a local shop, not at the airport.
          </p>
          <p>
            <b>Tipping culture</b>: 5-10% or rounding up
          </p>
          <p>
            <b>Tap Water</b>: <b>NOT</b> safe to drink. Bottled water is easy to find.
          </p>
          <p>
            🚨 <b>Emergency number: 112</b>
          </p>
        </div>
      )
    },
  },
  {
    text: 'Getting Around',
    value: 'getting-around',
    content: () => {
      return (
        <div className="tab-content">
          <p>
            Public transport in Istanbul is extensive and well-developed, making it easy to move around the city. It is
            way better to use public transport than a car, due to heavy traffic, and difficulty finding parking.
            Especially during <b>rush hours between 5:00-6:30 PM</b>, it will be basically impossible to find a taxi.{' '}
          </p>
          <h3 id="use-one-of-the-many-public-transportation-options-">
            Use one of the many public transportation options:
          </h3>
          <p>
            <b>Metro</b>: The fastest way to get around, with several lines connecting different parts of the city. Look
            for the red, blue, and white M signs to find a metro station.
          </p>
          <p>
            <b>Metrobus:</b> Segregated express bus line on the Main D100 highway. Goes from the Asian side of the city
            all the way to the end of Europe, and crosses the bridge.
          </p>
          <p>
            <b>Tram</b>: Trams cover many popular areas, yet there are only three lines.
          </p>
          <p>
            <b>Bus</b>: Most widely used form of public transport in Istanbul, with around 500 lines and 8,000 stops.
          </p>
          <p>
            <b>Ferry (Vapur)</b>: There&apos;s lots of public ferries crossing the Bosphorus between the European and
            Asian sides.{' '}
            <Link
              indicateExternal
              // href="https://file.notion.so/f/s/4017bdb4-e7b2-4bb8-9c30-90a7cf4c27dc/Sefer-Haritasi-Line-Map-2022.pdf?id=2d225240-dc8a-4cbe-96ed-5206edd1b887&table=block&spaceId=29b26582-476c-4221-baee-adf2ad16f913&expirationTimestamp=1691599673061&signature=YAYiT4YQRW9xLbOoQbG95-Q57zK-fEj0DwIo3ioRqYI&downloadName=Sefer-Haritasi-Line-Map-2022.pdf"
              href="/files/ferry-map.pdf"
            >
              Here is a Map with all lines
            </Link>
            , but the most used ones are Kadikoy and Uskudar on the Asian side, and the two-sided ferries from Besiktas,
            Kabatas, and Karakoy.
          </p>

          <p>
            <b>Dolmuş (shared taxis)</b>: These minibuses are more affordable than taxis, you just hop on and pay cash
            in the vehicle.{' '}
          </p>
          <p>
            <b>Marmaray:</b> The rail connection between European and Asian Istanbul via a tunnel beneath the Bosphorus.
          </p>
          <p>
            <b>Bosphorus taxis</b>: You can easily transfer from Bebek to Nisantası, Taksim, and other areas close to
            Bosphorus.
          </p>

          <p>
            👉 To use all public transportation in Istanbul you will need the <b>Istanbulkart</b>. You can simply get
            the card and top it up at kiosks near metro stations, piers, and bus stations. 💵 Approximate costs: 9.90 TL
            ($0.4) each way
          </p>
          {/* <p>
            🦄 Cowork attendees also have the option to pre-order a discounted metro card when they purchase their
            Cowork ticket. Metro cards will then be available for pickup at registration and pre-registration for those
            who selected them.{' '}
          </p> */}
          <h2 id="transportation-apps">Transportation apps</h2>
          <p>
            <b>İstanbulkart</b>: Official transport app. A Turkish mobile number might be needed (you can get one with a
            physical SIM and with some e-SIMs). You can also just get the physical İstanbulkart at kiosks close to the
            stations.
          </p>
          <p>
            <b>Uber:</b> It is used to call verified official yellow taxis, not personal drivers.{' '}
          </p>
          <p>
            <b>BiTaksi:</b> Uber-like app, locally-made.
          </p>
          <p>
            <Link indicateExternal href="https://www.marti.tech/">
              Marti
            </Link>{' '}
            and{' '}
            <Link indicateExternal href="https://fenix.life/index-tr.html">
              Fenix
            </Link>
            : Shared scooter apps are widely used. Marti has the “MartiTag” mode that works like Uber.
          </p>
          <p>
            <Link indicateExternal href="https://www.isbike.istanbul/">
              <b>isbike</b>
            </Link>
            : City bikes by the municipality. However, the city is not very bikeable. There are some good bikeable zones
            at the coast, you can see them on the isbike map.
          </p>
          <p>
            <b>Moovit:</b> Route planning and real-time information on public transport.
          </p>
          <p>
            <b>Google Maps:</b> Works OK, yet, bus times might not be accurate.
          </p>
          <h2 id="from-the-airport-to-the-city">From the Airport to the City</h2>
          <p>
            We recommend using public transport because taxis are not easy to find. If you want to use the yellow taxis,
            you should use Uber or BiTaksi to ensure you can get the best, fair rate.
          </p>
          <p>These are the transportation services offering transit between the airport and the city center:</p>
          <p>
            <b>Havabus</b>: Official airport shuttle service operating between Istanbul Sabiha Gökçen Airport (SAW) and
            Taksim, Kadikoy, and Yenisahra.{' '}
          </p>
          <p>
            <b>Havaist</b>: Official airport shuttle service between the Istanbul Airport (IST) and many destinations in
            the city.{' '}
          </p>
          <p>
            <b>IETT</b> (İstanbul Elektrik Tramvay ve Tünel İşletmeleri): IETT is a general public transportation
            provider that operates bus routes.
          </p>
          <p>
            <b>Metro</b>: M4 metro line at the Sabiha Gökçen airport, and M11 at Istanbul Airport (does not reach the M2
            line yet but ends at Kağıthane).{' '}
          </p>
          <p>
            <b>Resources and more information:</b>
          </p>
          <p>
            <Link indicateExternal href="https://istanbul-tourist-information.com/en/public-transport-in-istanbul/">
              https://istanbul-tourist-information.com/en/public-transport-in-istanbul
            </Link>
          </p>
          <p>
            <Link indicateExternal href="https://www.chasingthedonkey.com/getting-around-istanbul-transport/">
              https://www.chasingthedonkey.com/getting-around-istanbul-transport
            </Link>
          </p>
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
            <b>Negotiate on markets</b>
          </p>
          <ul>
            <li>
              Always bargain at bazaars, like the Grand Bazar or Spice Market. There&apos;s always room for some
              discount. These guys are sales experts!
            </li>
          </ul>
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
          <ul>
            <li>
              Yes they do, even though their English may not be very fluent. Shopkeepers are very helpful in every
              matter, and you can feel comfortable asking them questions. :)
            </li>
          </ul>
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
          </p>
        </div>
      )
    },
  },
] as any

export const Tabs = (props: any) => {
  const linkAttributes = useDraggableLink()

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
          className={`${css['right']} orange uppercase tiny-text hover-underline`}
        >
          Current time
        </Link>
      </div>
      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Visa className={`${css['icon']} icon`} />
          <p>
            <b>Visa:</b> tourist visa (30/90 days) & e-visa
          </p>
        </div>
        <AnchorLink
          href={`#plan-your-travels`}
          className={`${css['right']} orange uppercase tiny-text hover-underline generic`}
          onClick={(e: any) => {
            if (props.accordionRefs.current['plan-your-travels']) {
              props.accordionRefs.current['plan-your-travels'].open()
            }
          }}
        >
          Requirements
        </AnchorLink>
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
          className={`${css['right']} orange uppercase tiny-text hover-underline`}
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

      <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          {/* <Visa className={`${css['icon']} icon`} /> */}
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
      </div>

      {/* <div className={css['row']}>
        <div className={`${css['left']} uppercase`}>
          <Water className={`${css['icon']} icon`} />
          <p className="bold">WATER: &nbsp;</p>
          <p>Medium safe to drink</p>
        </div>
        <AnchorLink
          href={`#faq`}
          className={`${css['right']} orange uppercase tiny-text hover-underline generic`}
          onClick={(e: any) => {
            if (props.accordionRefs.current.faq) {
              props.accordionRefs.current.faq.open()
            }
          }}
        >
          FAQ
        </AnchorLink>
      </div> */}
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

          {/* <div className={css['items']}>
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
          </div> */}
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
                {/* <p className="big-text">
                  Our destination for Devconnect 2023 is Istanbul - A city that is home to many cultures and bridges two
                  continents, Europe and Asia.
                </p>
                <br />
                <p className="big-text">
                  It&apos;s a popular destination for visitors because it&apos;s easy to reach via its major
                  international airport (IST), it&apos;s very affordable to live, public transport is efficient and
                  cheap, hospitality is genuine, and there&apos;s a lot to explore: bazaars, spices, kebaps, baklava,
                  the Bosporus strait, and the city&apos;s rich culture and heritage.
                </p>
                <br />
                <p>
                  This guide aims to prepare you for the best Devconnect experience in Istanbul, providing you with
                  resources and covering more than just the basics.
                </p> */}
                {/* <br />

                <div className={css['call-to-action']}>
                  <Link
                    href="https://www.google.com/maps/d/embed?mid=143AuN51prJpx6M62b9xMTAwdXNm-dstJ&hl=en&ehbc=2E312F"
                    indicateExternal
                    className={`button sm orange-fill`}
                  >
                    Venues Map
                  </Link>

                  <Link
                    href="https://amsterdamblockchainweek.org/"
                    indicateExternal
                    className={`button sm orange-fill`}
                  >
                    AMS Blockchain Week
                  </Link>
                </div> */}
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
              Getting to Istanbul
            </p>
            <div>{tabs[1].content()}</div>

            <p className="section-header orange margin-top-less margin-bottom-much-less" id="experience-the-city">
              Experience The City
            </p>

            <div>{mounted && tabs[2].content()}</div>

            {/* <p className="section-header orange margin-top-less">Before Devconnect</p> */}
            <Accordion>
              {tabs.slice(3).map((tab: any) => {
                const tabContent = tab

                return (
                  <AccordionItem
                    key={tab.value}
                    // title={tab.text}
                    // alwaysOpen={tab.alwaysOpen}
                    title={<p className="uppercase orange large-text bold">{tab.text}</p>}
                    id={tab.value}
                    ref={el => (accordionRefs.current[tab.value] = el)}
                  >
                    {tabContent.content && tabContent.content()}
                  </AccordionItem>
                )
              })}
            </Accordion>
            {/* 
            <div
              className="margin-bottom-less margin-top-less"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', maxWidth: '700px' }}
            >
              <div className="aspect">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/BzMYQIo-0NA"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div> */}

            {/* <p className="section-header orange margin-top-less">During Devconnect</p> */}
            {/* <Accordion>
              {tabs.slice(5).map((tab, index) => {
                const tabContent = tab

                return (
                  <AccordionItem
                    key={tab.value}
                    // title={tab.text}
                    title={<p className="uppercase large-text orange bold">{tab.text}</p>}
                    id={tab.value}
                    ref={el => (accordionRefs.current[tab.value] = el)}
                  >
                    {tabContent.content && tabContent.content()}
                  </AccordionItem>
                )
              })}
            </Accordion> */}
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
