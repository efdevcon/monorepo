import type { NextPage } from 'next'
import Image from 'next/legacy/image'
import ImageNew from 'next/image'
import css from './index.module.scss'
import dynamic from 'next/dynamic'
import React from 'react'
import HeaderLogo from 'assets/images/header-logo.svg'
import Logo from 'assets/images/logo-ist.svg'
import LogoBig from 'assets/images/logo-big.svg'
import DevconnectIstanbulText from 'assets/images/istanbul-logo-text.svg'
import DevconnectIstanbul from 'assets/images/istanbul-logo-with-eth.svg'
import RoadToDevcon from 'assets/images/rtd.png'
import CubeImages from 'assets/images/cube-images-ist.png'
import { SEO } from 'common/components/SEO'
import { Menu, FooterMenu } from 'common/components/layout/Menu'
import Link from 'common/components/link/Link'
import Accordion, { AccordionItem } from 'common/components/accordion'
import Modal from 'common/components/modal'
// import bgMerged from 'assets/images/istanbul-bg/bg-merged.png'
import bgMerged from 'assets/images/landscape.png'
import Hehe from 'assets/images/hehe.png'
import Observer from 'common/components/observer'
import ErrorBoundary from 'common/components/error-boundary/ErrorBoundary'
// @ts-ignore
import Spline from '@splinetool/react-spline'
import FooterBackground from 'assets/images/footer-background-triangles.png'
import PlayIcon from 'assets/icons/play.svg'
import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'
import { BlogReel } from 'common/components/blog-posts/BlogPosts'
import CalendarIcon from 'assets/icons/calendar-date.svg'
import ShapesImage from 'assets/images/shapes.png'
import useDimensions from 'react-cool-dimensions'
import PastEventCard from 'lib/components/cards/past-event'
import moment from 'moment'
import { leftPadNumber } from 'lib/utils'
import istanbulScheduleBackground from 'assets/images/istanbul-sched.png'
import amsterdamScheduleBackground from 'assets/images/amsterdam-sched.png'
import InfiniteScroller from 'lib/components/infinite-scroll'
import Cover1 from 'assets/images/ist-video-archive/LightClient_Cover.webp'
import Cover2 from 'assets/images/ist-video-archive/wallet_unconference_cover.webp'
import Cover3 from 'assets/images/ist-video-archive/conflux_banner.webp'
import Cover4 from 'assets/images/ist-video-archive/PROGCRYPTO_Cover.webp'
import Cover5 from 'assets/images/ist-video-archive/solidity-submit-cover.webp'
import Cover6 from 'assets/images/ist-video-archive/AWA_cover.webp'
import Cover7 from 'assets/images/ist-video-archive/ethconomics_cover.webp'
import Cover8 from 'assets/images/ist-video-archive/EVM_summit_cover.webp'
import Cover9 from 'assets/images/ist-video-archive/ETHGunu_cover.webp'
import Cover10 from 'assets/images/ist-video-archive/staking_cover.webp'
import Cover11 from 'assets/images/ist-video-archive/secureum_banner.webp'
import Cover12 from 'assets/images/ist-video-archive/EPF_Cover.webp'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import { client } from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import { TinaMarkdown } from 'tinacms/dist/rich-text'
import { PagesQuery } from '../../tina/__generated__/types'
import { motion } from 'framer-motion'

// import Cowork1 from 'assets/images/event-pictures/amsterdam-2022-event-picture-2.jpg'
// import Cowork2 from 'assets/images/event-pictures/amsterdam-2022-event-picture-6.jpg'
// import Cowork3 from 'assets/images/event-pictures/amsterdam-2022-event-picture-1.jpg'
// import Cowork4 from 'assets/images/event-pictures/amsterdam-2022-event-picture-5.jpg'
// import Cowork5 from 'assets/images/event-pictures/amsterdam-2022-event-picture-3.jpg'

import Cowork1 from 'assets/images/cowork-recap/cowork-1.jpg'
import Cowork2 from 'assets/images/cowork-recap/cowork-2.jpg'
import Cowork3 from 'assets/images/cowork-recap/cowork-3.jpg'
import Cowork4 from 'assets/images/cowork-recap/cowork-4.jpg'
import Cowork5 from 'assets/images/cowork-recap/cowork-5.jpg'
import Cowork6 from 'assets/images/cowork-recap/cowork-6.jpg'
import Cowork7 from 'assets/images/cowork-recap/cowork-7.jpg'
import Cowork8 from 'assets/images/cowork-recap/cowork-8.jpg'

// const Cube = dynamic(() => import('common/components/cube'), {
//   ssr: false,
// })

function getTimeUntilNovember13InTurkey() {
  // Create a Date object for the current date
  const currentDate = moment.utc()

  // Set the target date to November 13th, 8 am
  const targetDate = moment.utc([2023, 10, 13, 8]) // Note: Month is 0-based, so 10 represents November.

  // Calculate the time difference in milliseconds
  const timeDifference = targetDate.diff(currentDate) - 1000 * 60 * 60 * 3 // add 3 hours for turkey time (UTC+3)

  // Calculate days, hours, minutes, and seconds
  const days = Math.max(Math.floor(timeDifference / (1000 * 60 * 60 * 24)), 0)
  const hours = Math.max(Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0)
  const minutes = Math.max(Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)), 0)
  const seconds = Math.max(Math.floor((timeDifference % (1000 * 60)) / 1000), 0)

  if (timeDifference < 0) {
    const dayOne = moment.utc([2023, 10, 13])
    const timeDiff = currentDate.diff(dayOne, 'days')

    return `DAY ${leftPadNumber(timeDiff + 1)}`
  }

  // Return the time difference as an object
  return {
    days,
    hours,
    minutes,
    seconds,
  }
}

