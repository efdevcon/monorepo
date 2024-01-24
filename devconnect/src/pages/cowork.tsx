import { NextPage } from 'next'
import React from 'react'
import { Header, Footer } from './index'
import Hero from 'common/components/hero'
// import CoworkHero from 'assets/images/cowork-alt-2.jpg'
import Cowork1 from 'assets/images/cowork-gallery/cowork-1.png'
import Cowork2 from 'assets/images/cowork-gallery/cowork-2.png'
import Cowork3 from 'assets/images/cowork-gallery/cowork-3.png'
import Cowork4 from 'assets/images/cowork-gallery/cowork-4.png'
import Cowork5 from 'assets/images/cowork-gallery/cowork-5.png'
import Image from 'next/legacy/image'
import css from './cowork.module.scss'
import PinIcon from 'assets/icons/pin.svg'
import TicketIcon from 'assets/icons/ticket.svg'
import { SEO } from 'common/components/SEO'
import Link from 'common/components/link/Link'
import PeopleIcon from 'assets/icons/people.svg'
import ComputerIcon from 'assets/icons/computer.svg'
import BoltIcon from 'assets/icons/bolt.svg'
import PhotoIcon from 'assets/icons/photo.svg'
import { Tabs } from './city-guide'
import WifiIcon from 'assets/icons/wifi.svg'
import Alert from 'common/components/alert'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import Head from 'next/head'
import SoldOut from 'assets/images/sold-out.png'
import Accordion, { AccordionItem } from 'common/components/accordion'
import SwipeToScroll from 'common/components/swipe-to-scroll'
import CoworkHero from 'assets/images/cowork-gallery/cowork.png'
import PlayIcon from 'assets/icons/play.svg'
import { FAQDuringEvent } from './index'
import { useRouter } from 'next/router'

