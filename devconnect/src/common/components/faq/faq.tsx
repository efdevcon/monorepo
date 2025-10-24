import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import RichText from 'lib/components/tina-cms/RichText'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'common/components/link/Link'
import cn from 'classnames'

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
            instructions on how to join the chat in the email dispatched to you (search for the subject line "Devconnect
            Cowork your order.").
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
            "Devconnect Cowork your order.").
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
              the code "DEVCONNECT" up until 30th November, 2023.
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
const FAQOld = [
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
              Devcon SEA took place in Bangkok, Thailand between 12-15 November 2024. The next Devcon will be in 2026.
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
    text: 'Will there be a Devconnect 2025?',
    value: 'devconnect-2024',
    content: () => {
      return (
        <>
          <p>Yes! Stay tuned for further information</p>
        </>
      )
    },
  },
]

const FAQ = (props: any) => {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const questions = props.questions || []
  const hasMoreThanFive = questions.length > 5
  const displayedQuestions = showAll ? questions : questions.slice(0, 5)

  return (
    <div className="">
      <motion.div
        key={showAll ? 'all' : 'limited'}
        className="flex flex-col"
        initial="hidden"
        animate="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={{
          hidden: {
            opacity: 0,
          },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <div className="relative">
          {displayedQuestions.map(({ question, answer }: { question: string; answer: any }, index: number) => {
            const open = question === openFAQ
            const isLastVisible = !showAll && hasMoreThanFive && index === 4

            return (
              <motion.div
                variants={{
                  hidden: {
                    opacity: 0,
                    x: -50,
                    scale: 0.9,
                  },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    transition: {
                      duration: 0.3,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    },
                  },
                }}
                key={question}
                className={cn(
                  'w-full flex flex-col mb-2 border bg-white border-solid border-slate-300 hover:bg-[rgb(250,250,250)] relative',
                  open ? 'bg-[rgba(27,111,174,0.1)] border-b-[4px] border-b-[rgba(27,111,174)]' : '',
                  isLastVisible ? 'mask-fade-bottom' : ''
                )}
                style={
                  isLastVisible
                    ? {
                        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                      }
                    : {}
                }
              >
                <button
                  className="p-3 px-4 grow text-base text-start cursor-pointer select-none group flex justify-between gap-4 items-center"
                  onClick={() => setOpenFAQ(open ? null : question)}
                  type="button"
                  aria-expanded={open}
                >
                  <div
                    className={cn(
                      'flex  translate-x-0 group-hover:lg:translate-x-2 transition-all duration-300 font-bold',
                      open ? '' : ''
                    )}
                  >
                    {question}
                  </div>
                  <span className="flex items-center h-full justify-center text-xs shrink-0">
                    {open ? <ChevronUp /> : <ChevronDown />}
                  </span>
                </button>

                {open && (
                  <motion.div
                    initial={{ y: '-10%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    className="w-full p-4 pt-2 will-transform"
                  >
                    {typeof answer !== 'string' ? <RichText content={answer} /> : answer}
                  </motion.div>
                )}
              </motion.div>
            )
          })}

          {hasMoreThanFive && !showAll && (
            <div className="relative -mt-12 pt-12 flex justify-center pointer-events-none">
              {/* <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" /> */}
              <button
                onClick={() => setShowAll(true)}
                className={cn(
                  'mb-2 z-10 border border-solid border-b-[3px] group px-3 py-1 border-[rgb(54,54,76)] font-bold text-[rgba(54,54,76,1)] text-sm bg-[white] hover:bg-[rgb(227,241,255,1)] transition-colors hover:border-opacity-0'
                )}
              >
                <div className="group-hover:translate-y-[2px] pointer-events-auto transition-transform uppercase flex items-center gap-2">
                  View All ({questions.length} questions)
                </div>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default FAQ