// Exporting to cowork page
export const FAQDuringEvent = [
  {
    text: 'Where do I hear about all updates during Devconnect week? 📣',
    value: 'updates',
    content: () => {
      return (
        <>
          <p>The Devconnect Community Hub on Telegram will be the main place for updates for attendees.</p>
          <p>
            You can{' '}
            <Link href="https://t.me/zucat_bot?start=auth" indicateExternal>
              join the Community Hub here
            </Link>
            , after you claimed your ZK ticket for the Cowork or another ZK-ticketed Devconnect event. You find
            instructions on how to join the chat in the email dispatched to you (search for the subject line “Devconnect
            Cowork your order.”).
          </p>
          <p>
            We'll also continue to share updates and what's happening{' '}
            <Link href="https://twitter.com/EFDevconnect" indicateExternal>
              on Twitter!
            </Link>
          </p>
        </>
      )
    },
  },
  {
    text: 'Where can I connect with other attendees?',
    value: 'connect-with-attendees',
    content: () => {
      return (
        <>
          <p>
            The{' '}
            <Link href="https://t.me/zucat_bot?start=auth" indicateExternal>
              Telegram Community Hub
            </Link>{' '}
            is a great resource for coordinating with others to attend events together. You need to ZK proof that you
            have a ZK ticket for the Cowork or another ZKticketed Devconnect event to join.
          </p>
          <p>
            You find instructions on how to join the chat in the email dispatched to you (search for the subject line
            “Devconnect Cowork your order.”)
          </p>{' '}
        </>
      )
    },
  },
  {
    text: 'Is there online streaming?',
    value: 'online-streaming',
    content: () => {
      return (
        <>
          Yes! You can watch the{' '}
          <Link href="https://app.streameth.org/" indicateExternal>
            live streams and recordings here
          </Link>
          . Live-streaming of workshops and talks increases the inclusivity for community members around the world for
          those who aren&apos;t able to attend. With the help of Streameth we are live-streaming multiple Devconnect
          events, happening at the ICC venue.
        </>
      )
    },
  },
  {
    text: 'Where do I get my Devconnect Turkish towel?',
    value: 'where-towel',
    content: () => {
      return (
        <>
          You have the opportunity to purchase it together with the <Link href="#ticketing">Cowork ticket</Link>, and
          they will be ready for you to collect at the Cowork registration.
        </>
      )
    },
  },
  {
    text: 'Is there any agenda and program in the Cowork?',
    value: 'cowork-agenda',
    content: () => {
      return (
        <>
          While there's no planned agenda in the Cowork, we have "Discussion Corners" where public dialogue about
          Ethereum-related, non-commercial, educational topics will happen. They are open to everyone, and you can{' '}
          <Link
            href="https://efevents.notion.site/Devconnect-Cowork-Rooms-Booking-Guidelinesd0730ca40be040f6994bb63ecfe4cd56"
            indicateExternal
          >
            book and suggest your topic in advance here
          </Link>
          .
        </>
      )
    },
  },
  {
    text: 'How can I book a private meeting room?',
    value: 'private-meeting-room',
    content: () => {
      return (
        <>
          Meeting rooms are for short (30min to 120min max) and private meetings, in a dedicated (B3) floor. They can be{' '}
          <Link
            href="https://ef-events.notion.site/Devconnect-Cowork-Rooms-BookingGuidelines-d0730ca40be040f6994bb63ecfe4cd56"
            indicateExternal
          >
            booked up to 24 hours in advance here
          </Link>
          .
        </>
      )
    },
  },
  {
    text: 'Where do I find side events and parties? 🥳',
    value: 'side-events-parties',
    content: () => {
      return (
        <div className="tab-content">
          <p>Several community-run side event schedules are making the rounds. For example:</p>
          <ul>
            <li>
              <Link href="https://cryptoevents.xyz/DevconnectWeek" indicateExternal>
                https://cryptoevents.xyz/DevconnectWeek
              </Link>
            </li>
            <li>
              <Link href="https://istanbul.gm.events/" indicateExternal>
                https://istanbul.gm.events/
              </Link>
            </li>
            <li>
              <Link
                href="https://docs.google.com/spreadsheets/d/1tPe8Qr-DQOvkhwuZ0bLwH17RRrcuRS5ukaZhmkGxOA/edit#gid=0"
                indicateExternal
              >
                https://docs.google.com/spreadsheets/d/1tPe8Qr-DQOvkhwuZ0bLwH17RRrcuRS5ukaZhmkGxOA/edit#gid=0
              </Link>
            </li>
            <li>
              <Link href="https://www.web3event.org/topic/5#Topic" indicateExternal>
                https://www.web3event.org/topic/5#Topic
              </Link>
            </li>
          </ul>
        </div>
      )
    },
  },
  {
    text: 'Media inquiries?',
    value: 'media-inquiries',
    content: () => {
      return <>Please note, we don't share media lists and are not looking for partnerships.</>
    },
  },
  {
    text: 'What do I need to know about safety? ⛑️',
    value: 'safety-need-to-know',
    content: () => {
      return (
        <>
          <p>
            Your safety is our utmost priority now. We are actively monitoring the situation, working closely with local
            security providers, law enforcement, and external risk advisory partners to understand and anticipate risks
            to Devconnect. We've reviewed our security arrangements and crisis response plans to ensure they're
            appropriate. Read our{' '}
            <Link href="https://devconnect.org/city-guide" indicateExternal>
              safety advisories in the city guide
            </Link>{' '}
            and for updates, keep an eye on our public channels on Telegram and Twitter/X. Please also be aware of the
            recent{' '}
            <Link href="https://www.gov.il/en/Departments/news/spoke-nsc171023" indicateExternal>
              warning issued by the Israeli government for Israelis
            </Link>{' '}
            in the country to leave Turkey immediately.
          </p>
        </>
      )
    },
  },
  {
    text: 'Do you have promotion codes for mobile data?',
    value: 'mobile-data-promo',
    content: () => {
      return (
        <>
          <p>We do!</p>
          <ul>
            <li>
              <Link
                href="https://www.notion.so/Devconnect-IST-All-you-need-to-knowcc6c61b433b244eda592e0c99a9984c2?pvs=21"
                indicateExternal
              >
                Airalo
              </Link>{' '}
              offers a discount for all Devconnect Cowork attendees to receive 20% off their chosen data package with
              the code “DEVCONNECT” up until 30th November, 2023.
            </li>
            <li>
              The local provider{' '}
              <Link
                href="https://www.notion.so/Devconnect-IST-Allyou-need-to-know-cc6c61b433b244eda592e0c99a9984c2?pvs=21"
                indicateExternal
              >
                Roamless
              </Link>{' '}
              offers you 2GB for free and another $5 free credit if you add $20 or more to your Roamless wallet. Use the
              code "DEVCONNECT".
            </li>
          </ul>
        </>
      )
    },
  },
  {
    text: 'Welcome Booths at the airport',
    value: 'welcome-booths',
    content: () => {
      return (
        <>
          We have set up 'Welcome booths' at the airport to help you find your way to your hotel. They will be available
          during the weekend prior to Devconnect (from Friday to Monday, ~8AM to 11:59PM).
        </>
      )
    },
  },
  {
    text: 'Accessibility info',
    value: 'accessibility',
    content: () => {
      return (
        <>
          We have an elevator available. Just let our staff and volunteers at the registration know, and they're happy
          to help you.
        </>
      )
    },
  },
  {
    text: `Respecting attendee's privacy - "No photo"-stickers`,
    value: 'attendee-privacy',
    content: () => {
      return (
        <>
          <p>
            Before taking photos and videos in the Cowork and other Devconnect events, please ensure you have checked if
            anyone is wearing a "no photo" sticker. People who wear these stickers are expressing that they don't want
            to be captured in photos and videos. We have a privacy-conscious community, and it is imperative that we
            respect each other's space and identity. Taking or posting pictures without consent can be intrusive and
            disrespectful.
          </p>
          <p>
            If you wish not to be photographed, you're welcome to get a "no-photo" sticker at the registration and wear
            it visible on your clothes, so others know you don't consent that photos of you are taken and posted.
          </p>
        </>
      )
    },
  },
  {
    text: 'Food around the Cowork',
    value: 'food-around-cowork',
    content: () => {
      return (
        <>
          We have snacks all around the clock in the Cowork, however no lunch or dinner will be served.{' '}
          <Link href="https://maps.app.goo.gl/Z6rRrdYdwLcT6TPx7" indicateExternal>
            For food around the ICC, check this list.
          </Link>
        </>
      )
    },
  },
  {
    text: 'Local Payments',
    value: 'local-payments',
    content: () => {
      return (
        <>
          <ul>
            <li>
              You can use credit or debit cards at the vast majority of establishments, as well as digital payment
              methods like Apple Pay. Most people rarely carry cash and seldom find the need to use it.
            </li>
            <li>
              However, we do recommend keeping a small amount on hand for specific situations—such as taking a
              late-night cab, in case the point-of-sale system is down or not available.
            </li>
            <li>
              When it comes to currency exchange, most local services offer competitive rates with zero commission fees.
              The only exception would be if you're trading in a less common currency pair, typically found at specialty
              shops like the Grand Bazaar.
            </li>
            <li>
              ATMs are generally secure; just be cautious if you're considering using one at the airport. Their fees can
              be steep.
            </li>
            <li>
              The banking infrastructure here is notably efficient and secure. Payment channels are reliably available,
              with rare instances of downtime. However, be aware that American Express isn't as widely accepted; you'll
              be better off carrying a Visa or Mastercard.
            </li>
            <li>
              Crypto payments for goods and services are illegal in Turkey. It is legal to own crypto and trade crypto,
              but keep in mind to avoid using it for payments.
            </li>
          </ul>
        </>
      )
    },
  },
  {
    text: 'Reporting Emergency Incidents',
    value: 'reporting-emergencies',
    content: () => {
      return (
        <>
          <p>
            In the event of an emergency incident, we have established reporting procedures to ensure your safety, while
            also emphasizing the importance of adhering to our <Link href="/code-of-conduct">Code of Conduct</Link>,
            which outlines expected behavior within our community.{' '}
          </p>
          <ul>
            <li>
              <b>Medical Emergencies:</b> If you encounter a medical emergency, please call +90 537 797 04 28
              immediately {/* or proceed to the medical room located at XXX in the Cowork venue. */}
            </li>
            <li>
              <b>Physical Violence Incidents in the Cowork Venue:</b> In the case of physical violence incidents within
              the Cowork venue, please promptly contact our security team and call our emergency number +90 537 797 04
              28.
            </li>
            <li>
              <b> Harassment Incidents:</b> If you experience harassment incidents, you have three options: Call our
              emergency number: +90 537 797 04 28 Fill out{' '}
              <Link href="https://forms.gle/VpDbaJK18HYitJgq9" indicateExternal>
                this form
              </Link>
              .
            </li>
          </ul>
          <p>Additionally, it is advisable to keep the following local authorities' contact numbers in mind:</p>

          <ul>
            <li>
              <b>Emergency:</b> 112
            </li>
            <li>
              <b>Fire Department:</b> 110
            </li>
            <li>
              <b>Police:</b> 155
            </li>
          </ul>
        </>
      )
    },
  },
]