const volunteerFAQ = [
  {
    text: 'Is this Volunteer Application just for the Cowork Space?',
    value: '1',
    content: () => {
      return (
        <p className="tab-content">
          Yes, this Volunteer Application is just for the Cowork Space. To apply to a specific event happening during
          Devconnect week, you must contact the organizer of that event listed on the{' '}
          <Link href="/schedule">Devconnect Schedule</Link>.
        </p>
      )
    },
  },
  {
    text: 'What are the requirements to volunteer for the event?',
    value: '2',
    content: () => {
      return (
        <p>
          We welcome volunteers of all backgrounds and experiences. You must be at least 18 years old to apply or obtain
          parental/guardian permission. A passion to learn is highly valued.
        </p>
      )
    },
  },
  {
    text: 'What volunteer roles are available for the event?',
    value: '3',
    content: () => {
      return (
        <p>
          Various volunteer roles, including registration support, speaker support, and more. You can indicate your
          preferred roles in the application, but specific roles will be assigned closer to the event by our team
        </p>
      )
    },
  },
  {
    text: 'How many hours am I expected to volunteer during the event?',
    value: '4',
    content: () => {
      return (
        <p>
          The time commitment will vary based on your chosen role and availability. Volunteers typically serve in shifts
          but will not be required to volunteer the entire week — we want you to enjoy Devconnect too!
        </p>
      )
    },
  },
  {
    text: 'Will there be any training provided for volunteers?',
    value: '5',
    content: () => {
      return (
        <p>
          Yes, selected volunteers will receive training and orientation—both virtual and in-person—before the event to
          ensure you are well-prepared for your role.
        </p>
      )
    },
  },
  {
    text: 'Is there any compensation for volunteering?',
    value: '6',
    content: () => {
      return (
        <p>
          As a volunteer, you will not receive monetary compensation. However, you will gain valuable experience,
          networking opportunities, and access to select event areas.
        </p>
      )
    },
  },
  {
    text: 'Can I volunteer for more than one role or shift?',
    value: '7',
    content: () => {
      return (
        <p>
          While we appreciate your enthusiasm, it&apos;s recommended to focus on one role and shift to ensure the best
          experience and avoid overcommitment. We will be selecting ~100 volunteers to support the event to ensure each
          person can also go enjoy Devconnect while not on shift.
        </p>
      )
    },
  },
  {
    text: 'Will I have time to attend sessions or workshops as a volunteer?',
    value: '8',
    content: () => {
      return (
        <p>
          Volunteers will have the opportunity to experience parts of the event. However, your primary responsibility
          during your shift will be to support the event&apos;s smooth operation.
        </p>
      )
    },
  },
  {
    text: ' Are there any age restrictions for volunteers?',
    value: '9',
    content: () => {
      return (
        <p>
          Yes, volunteers must be at least 18 years old to participate in the event, or have the written approval of
          their Parent or Guardian.
        </p>
      )
    },
  },
  {
    text: 'Do I need to have experience in Ethereum or blockchain technology to volunteer?',
    value: '10',
    content: () => {
      return (
        <p>
          Prior experience in Ethereum or blockchain is not necessary. We value enthusiasm and a willingness to learn.
        </p>
      )
    },
  },
  {
    text: 'Can I volunteer with my friends or as a group?',
    value: '11',
    content: () => {
      return (
        <p>
          It would be highly valuable to share the volunteer application with friends, although the opportunity to
          volunteer together is not guaranteed.
        </p>
      )
    },
  },
  {
    text: 'Is transportation and accommodation provided for volunteers coming from out of town?',
    value: '12',
    content: () => {
      return (
        <p>
          Unfortunately, we cannot provide transportation or accommodation for volunteers. However, we can recommend
          nearby lodging options for your convenience.
        </p>
      )
    },
  },
  {
    text: 'Will there be breaks and meals provided during my volunteer shift?',
    value: '13',
    content: () => {
      return <p>Yes, volunteers will have scheduled breaks during their shifts, and meals will be provided on shift.</p>
    },
  },
  {
    text: 'What should I wear during my volunteer shift?',
    value: '14',
    content: () => {
      return <p>Comfortable attire and closed-toe shoes are generally recommended.</p>
    },
  },
  {
    text: 'Can I bring personal belongings with me during my shift?',
    value: '15',
    content: () => {
      return (
        <p>We recommend bringing only essential items, as secure storage options may be limited during the event.</p>
      )
    },
  },
]

// const waves = [
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
//   {
//     status: 'sold out',
//   },
// ]

export const Row = (props: any) => {
  return (
    <div className={css['row']}>
      <ComputerIcon />
      <p>
        <b className="uppercase">Work:</b> Tables, wifi, and outlets.
      </p>
    </div>
  )
}

export const Gallery = (props: any) => {
  return (
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
        <Image src={Cowork4} alt="Cowork space example" />
      </div>
      <div className={css['grid-item']}>
        <Image src={Cowork5} alt="Cowork space example" />
      </div>
    </div>
  )
}