// TODO: Add missing links
const FAQ = [
  {
    text: 'What is the difference between Devcon and Devconnect?',
    value: 'prove-attendance',
    content: () => {
      return (
        <>
          <p>
            Devcon and Devconnect are the only two events organized by the Ethereum Foundation (yes, all the other
            amazing ETH events are community-run!). Both events are Ethereum-focused but serve different purposes.
          </p>
          <p>
            <b>Devcon</b> is a global Ethereum family reunion, a place to celebrate success and align on updates and
            direction. It is our principal event, all in one place with one big venue, and talks and workshops open to
            all.{' '}
            <Link href="https://devcon.org" indicateExternal>
              Devcon SEA will take place in Bangkok, Thailand between 12-15 November 2024!
            </Link>
          </p>
          <p>
            <b>Devconnect</b> on the other hand, is a week to make progress, dive deep into specific topics among fellow
            experts, to co-work and collaborate. It is structurally entirely different from Devcon, and consists of many
            individual events, organized by you the community, that each cover one topic in depth.
          </p>
        </>
      )
    },
  },
  {
    text: 'Can I get a proof that I attended Devconnect? aka What is Zupass?',
    value: 'prove-attendance',
    content: () => {
      return (
        <>
          <p>
            Your{' '}
            <Link href="https://zupass.org/#/login" indicateExternal>
              Zupass
            </Link>{' '}
            ticket proofs that you joined the Devconnect Cowork! This year, the Devconnect Cowork, ZuConnect, and 8
            other Devconnect events were using Zupass to issue tickets. Zupass allows you to make ZK proofs of your
            event attendance. It's a tool built by open-source devs from the Devconnect and Zuzalu communities. If you
            want to learn more, you can listen to the{' '}
            <Link href="https://x.com/EFDevconnect/status/1722152791139914127?s=20">
              conversation we had with Vitalik and devs who are contributing to the Zupass project
            </Link>
            .
          </p>
          <p>
            You can build on Zupass! Check out{' '}
            <Link href="https://x.com/austingriffith/status/1724131612856627396?s=20" indicateExternal>
              Austin Griffith's App Starter Kit.
            </Link>
          </p>
        </>
      )
    },
  },
  {
    text: 'How can I connect with other attendees, and find post-event discussions and follow-ups?',
    value: 'community-hub',
    content: () => {
      return (
        <>
          The ZK Devconnect Community Hub on Telegram stays open even after Devconnect. To join you need to prove that
          you have a ticket to one of the ZK ticketed Devconnect events. If you haven't joined yet, you can do it{' '}
          <Link href="https://t.me/zucat_bot?start=auth" indicateExternal>
            here
          </Link>
          .
        </>
      )
    },
  },
  {
    text: 'Will there be a Devconnect 2024?',
    value: 'devconnect-2024',
    content: () => {
      return (
        <>
          <p>
            Our next event will be{' '}
            <Link href="https://devcon.org/en" indicateExternal>
              Devcon 7 2024 in Southeast Asia!
            </Link>{' '}
            Follow{' '}
            <Link href="https://twitter.com/EFDevcon" indicateExternal>
              Deva on Twitter
            </Link>{' '}
            to stay up to date. And for updates for a future Devconnect,{' '}
            <Link href="https://twitter.com/EFDevconnect" indicateExternal>
              keep an eye on Twitter
            </Link>{' '}
            and the website for updates!{' '}
          </p>
        </>
      )
    },
  },
]

// FAQ changes during event to be more pertinent
// const FAQ = [
//   {
//     text: 'How can I get involved?',
//     value: 'how-involve',
//     content: () => {
//       return (
//         <>
//           <p className="bold">Volunteer</p>
//           <p>
//             We will be looking for volunteers for Devconnect Istanbul soon! Follow{' '}
//             <Link indicateExternal href="https://twitter.com/efdevconnect">
//               @EFDevconnect
//             </Link>{' '}
//             to stay up to date.
//           </p>
//           <p className="bold">Be an event host</p>
//           <p>
//             If you want to organize an event during Devconnect, head over to the{' '}
//             <Link
//               indicateExternal
//               href="https://www.notion.so/ef-events/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022?pvs=4"
//             >
//               event host guide
//             </Link>
//             .
//           </p>
//           <p className="bold">Media</p>
//           <p>
//             You want to cover Devconnect? Cool! Write us at press@devconnect.org for more info, or inquire to obtain a
//             media pass that grants you access to the Devconnect Cowork{' '}
//             <Link href="https://forms.gle/se7hd5Sz5x8Lkoj87 " indicateExternal>
//               here
//             </Link>
//             . <span className="bold">We, the Devconnect team, are currently not seeking media partnerships.</span>
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'I need a Visa invitation letter, can you help?',
//     value: 'visa',
//     content: () => {
//       return (
//         <>
//           <p>
//             Yes, we are happy to help! You&apos;ll need a{' '}
//             <Link href="/cowork" indicateExternal>
//               ticket for the Devconnect Cowork
//             </Link>{' '}
//             first, then you can{' '}
//             <Link href="https://forms.gle/zDQ6ax5Ukr75gDXt5" indicateExternal>
//               fill out this form
//             </Link>
//             . You will hear back from us via email within 2 weeks.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'How can I get a press pass?',
//     value: 'press-pass',
//     content: () => {
//       return (
//         <>
//           <p>
//             To inquire about obtaining a media pass for Devconnect,{' '}
//             <Link href="https://forms.gle/se7hd5Sz5x8Lkoj87" indicateExternal>
//               please fill out this form.
//             </Link>{' '}
//           </p>
//           <p>
//             A press pass grants access to the main Coworking Space that we are organizing. Please note that all other
//             events are independently hosted, and a press pass does not guarantee entry into them.{' '}
//           </p>
//           <p>
//             Ask us for more info about the event at <span className="bold">press@devconnect.org</span>.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'Can I sponsor Devconnect?',
//     value: 'sponsor',
//     content: () => {
//       return (
//         <>
//           <p>
//             The Devconnect team, responsible for organizing the coworking space in ICC, is currently not seeking
//             sponsorships.
//           </p>
//           <p>
//             Some of the independent teams organizing the different events might be seeking sponsorships. You can find
//             their websites and contact information <Link href="/schedule">on the curated Devconnect schedule</Link>.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'Can I speak at Devconnect?',
//     value: 'speak',
//     content: () => {
//       return (
//         <>
//           <p>
//             The Devconnect team, responsible for organizing the coworking space in ICC, is not looking for speakers.
//           </p>
//           <p>
//             Some of the independent teams organizing the different events might be looking for speakers or panelists.
//             You can find their websites and contact information{' '}
//             <Link href="/schedule">on the curated Devconnect schedule</Link>.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'How do I know if Devconnect is for me?',
//     value: 'howdoiknow',
//     content: () => {
//       return (
//         <>
//           <p>Devconnect is for you if you …</p>
//           <ul>
//             <li>want to meet people in Ethereum in person</li>
//             <li>
//               love to co-work in an incredible{' '}
//               <Link
//                 href="https://www.notion.so/ef-events/Devconnect-IST-Coworking-space-e811d778b6a846989600d54158ff70cf?pvs=4"
//                 indicateExternal
//               >
//                 Coworking Space
//               </Link>{' '}
//               next to others in the Ethereum space
//             </li>
//             <li>
//               <b>dive</b> deep into topics you care about with other domain experts
//             </li>
//             <li>want to make progress on solving specific problems</li>
//             <li>are passionate about creating more decentralized and fairer systems</li>
//           </ul>
//         </>
//       )
//     },
//   },
//   {
//     text: 'How can I navigate through events and ticketing?',
//     value: 'ticketingandevents',
//     content: () => {
//       return (
//         <>
//           <p>
//             👉 Take a look at our curated <Link href="/schedule">events calendar here!</Link> You&apos;ll find brief
//             descriptions of each event, an estimation of the difficulty level (beginner/intermediate/expert), and links
//             to the event websites.
//           </p>
//           <p>
//             👉 Follow{' '}
//             <Link href="https://twitter.com/EFDevconnect" indicateExternal>
//               @EFDevconnect
//             </Link>{' '}
//             on Twitter to stay in the loop. Follow the{' '}
//             <Link href="https://twitter.com/i/lists/1663882935949295616" indicateExternal>
//               Devconnect IST Twitter list
//             </Link>{' '}
//             for updates from event hosts.{' '}
//           </p>
//           <p>
//             There will be many events in many different venues throughout Istanbul during the week. You can pick and
//             choose based on your interests. <b>All events will be independently hosted, ticketed, and organized.</b>{' '}
//             Some events will be free, some will be based on applications, and others may be ticketed with paid tickets.
//           </p>
//           <p>
//             There will be an open{' '}
//             <Link
//               href="https://www.notion.so/ef-events/Devconnect-IST-Coworking-space-e811d778b6a846989600d54158ff70cf?pvs=4"
//               indicateExternal
//             >
//               Coworking Space
//             </Link>{' '}
//             throughout the week with tickets available to all, organized by the Devconnect team. Once ticketing for the
//             Cowork is open, you will find information here.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'Why is Devconnect coming to Istanbul?',
//     value: 'whyistanbul',
//     content: () => {
//       return (
//         <>
//           <p>
//             In choosing Istanbul as the host city for Devconnect 2023, we aim to capitalize on its unique position as a
//             bridge between East and West. Accessibility is a key priority, and Istanbul&apos;s major international
//             airport, efficient local metro, and abundance of suitable venues for community events make it the perfect
//             location for Devconnect 2023.
//           </p>
//           <p>
//             The engaged local community and numerous student blockchain clubs in the region further strengthen our
//             belief in the potential of this vibrant city. We are confident that Istanbul&apos;s unique blend of history,
//             culture, and modernity will provide an inspiring backdrop for the global Ethereum developer community to
//             come together, collaborate with these passionate groups, and drive innovation for Ethereum.
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'What about Devcon?',
//     value: 'ondevcon',
//     content: () => {
//       return (
//         <>
//           <p>
//             <Link href="https://twitter.com/EFDevcon" indicateExternal>
//               Devcon
//             </Link>{' '}
//             will remain our principal event, and we&apos;re excited to bring Devcon 7 to Southeast Asia in 2024!
//             Specific dates and location are coming soon. Read about why we&apos;re scheduling Devcon 7 for 2024 in
//             Southeast Asia{' '}
//             <Link href="https://blog.ethereum.org/2023/02/28/devcon-7-update" indicateExternal>
//               here
//             </Link>
//             .
//           </p>
//         </>
//       )
//     },
//   },
//   {
//     text: 'What is the difference between Devcon and Devconnect?',
//     value: 'devconvsdevconnect',
//     content: () => {
//       return (
//         <>
//           <p>
//             Devcon and Devconnect are the only two events organized by the Ethereum Foundation (yes, all the other
//             amazing ETH events are community-run!). Both events are Ethereum-focused but serve different purposes.
//           </p>
//           <p>
//             <b>Devcon</b> is a global Ethereum <i>family reunion</i>, a place to celebrate success and align on updates
//             and direction. It is our principal event, all in one place with one big venue, and talks and workshops open
//             to all. <Link href="devcon.org">Devcon 7 is scheduled for 2024 in Southeast Asia</Link>!
//           </p>
//           <p>
//             <b>Devconnect</b> on the other hand, is a week to <i>make progress</i>, dive deep into specific topics among
//             fellow experts, to co-work and collaborate. It is structurally entirely different from Devcon, and consists
//             of many individual events, organized by you the community, that each cover one topic in depth.
//           </p>
//         </>
//       )
//     },
//   },
// ]