const Cowork: NextPage = (props: any) => {
  //   const [soldOut, setSoldout] = React.useState(!waves.some(wave => wave.status === 'on sale now'))
  const accordionFAQRefs = React.useRef({} as { [key: string]: any })
  const router = useRouter()

  // TODO: Probably figure a way to move this to the accordion component, but also kinda dangerous to rely on nextjs router if we want to move it to lib later, so gotta think this through
  React.useEffect(() => {
    const path = router.asPath
    const anchor = path.split('#').slice(1).pop()

    if (anchor) {
      const decoded = decodeURI(anchor)

      if (accordionFAQRefs && accordionFAQRefs.current[decoded]) {
        accordionFAQRefs.current[decoded].open()
      }
    }
  }, [])

  return (
    <>
      <SEO title="Cowork" description="Coworking at Devconnect" />
      <Hero
        className={css['cowork-hero']}
        imageProps={{ src: CoworkHero, alt: 'Coworking space' }}
        backgroundStyle="fill"
        backgroundTitle="Co/work"
      >
        <div className={css['content']}>
          <div>
            <p className="uppercase extra-large-text bold secondary title">Coworking Space —</p>

            <p className={`${css['info']} uppercase big-text`}>
              <Link href="https://goo.gl/maps/NPWsfkTZCKs7WWM49">
                <u>Istanbul congress center (ICC)</u>
              </Link>{' '}
              📍
              <br />
              <span className="large-text">November 13th — 19th</span>
              <br />
              every day 09:00 - 20:00 (<b>NOTE: Sunday until 18:30</b>)
            </p>
            <br />
            <AnchorLink href="#first-come-first-serve" offset="32" className="hover-underline">
              <i className="bold">Space is limited:</i> <br />
              <i>First-come first-serve, even with a ticket</i>
            </AnchorLink>
          </div>

          <div className={css['call-to-action']}>
            <AnchorLink href="#ticketing" offset="32" className={`button orange-fill`}>
              <TicketIcon />
              Get Tickets
            </AnchorLink>

            <a
              href="https://goo.gl/maps/NPWsfkTZCKs7WWM49"
              target="_blank"
              rel="noreferrer"
              className={`button orange`}
            >
              <PinIcon />
              Directions
            </a>
          </div>
        </div>
      </Hero>

      <div className={css['cowork']}>
        <div className={`section fade-in-up`}>
          <div>
            <div className="border-bottom" id="general-info">
              <Tabs
                tabs={[
                  {
                    text: 'General info',
                    value: 'general-info',
                  },
                  {
                    text: 'Registration',
                    value: 'registration',
                  },
                  {
                    text: 'Ticketing Info',
                    value: 'ticketing',
                  },
                  {
                    text: 'Frequently Asked',
                    value: 'faq',
                  },
                  // {
                  //   text: 'Volunteer',
                  //   value: 'volunteer',
                  // },
                ]}
              />
            </div>
          </div>
          <div className={`${css['ticketing-alert']} clear-vertical`}>
            <Alert title="Ticket Information" color="blue">
              <b>These tickets will only grant you access to the EF-hosted Coworking Space at ICC in ISTANBUL.</b>
              <p>These tickets will NOT grant access to any other events taking place during Devconnect.</p>
            </Alert>
          </div>
          <div className="clear-vertical">
            <div className={`${css['body']}`} id="cowork-info">
              <div className={css['left']}>
                <p className={`uppercase bold section-header grey ${css['title']}`}>Coworking</p>
                <p className="big-text">
                  As part of our goal to foster <b>collaboration and community</b> throughout Devconnect week, we will
                  be hosting a cowork space for all those coming to Istanbul to use as a meeting point, a place to work,
                  and a space to relax.
                </p>
                <p className="big-text">
                  Even if you don&apos;t plan to attend any other events, the Devconnect Cowork venue is where you can
                  meet the people working in Ethereum, make new connections, and reunite with friends.
                </p>
                <p>
                  While all of the other events happening throughout the week will be independently-organized, this
                  coworking space will be officially hosted by the Devconnect team.
                </p>
              </div>

              <div className={`${css['right']}`}>
                <p className={`uppercase bold section-header grey ${css['title']}`}>What to Expect</p>

                <div className={css['what-to-expect']}>
                  <div className="row">
                    <ComputerIcon />
                    <p>
                      <b className="uppercase">Work:</b> Tables, wifi, and outlets.
                    </p>
                  </div>
                  <div className="row">
                    <WifiIcon />
                    <p>
                      <b className="uppercase">Wifi:</b> Devconnect IST (password: <b>blobsarecoming</b>)
                    </p>
                  </div>
                  <div className="row">
                    <PhotoIcon />
                    <p>
                      <b className="uppercase">Relax:</b> Comfy areas to relax alone or in a small group.
                    </p>
                  </div>
                  <div className="row">
                    <PeopleIcon />
                    <p>
                      <b className="uppercase">Collab:</b> Several{' '}
                      <Link
                        className="orange"
                        href="https://ef-events.notion.site/Devconnect-Cowork-Rooms-BookingGuidelines-d0730ca40be040f6994bb63ecfe4cd56"
                        indicateExternal
                      >
                        meeting rooms
                      </Link>{' '}
                      available for informal meetings
                    </p>
                  </div>
                  <div className="row">
                    <BoltIcon />
                    <p>
                      <b className="uppercase">Energize:</b> Light snacks and drinks will be offered throughout
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* <div className={css['door-tally']}>
            <iframe
              width="250"
              height="280"
              src="https://live.doortally.com/62581b66ad54e"
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <p className="tiny-text bold">Note: this does not account for a line outside the venue if there is one</p>
          </div> */}
          <div className={`${css['ticketing']} mb-4`} id="registration">
            <Accordion className={css['accordion']}>
              <AccordionItem
                alwaysOpen
                title={<p className="orange uppercase section-header bold">Registration</p>}
                id="registration"
              >
                <p className="big-text">
                  Have your{' '}
                  <b>
                    <Link href="https://zupass.org/#/login" indicateExternal>
                      Zupass
                    </Link>
                  </b>{' '}
                  ready to be scanned at the entry. When we have scanned and validated your ticket, you will receive a
                  wristband that will grant you access to the Cowork Space for the full week. Don&apos;t remove or lose
                  your wristband!
                </p>

                <br />

                <p className="big-text">
                  🙏 If you took the chance and purchased one of the specially designed Devconnect <b>Turkish towels</b>{' '}
                  with your Cowork ticket: they&apos;ll be ready for you to collect at the Cowork registration. 🧖‍♀️
                </p>

                <br />

                <p className="big-text">
                  <i>
                    💡 Space in the Cowork is limited, and there&apos;s a maximum amount of people who can be in the
                    Cowork at the same time. Entry to the Cowork will be granted on a first-come first-serve basis.
                  </i>
                </p>
              </AccordionItem>
            </Accordion>
          </div>

          <div>
            <div className={`${css['ticketing']}`} id="ticketing">
              <Accordion className={css['accordion']}>
                <AccordionItem
                  alwaysOpen
                  title={<p className="orange uppercase section-header bold">Ticketing information</p>}
                  id="ticketing"
                >
                  <div className="tab-content padding-bottom-less">
                    <p className="big-text">
                      <i>
                        All events during Devconnect are independently-hosted and it is their choice how they do
                        ticketing: open ticket sales, applications, pre-defined list of attendees, etc.
                      </i>
                    </p>
                    <p className="big-text">
                      <i>
                        For information on attending the independently-hosted events during the week of Devconnect, see
                        our&nbsp;
                        <Link href="/schedule">schedule</Link> and find the event you are interested in attending.
                      </i>
                    </p>
                    <div className="divider"></div>

                    <p className="big-text bold">
                      GA Tickets to the Coworking Space will be <span className="orange">€10</span>. We will accept ETH
                      & DAI payments via L1, Optimism, Arbitrum, Polygon ZkEVM; ETH payments on zkSync Era; and fiat
                      payments via Stripe.
                    </p>

                    <Link
                      href="https://ticketh.xyz/devconnect/cowork/"
                      className={`button sm wide orange ${css['link']}`}
                    >
                      <PlayIcon /> Get tickets
                    </Link>

                    {/* <div className="divider"></div>
                    <p className={`section-header grey bold margin-top-less`} id="first-come-first-serve">
                      First Come First Serve
                    </p>
                    <p className="big-text">
                      The Cowork Space will be open from:{' '}
                      <b>
                        November 13-19th, 2023 — <span className="orange">09:00 - 20:00</span>
                      </b>
                      .
                    </p>
                    <p className="big-text bold">
                      Cowork tickets are valid for the full week; however, admission is first-come first-serve and entry
                      is not guaranteed if we are at capacity.
                    </p>
                    <p>
                      In an effort to ensure maximum availability of the Cowork Space to the Ethereum community, we will
                      be over-distributing tickets. In other words, the total number of tickets we distribute will
                      exceed the max capacity of the Cowork Space at one time.
                    </p>
                    <p>
                      Therefore, entry to the Cowork Space will be granted on a first-come first-serve basis. In the
                      event that the venue is at full-capacity, even those with a wristband may be denied entry until
                      space becomes available.
                    </p> */}
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          <div className={`clear`}>
            <Gallery />
          </div>
        </div>

        <div className="section mb-8" id="faq">
          <div className={`${css['volunteer']}`}>
            <Accordion className={css['no-margin-top']}>
              <AccordionItem
                alwaysOpen
                title={<p className="orange uppercase section-header bold">Frequently Asked Questions</p>}
                id="volunteer"
              >
                <div className={`tab-content`} id="faq">
                  <Accordion className={css['no-margin-top']}>
                    {FAQDuringEvent.map(faq => {
                      const id = `faq-${faq.value}`
                      return (
                        <AccordionItem
                          key={faq.text}
                          title={<div className="bold">{faq.text}</div>}
                          id={id}
                          ref={el => (accordionFAQRefs.current[id] = el)}
                        >
                          {faq.content && faq.content()}
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </div>
              </AccordionItem>
            </Accordion>
          </div>
          {/* <div className="border-bottom padding-bottom"></div> */}
        </div>
      </div>

      {/* <div className="section margin-bottom" id="volunteer">
        <div className={`${css['volunteer']}`}>
          <Accordion className={css['accordion']}>
            <AccordionItem
              alwaysOpen
              title={<p className="orange uppercase section-header bold">Volunteering</p>}
              id="volunteer"
            >
              <p className="margin-bottom-less large-text">
                We&apos;re looking for volunteers! Volunteering is often a good first step into the Ethereum ecosystem.
                If you want to experience the event from behind the scenes and contribute to its success, apply here as
                a volunteer for the Devconnect Cowork.
              </p>
              <p className="big-text margin-bottom-less">
                As a volunteer, you will not receive monetary compensation. However, you will gain valuable experience,
                networking opportunities, and access to select event areas.
              </p>
              <Link
                indicateExternal
                href="https://docs.google.com/forms/d/e/1FAIpQLSeCDR0RyJaqhqxuSmfYnkdvx3GrTbJ2iBm0Td0BfiHnnm70qw/viewform"
                offset="32"
                className={`button sm orange margin-bottom-much-less`}
              >
                Volunteer Application Form
              </Link>
              <AccordionItem
                title={
                  <div className={`grey bold`} id="first-come-first-serve">
                    Frequently Asked Questions
                  </div>
                }
              >
                <Accordion className={css['no-margin-top']}>
                  {volunteerFAQ.map(faq => {
                    return (
                      <AccordionItem
                        key={faq.text}
                        title={<b>{faq.text}</b>}
                        id={faq.value}
                        alwaysOpen
                        // ref={faq.value === 'organizers' ? organizersRef : undefined}
                      >
                        {faq.content && faq.content()}
                      </AccordionItem>
                    )
                  })}
                </Accordion>
                <p className="margin-top-less bold tab-content margin-left-much-less">
                  If you have any other questions or need further information, please feel free to reach out to our
                  Volunteer Coordinator at{' '}
                  <Link indicateExternal href="mailto:kokeb.solomon@ethereum.org">
                    kokeb.solomon@ethereum.org
                  </Link>
                  <br /> <br />
                  We look forward to welcoming you to our passionate volunteer team for Devconnect!
                </p>
              </AccordionItem>
            </AccordionItem>
          </Accordion>
        </div>
      </div> */}

      <div className={css['map']}>
        <div className={css['directions']}>
          <div className={`section`}>
            <div className="clear-vertical">
              <p className={`large-text bold uppercase`}>Directions</p>
            </div>
          </div>
        </div>

        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12036.139979895823!2d28.9889354!3d41.0463638!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab772bb39b717%3A0x5488375fff580b2d!2sIstanbul%20Congress%20Center!5e0!3m2!1sen!2sdk!4v1690806459557!5m2!1sen!2sdk"
          width="100%"
          height="100%"
          loading="lazy"
        ></iframe>
      </div>
      <Footer />
    </>
  )
}

export default Cowork