export const CodeOfConduct = () => {
  return (
    <div className={css['code-of-conduct']} id="code-of-conduct">
      <p className="large-text bold">Code of Conduct</p>
      <p className="big-text underline bold">TL;DR</p>
      <p>
        <b>Be excellent to each other</b>. If a participant is, in our sole discretion, harassing or otherwise
        unacceptably impacting other participants&apos; ability to enjoy Devconnect, we at all times reserve the right
        to remove the offending person(s) from the event without refund.
      </p>
      <p className="big-text underline bold">Don&apos;t Shill</p>
      <p>
        Devconnect is designed for builders and developers -{' '}
        <i>
          <b>
            We aim to create a welcoming, collaborative space which allows for great networking opportunities. Please
            respect this space and the opportunity it affords by not aggressively shilling ICOs, investment
            opportunities, or financial products.
          </b>
        </i>{' '}
        If unsure, please ask the staff.
      </p>
      <p className="big-text underline bold">Harassment Policy</p>
      <p>We do not condone any form of harassment against any participant, for any reason. </p>
      <p>
        {' '}
        Harassment includes, but is not limited to, any threatening, abusive, or insulting words, behavior, or
        communication (whether in person or online), whether relating to gender, sexual orientation, physical or mental
        ability, age, socioeconomic status, ethnicity, physical appearance, race, religion, sexual images, or otherwise.
        Harassment also includes hacking, deliberate intimidation, stalking, inappropriate physical contact, and
        unwelcome sexual attention.
      </p>
      <p>
        {' '}
        Participants asked to stop any harassing behavior must comply immediately. We reserve the right to respond to
        harassment in the manner we deem appropriate, including but not limited to expulsion without refund and referral
        to the relevant authorities.
      </p>
      <p>
        {' '}
        This Code of Conduct applies to everyone participating at Devconnect - from attendees and exhibitors to
        speakers, press, volunteers, etc.
      </p>
      <p>
        {' '}
        Anyone can report harassment. If you were or are being harassed, notice that someone else was or is being
        harassed, or have any other concerns related to harassment, you can contact a Devconnect volunteer or staff
        member, make a report at the registration desk or info booth, or submit a complaint to help@devconnect.org.
      </p>
      <p className="big-text underline bold">Approved Swag Only</p>
      <p>
        <b>
          Only pre-approved teams are authorized to distribute swag (clothing, sales, freebies, or any form of
          promotional material) at Devconnect!
        </b>{' '}
        Examples of permitted groups include the Devconnect team, and some of the other pre-approved event organizers.
        Please respect this decision. If you are unsure of whether you are allowed to distribute your swag, ask the
        friendly staff!
      </p>
      <p className="big-text underline bold">Wifi Etiquette</p>
      <p>We want all attendees to be able to enjoy fast, reliable WiFi. As such, please keep the following in mind:</p>
      <ul>
        <li>
          <i>No ARP storms</i>
        </li>
        <li>
          <i>No Private WiFi access points</i>
        </li>
        <li>
          <i>No Private DHCP servers</i>
        </li>
      </ul>
      <p className="big-text underline bold">Media Policy</p>
      <p>
        At Devconnect we aim to respect the privacy of our attendees. It is important for you to review the Devconnect
        Media Policy and to ensure you understand and follow it.
      </p>{' '}
      <p className="big-text underline bold">Be Respectful to Speakers (and audiences)</p>
      <p>
        Be mindful of your volume when you&apos;re in or near event venues. Noise levels can quickly get out of control
        and become disruptive to the programme going on inside! Please respect the speakers and participants if you are
        arriving late to an event and/or getting up to leave an event early — try to cause as little disruption as
        possible.
      </p>
      <p className="big-text underline bold">Local Laws</p>
      <p>
        You must comply with all venue and facility rules and regulations during your participation in Devconnect,
        including all safety instructions and requirements. It is also very important to note that <b>ALL</b> attendees
        are expected to conform to <b>ALL</b> local laws, including Covid-19 restrictions and policies imposed by the
        venue, facility, and/or local authorities.
      </p>
      <p className="big-text underline bold">How to Report</p>
      <p>If you notice any violations of this Code of Conduct please report them to help@devconnect.org.</p>
      <p className="big-text underline bold">Remember</p>
      <p className="bold">
        Devconnect is what you make of it, and as a community we can create a safe, meaningful, and incredible
        experience for everyone! 🦄
      </p>
    </div>
  )
}

export const Header = () => {
  return (
    <div className="section">
      <header className={`${css['header']} clear-vertical`}>
        <Link href="/" className={css['logo']}>
          <HeaderLogo />
        </Link>

        <Menu />
      </header>
    </div>
  )
}

type FooterProps = {
  inFoldoutMenu?: boolean
  onClickMenuItem?: () => void
}

export const Footer = ({ inFoldoutMenu, onClickMenuItem }: FooterProps) => {
  const [codeOfConductModalOpen, setCodeOfConductModalOpen] = React.useState(false)
  let className = css['footer-container']

  if (inFoldoutMenu) className += ` ${css['in-foldout-menu']}`

  return (
    <>
      <Modal
        className={css['modal-overrides']}
        open={codeOfConductModalOpen}
        close={() => setCodeOfConductModalOpen(false)}
        noBodyScroll
      >
        <CodeOfConduct />
      </Modal>
      <Observer repeating activeClassName={css['visible']} observerOptions={{ threshold: 0.7 }}>
        <div className={className}>
          <div className={css['gradient-overlay']} id="footer-gradient"></div>
          <div className={`${css['footer']}`}>
            <div style={{ position: 'relative' }}>
              <div className={css['background']}>
                <ImageNew src={FooterBackground} alt="Colorful rectangles and triangles" />
              </div>

              <div className="section padding-top padding-bottom">
                <div className={css['top']}>
                  <DevconnectIstanbul />
                  <DevconnectIstanbulText />
                </div>
                <div className={css['middle']}>
                  <div className={css['left']}>
                    <FooterMenu onClickMenuItem={onClickMenuItem} />

                    <form
                      id="newsletter-signup"
                      className={css['newsletter']}
                      action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjI4NDA0MywibGFuZyI6ImVuIn0="
                      method="post"
                    >
                      <div className={css['input-container']}>
                        <div>
                          <label>Email</label>
                          <input type="email" required name="email" />
                        </div>
                      </div>
                      <input type="hidden" name="sender" value="support@devconnect.org" />
                      <button className="button white sm">Subscribe to newsletter</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            <div className="section">
              <div className={`${css['bottom']}`}>
                <div className={css['crafted-by']}>
                  <p className="tiny-text">Crafted and curated with passion ♥ ✨ at the Ethereum Foundation.</p>
                  <p className={`${css['copyright']} tiny-text`}>
                    © {new Date().getFullYear()} — Ethereum Foundation. All Rights Reserved.
                  </p>
                </div>

                <div className={css['links']}>
                  <Link href="https://devcon.org">Devcon</Link>
                  <Link href="mailto:support@devconnect.org">Contact Us</Link>
                  <Link href="https://ethereum.foundation">Ethereum Foundation</Link>
                  <Link href="/code-of-conduct">Code of Conduct</Link>
                  <Link href="https://ethereum.org/en/privacy-policy/">Privacy policy</Link>
                  <Link href="https://ethereum.org/en/terms-of-use/">Terms of use</Link>
                  <Link href="https://ethereum.org/en/cookie-policy/">Cookie policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Observer>
    </>
  )
}

const Scene = (props: any) => {
  let className = css['scene']

  if (props.className) className += ` ${props.className}`
  if (props.growVertically) className += ` ${css['grow-vertically']}`
  if (props.growNaturally) className += ` ${css['grow-naturally']}`

  return (
    <>
      <div id={props.id} className={className}>
        {props.children}
      </div>
    </>
  )
}

const Home: NextPage = (props: any) => {
  // console.log(props.cms, 'content?')
  const { data }: { data: PagesQuery } = useTina(props.cms)

  // const [dateHovered, setDateHovered] = React.useState(false)
  const [hehe, setHehe] = React.useState(false)
  const organizersRef = React.useRef<any>()
  const splineRef = React.useRef<any>()
  // const [mounted, setMounted] = React.useState(false)

  // const [timeToEvent, setTimeToEvent] = React.useState<string | null>(null)

  // React.useEffect(() => {
  //   const interval = setInterval(() => {
  //     const timeLeft: any = getTimeUntilNovember13InTurkey()

  //     console.log(typeof timeLeft, 'time left')

  //     if (typeof timeLeft === 'string') {
  //       setTimeToEvent(timeLeft)

  //       return
  //     }

  //     setTimeToEvent(
  //       `${timeLeft.days}D:${leftPadNumber(timeLeft.hours)}H:${leftPadNumber(timeLeft.minutes)}M:${leftPadNumber(
  //         timeLeft.seconds
  //       )}S`
  //     )
  //   }, 1000)

  //   setMounted(true)

  //   return () => clearInterval(interval)
  // }, [])

  // const [width, setWidth] = React.useState(0)
  // const { observe } = useDimensions({
  //   onResize: ({ observe, unobserve, width, height, entry }) => {
  //     setWidth(width)
  //   },
  // })

  // React.useEffect(() => {
  //   if (!splineRef.current) return

  //   if (width > 1000) {
  //     splineRef.current.setZoom(0.7)
  //   } else if (width > 700) {
  //     splineRef.current.setZoom(0.5)
  //   } else {
  //     splineRef.current.setZoom(0.3)
  //   }
  // }, [width])

  return (
    <>
      <SEO />
      <div className={css.container}>
        <main id="main" className={css.main}>
          <Scene className={css['scene-hero']}>
            <Header />

            <div className={css['cube-container']}></div>

            <div className={css['spline']}>
              <ErrorBoundary>
                <Spline
                  scene="https://prod.spline.design/03JSjbnhW8P41kDH/scene.splinecode"
                  onLoad={application => {
                    splineRef.current = application

                    const mainEl = document.getElementById('main')

                    if (!mainEl) {
                      splineRef.current.setZoom(0.5)

                      return
                    }

                    const width = mainEl.offsetWidth

                    if (width > 1500) {
                      splineRef.current.setZoom(0.6)
                    } else if (width > 700) {
                      splineRef.current.setZoom(0.4)
                    } else {
                      splineRef.current.setZoom(0.3)
                    }
                  }}
                />
              </ErrorBoundary>
            </div>

            {/* <div className={css['cube-container']}>
              <div className={css['cube']} id="cube" />
              <ErrorBoundary>
                <Cube />
              </ErrorBoundary>
            </div> */}

            <div className="section">
              <div className={css['info-container']}>
                <div className={`${css['info']}`}>
                  <div>
                    <p className={`${css['big-description']}`}>{data.pages.catchphrase}</p>

                    <div style={{ maxWidth: '575px', marginBottom: '12px', color: '#3b3b3b' }} className="big-text">
                      <TinaMarkdown content={data.pages.subtext} />
                    </div>

                    <div className={css['buttons']}>
                      {/* <Link href="/cowork" className={`button orange-fill wide ${css['ticket-button']}`}>
                        <PlayIcon /> Get cowork tickets
                      </Link> */}

                      <Link href="#gallery" className={`button slick-purple ${css['video-recap-button']}`}>
                        <span className="!mr-0">{data.pages.button}</span>
                      </Link>
                    </div>
                  </div>
                  <div className={css['countdown']}>
                    {/* {mounted && timeToEvent && (
                      <>
                        {typeof timeToEvent === 'string' ? (
                          <>
                            <p className={css['countdown-header']}>DEVCONNECT IST</p>
                            <p className={css['countdown-number']}>
                              <Link href="/schedule">
                                <CalendarIcon />
                                {timeToEvent}
                              </Link>
                            </p>
                          </>
                        ) : (
                          <>
                            <p className={css['countdown-header']}>Countdown</p>
                            <p className={css['countdown-number']}>{timeToEvent}</p>
                          </>
                        )}
                      </>
                    )} */}
                  </div>
                </div>
              </div>
            </div>

            <div className={`section ${css['bottom-section']}`}>
              <div className={`${css['bottom']} margin-bottom-less`}>
                <div>
                  <Logo
                    onMouseEnter={() => setHehe(true)}
                    onMouseLeave={() => setHehe(false)}
                    onTouchStart={() => setHehe(!hehe)}
                    className={css['logo-bottom-left']}
                  />
                  {hehe && <ImageNew src={Hehe} alt="Hehe" className={css['hehe']} />}
                </div>

                <div className={css['scroll-for-more']}>
                  <p>Scroll to learn more</p>
                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 16 16" width="16" height="16">
                    <g className="nc-icon-wrapper" fill="#ffffff">
                      <g className={`${css['nc-loop-mouse-16-icon-f']}`}>
                        <path
                          d="M10,0H6A4.012,4.012,0,0,0,2,4v8a4.012,4.012,0,0,0,4,4h4a4.012,4.012,0,0,0,4-4V4A4.012,4.012,0,0,0,10,0Zm2,12a2.006,2.006,0,0,1-2,2H6a2.006,2.006,0,0,1-2-2V4A2.006,2.006,0,0,1,6,2h4a2.006,2.006,0,0,1,2,2Z"
                          fill="#ffffff"
                        ></path>
                        <path
                          d="M8,4A.945.945,0,0,0,7,5V7A.945.945,0,0,0,8,8,.945.945,0,0,0,9,7V5A.945.945,0,0,0,8,4Z"
                          fill="#ffffff"
                          data-color="color-2"
                        ></path>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </Scene>

          <Scene growVertically growNaturally id="recap-video" className={`${css['scene-istanbul']}`}>
            <div className="section" id="about">
              <h1 className="section-header clear-vertical" style={{ zIndex: 1 }}>
                <span className="orange">DEVCONNECT IST</span>
              </h1>

              <div className={`columns margin-bottom flex flex-col xl:flex-row`}>
                <div className="xl:basis-1/2 align-self flex flex-col lg:mr-[25px]">
                  <div>
                    <p className="large-text">
                      The vibrant metropolis of Istanbul hosted Devconnect from November 13-19.{' '}
                      <span className="border-b-[3px] border-solid font-bold border-red-500">
                        Over 3500 Ethereum enthusiasts
                      </span>{' '}
                      gathered at the <b>Devconnect Cowork</b> in the Istanbul Congress Center, while many more attended
                      independent events throughout Istanbul.
                    </p>

                    <br />

                    <p>
                      Each event offered key insights into their respective areas and highlighted crucial topics for
                      progress within the Ethereum ecosystem. Trending topics varied from L2s and programmable
                      cryptography to world-building, infrastructure, global impact, Ethereum's core values, and
                      real-world use cases.
                    </p>

                    <br />

                    <p>
                      The overarching theme of Devconnect Istanbul 2023 was the enthusiasm and involvement of the local
                      Turkish Ethereum community. ETHGünü and notDEVCON and d:pact demonstrated the local impact of
                      Ethereum. It highlighted how local communities are essential in fostering a global network,
                      contributing unique perspectives.
                    </p>

                    <br />

                    <p>
                      <b>Thank you</b> to everyone who joined us at Devconnect Istanbul 2023! We look forward to seeing
                      the ongoing connections and progress you all will continue to make for Ethereum.
                    </p>
                  </div>

                  <div className={`margin-top ${css['nowrap']}`}>
                    <Link
                      href="https://blog.ethereum.org/2023/12/04/devconnect-ist-wrap"
                      indicateExternal
                      className={`button wide orange-fill ${css['cowork-tickets-button']}`}
                    >
                      Read the blog
                    </Link>
                  </div>
                </div>

                <div className="xl:basis-1/2 w-full md:w-3/4 md:self-start xl:w-full mt-8 xl:mt-0 xl:ml-[25px]">
                  <div className="aspect">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/QoPFqV6jCTI"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>

            <div className={css['background-cityscape']}>
              <ImageNew src={bgMerged} alt="Istanbul inspired Cityscape Background" />
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-content']} mt-8`}>
            <div className="section">
              <h1 className="section-header orange">Gallery</h1>

              <p className={`large-text mt-4`} id="gallery">
                <b>Relive the Devconnect experience</b> in Istanbul and reminisce about the meaningful conversations and
                real-life connections we forged during an unforgettable week.
              </p>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-about-content']} my-8`}>
            <InfiniteScroller nDuplications={2} speed="180s" marqueeClassName="h-[500px]">
              {[Cowork1, Cowork2, Cowork3, Cowork4, Cowork5, Cowork6, Cowork7, Cowork8].map((src, i) => {
                return (
                  <ImageNew
                    src={src}
                    key={i}
                    alt="Recorded Session Cover Image"
                    className="shrink-0 !h-full !w-auto object-contain mr-4"
                  />
                )
              })}
            </InfiniteScroller>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-about-content']}`}>
            <div className="section">
              <div>
                <Link
                  href="https://drive.google.com/drive/folders/1DlzDuVajwDmPOtE1uqns4Na9fjn6wQvy"
                  indicateExternal
                  className="button orange"
                >
                  View Image Gallery
                </Link>
              </div>
            </div>
          </Scene>

          <Scene growNaturally growVertically className={`${css['scene-content']} !overflow-visible`}>
            {/* <Observer> */}
            <div className="section margin-bottom" id="about">
              <div className="flex">
                <div className="relative basis 4/4 xl:basis-3/4">
                  <h1 className="section-header orange margin-top-less pb-5 border-top border-neutral-300 pt-8">
                    Rewatch the Presentations
                  </h1>

                  <p className="large-text xl:pb-12">
                    Don't miss out on valuable insights from Devconnect - Streameth has recorded some of the Devconnect
                    events, check them out if you want to re-experience talks or if you couldn't make it to Istanbul
                    this year. You can also check out the{' '}
                    <Link href="/istanbul">
                      <b>schedule</b>
                    </Link>{' '}
                    to find other event's websites and recordings.
                  </p>
                </div>

                <div className="relative hidden xl:block basis-1/3 shrink-0">
                  <ImageNew
                    src={ShapesImage}
                    alt="shapes image"
                    className="absolute h-[120%] bottom-0 object-contain object-bottom"
                  />
                </div>
              </div>

              {/* <p className="extra-large-text margin-bottom-less">
                Multiple events, <u>independently</u> organized by the <span className="orange">community</span>.
                <br />
                Each event has a unique focus, ranging from <b>beginner-friendly to expert level.</b>
              </p> */}

              {/* <div className="margin-top margin-bottom"></div> */}

              {/* <div className="margin-top margin-bottom-less"></div>

              <h1 className="section-header orange margin-bottom-less">Host Your Event At Devconnect</h1>

              <p className={`${css['restrain-width']} extra-large-text margin-bottom-less`}>
                Make Devconnect what it&apos;s supposed to be — a <b>decentralized and open Ethereum week.</b>
              </p>

              <div className={css['reasons-to-attend']}>
                <div className={css['no-box']}>
                  Here are some quotes from last year&apos;s event hosts in Amsterdam with reasons to host an event:
                </div>
                {[
                  'Get all the interested people in one place at the same time to make progress on open issues.',
                  'Bandwidth and engagement IRL meetings is high!',
                  'People came away from the event extremely energized, and discussions inspired new project directions.',
                  'We realize that creating unique spaces for the blockchain community will attract our target audience.',
                  'This type of event is a valuable feedback mechanism, and simultaneously allows for participant learning in a workshop format.',
                ].map(text => {
                  return (
                    <div className={css['box']} key={text}>
                      <p>
                        <i>&quot;{text}&quot;</i>
                      </p>
                    </div>
                  )
                })}
              </div>

              <div>
                <Link
                  href="https://ef-events.notion.site/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022"
                  className={`button wide white ${css['get-involved-button']} margin-top`}
                  indicateExternal
                >
                  Host An Event
                </Link>
              </div> */}
            </div>
          </Scene>

          {/* NOTE: RETAINING FOR POST DEVCONNECT RECAP: */}
          {/* <Scene growVertically growNaturally id="event-retro" className={`${css['scene-event-retro']} section`}>
            <div className={`${css['background']} expand`}>
              <Image src={BluePrint} objectFit="contain" alt="Building outline" />
            </div>
            <h1 className="section-header grey clear-vertical" style={{ zIndex: 1 }}>
              Devconnect // Amsterdam 2022
            </h1>

            <div className={`${css['columns']} clear-vertical`}>
              <div className={css['left']}>
                <div>
                  <p className="big-text">
                    Thanks to all those who came to the first ever Devconnect. What started out as an experimental idea
                    turned into one of the most impactful Ethereum events to date — thank you for being a part of it!
                    Hope to see you at the next one.
                  </p>
                  <p className="big-text">
                    While Devconnect is over, the Dutch ethereum community continues to grow! If you wish to get
                    involved, you can join the Ethereum DEV NL meetup group.
                  </p>
                </div>
                <Link
                  href="https://www.meetup.com/Ethereum-DEV-NL/"
                  className={`button purple ${css['get-involved-button']}`}
                  indicateExternal
                >
                  Ethereum DEV NL
                </Link>
              </div>
              <div className={css['right']}>
                <div className="aspect" id="video">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/6X0yIUq7fpc"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>

            <div className={`${css['gallery']}`}>
              <div className={css['grid-item']}>
                <Image src={Cowork1} alt="Cowork space example" />
              </div>
              <div className={css['grid-item']}>
                <Image src={Cowork2} alt="Cowork space example" />
              </div>
              <div className={css['grid-item']}>
                <Image src={Cowork3} alt="Cowork space example" />
              </div>
              <div className={css['grid-item']}>
                <Image src={Cowork4} alt="Cowork space example" layout="fill" />
              </div>
              <div className={css['grid-item']}>
                <Image src={Cowork5} alt="Cowork space example" />
              </div>
            </div>
          </Scene> */}

          {/* <div id="about" className={`${css['scene-about']}`}>
            <Observer>
              <div className="section">
                <div className={`${css['scene-about-content']} clear-vertical`}>
                  <div className={css['text-container']}>
                    <div className={css['body']}>
                      <div>
                        <h1 className="section-header grey">What can you expect?</h1>
                        <p className="big-text margin-top-less">
                          Devconnect events are independent of each other and each have a unique focus. The topics range
                          from{' '}
                          <b>
                            decentralized systems, scalability, privacy, and incentive mechanisms, to Ethereum
                            economics, MEV, UX, decentralized governance, and more.
                          </b>
                        </p>
                        <p className="big-text margin-top-less">
                          The target audience for most events is experts or people very interested in the domain to
                          enable in-depth understanding. The sessions can be half-day to multiple days long and give you
                          time to collaborate on topics you care about.
                        </p>

                        <Link
                          href="/schedule"
                          className={`button sm white ${css['get-involved-button']}`}
                          indicateExternal
                        >
                          Explore events
                        </Link>
                      </div>
                    </div>

                    <div className={css['cube-images']}>
                      <div>
                        <Image
                          src={CubeImages}
                          layout="fill"
                          objectFit="contain"
                          objectPosition="right"
                          alt="Devconnect event images"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Observer>
          </div> */}

          <Scene growVertically growNaturally className={`${css['scene-about-content']} mt-8`}>
            <div className="section !overflow-visible">
              <SwipeToScroll>
                <div className="flex flex-nowrap">
                  {[
                    { cover: Cover1, url: 'https://app.streameth.org/devconnect/light_client_summit/archive' },
                    { cover: Cover4, url: 'https://www.youtube.com/@PROGCRYPTO/videos' },
                    {
                      cover: Cover3,
                      url: 'https://app.streameth.org/devconnect/conflux__web3_ux_unconference/archive',
                    },
                    { cover: Cover2, url: 'https://app.streameth.org/devconnect/wallet_unconference/archive' },
                    { cover: Cover5, url: 'https://app.streameth.org/devconnect/solidity_summit/archive' },
                    { cover: Cover6, url: 'https://app.streameth.org/devconnect/autonomous_worlds_assembly' },
                    { cover: Cover7, url: 'https://app.streameth.org/devconnect/ethconomics/archive' },
                    { cover: Cover8, url: 'https://app.streameth.org/devconnect/evm_summit/archive' },
                    { cover: Cover9, url: 'https://app.streameth.org/devconnect/ethgunu/archive' },
                    { cover: Cover10, url: 'https://app.streameth.org/devconnect/staking_gathering_2023' },
                    { cover: Cover11, url: 'https://app.streameth.org/secureum/secureum_trustx/archive' },
                    { cover: Cover12, url: 'https://app.streameth.org/devconnect/epf_day/archive' },
                  ].map((entry, i) => {
                    return (
                      <motion.div
                        key={i}
                        className="min-w-[450px] relative mr-4 mt-1"
                        whileHover={{ boxShadow: '0px 0px 6px 0px black' }}
                      >
                        <Link key={i} href={entry.url} className="">
                          <ImageNew src={entry.cover} alt="Recorded Session Cover Image" className="w-full h-full" />
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </SwipeToScroll>
              <p className="text-slate-300 text-xs font-bold mt-2">DRAG FOR MORE</p>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-content']} my-8 mt-3`}>
            <div className="section">
              <div className="border-bottom border-neutral-300 pb-8">
                <div className={css['topics-header']}>
                  <p className="section-header uppercase orange">Topics Covered</p>
                  <Link href="/istanbul" className={`orange button`} indicateExternal>
                    View Schedule
                  </Link>
                </div>

                <div className={`${css['topics']} my-4`} id="topics-container">
                  <Observer
                    activeClassName={css['transformed']}
                    repeating
                    observerOptions={{
                      rootMargin: '-40% 0px -25% 0%',
                    }}
                  >
                    <div className={css['topic']}>Decentralized Systems • </div>
                  </Observer>

                  <Observer
                    activeClassName={css['transformed']}
                    repeating
                    observerOptions={{
                      rootMargin: '-40% 0px -25% 0%',
                    }}
                  >
                    <div className={css['topic']}>Scalability • privacy • incentive mechanisms</div>
                  </Observer>

                  <Observer
                    activeClassName={css['transformed']}
                    repeating
                    observerOptions={{
                      rootMargin: '-40% 0px -25% 0%',
                    }}
                  >
                    <div className={css['topic']}> • mev • UX • governance & more</div>
                  </Observer>
                </div>
              </div>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-content']}`}>
            <div className="section">
              <div className="flex mb-0 2xl:mb-8 flex-col 2xl:flex-row">
                <div className="basis-1/1 2xl:basis-2/4 shrink-0">
                  <h1 className="section-header orange">About Devconnect</h1>

                  <div className="mt-6">
                    <p className={css['big-description']}>
                      Devconnect aims to bring together Ethereum&apos;s most important{' '}
                      <b>
                        <span className={css['red-underline']}>builders</span>, researchers, and its community.
                      </b>
                    </p>

                    <p className="large-text margin-top-less">
                      At Devconnect events, you can have deep discussions about trending topics in Ethereum, and
                      collaborate in person on problems you are currently trying to solve. The Devconnect Cowork is a
                      place to network, and meet the people working in Ethereum. And on the side, you can explore the
                      rich history and culture of the unique city where we gather.
                    </p>
                  </div>
                </div>

                <div className="basis-1/1 2xl:basis-2/4 overflow-hidden mt-8 2xl:mt-0 pl-0 2xl:pl-8">
                  <h1 className="section-header orange">Past Events</h1>

                  <div className="flex flex-row lg:flex-nowrap flex-wrap gap-4 py-8 max-w-full">
                    <PastEventCard
                      text="Istanbul Schedule"
                      className="sm:max-w-[350px] 2xl:max-w-none 2xl:flex-grow"
                      image={istanbulScheduleBackground}
                      imageAlt="Istanbul collage"
                      link="/istanbul"
                    />

                    <PastEventCard
                      text="Amsterdam Schedule"
                      className="sm:max-w-[350px] 2xl:max-w-none 2xl:flex-grow"
                      image={amsterdamScheduleBackground}
                      imageAlt="Amsterdam collage"
                      link="/amsterdam"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-faq']}`}>
            <div className="section">
              <h1 className="section-header orange border-top padding-top-less">Blog Posts</h1>

              <BlogReel blogs={props.blogs} />
            </div>
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-faq']} section`}>
            <div className={`clear-vertical`}>
              {/* <div className="columns border-bottom margin-bottom padding-bottom">
                  <div className="left">
                    <h1 className="section-header grey">Are you New to Ethereum?</h1>
                    <p className="big-text margin-top-less">
                      Devconnect will feature some beginner-level events as well. Additionally, you are welcome to join
                      the{' '}
                      <Link
                        href="https://www.notion.so/ef-events/Devconnect-IST-Coworking-space-e811d778b6a846989600d54158ff70cf?pvs=4"
                        indicateExternal
                      >
                        Devconnect Coworking Space
                      </Link>
                    </p>
                    <p className="big-text margin-top-less margin-bottom-less">
                      It is a meeting point, a place to work, and a space to relax where you can learn and exchange
                      experiences with others in the space. Some say the Coworking Space at{' '}
                      <Link href="https://devconnect.org/amsterdam">Devconnect 2022</Link> in Amsterdam was worth a
                      visit on its own.
                    </p>
                  </div>
                  <div className="right">
                    <h1 className="section-header grey">For Event Organizers</h1>
                    <p className="big-text margin-top-less margin-bottom-less">
                      Devconnect events are independent of each other, and organized by different teams. Each discussion
                      will be hosted and curated by experts in those domains. You have the opportunity to organize an
                      event and contribute your expertise.
                    </p>
                    <Link
                      href="https://ef-events.notion.site/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022"
                      className={`button sm white margin-bottom-less`}
                      indicateExternal
                    >
                      Organize an Event
                    </Link>
                  </div>
                </div> */}

              <h1 className="section-header orange">Frequently Asked Questions</h1>

              <div className={`${css['accordion']} tab-content`} id="faq">
                <Accordion>
                  {FAQ.map(faq => {
                    return (
                      <AccordionItem
                        key={faq.text}
                        title={<div className="bold">{faq.text}</div>}
                        id={faq.value}
                        ref={faq.value === 'organizers' ? organizersRef : undefined}
                      >
                        {faq.content && faq.content()}
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            </div>
          </Scene>
        </main>

        <Footer />
      </div>
    </>
  )
}

const getBlogPosts = async (maxItems: number = 6): Promise<Array<BlogPost>> => {
  const parser: Parser = new Parser({
    customFields: {
      item: ['description'],
    },
  })

  const feed = await parser.parseURL('https://blog.ethereum.org/en/events/feed.xml')
  const blogs = feed.items
    .filter(i => i.categories?.some(category => category === 'Devconnect'))
    .map(i => {
      return {
        id: slugify(i.title ?? ''),
        title: i.title,
        description: i.description,
        date: i.pubDate ? new Date(i.pubDate).getTime() : 0,
        author: 'Devcon Team',
        body: i['content:encoded'] || i.description,
        slug: slugify(i.title ?? ''),
        permaLink: i.link,
        imageUrl: i.enclosure ? i['enclosure'].url : '',
      } as BlogPost
    })

  return blogs.slice(0, maxItems)
}

export async function getStaticProps() {
  const content = await client.queries.pages({ relativePath: 'Index.md' })
  return {
    props: {
      blogs: await getBlogPosts(),
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
    },
    revalidate: 1 * 60 * 30, // 30 minutes, in seconds
  }
}

export default Home
