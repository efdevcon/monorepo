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
import Spline from '@splinetool/react-spline'
import FooterBackground from 'assets/images/footer-background-triangles.png'
import PlayIcon from 'assets/icons/play.svg'
import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'
import { BlogReel } from 'common/components/blog-posts/BlogPosts'
import ShapesImage from 'assets/images/shapes.png'
import useDimensions from 'react-cool-dimensions'
import moment from 'moment'
// import BluePrint from 'assets/images/blueprint-bg.png'
// import VideoPlaceholder from 'assets/images/devconnect-video-placeholder.png'
// import YoutubeIcon from 'assets/icons/youtube.svg'
// import Cowork1 from 'assets/images/event-pictures/amsterdam-2022-event-picture-2.jpg'
// import Cowork2 from 'assets/images/event-pictures/amsterdam-2022-event-picture-6.jpg'
// import Cowork3 from 'assets/images/event-pictures/amsterdam-2022-event-picture-1.jpg'
// import Cowork4 from 'assets/images/event-pictures/amsterdam-2022-event-picture-5.jpg'
// import Cowork5 from 'assets/images/event-pictures/amsterdam-2022-event-picture-3.jpg'
// import bgUpper from 'assets/images/istanbul-bg/bg-upper.png'
// import bgCenter from 'assets/images/istanbul-bg/bg-center.png'
// import bgLower from 'assets/images/istanbul-bg/bg-lower.png'

// const Cube = dynamic(() => import('common/components/cube'), {
//   ssr: false,
// })

function getTimeUntilNovember13InTurkey() {
  // Create a Date object for the current date
  const currentDate = moment.utc()

  // Set the target date to November 13th, 8 am, turkey time
  const targetDate = moment.utc([2023, 10, 13, 8]) // Note: Month is 0-based, so 10 represents November.

  // Calculate the time difference in milliseconds
  const timeDifference = targetDate.diff(currentDate) - 1000 * 60 * 60 * 3 // add 3 hours for turkey time (UTC+3)

  // Calculate days, hours, minutes, and seconds
  const days = Math.max(Math.floor(timeDifference / (1000 * 60 * 60 * 24)), 0)
  const hours = Math.max(Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0)
  const minutes = Math.max(Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)), 0)
  const seconds = Math.max(Math.floor((timeDifference % (1000 * 60)) / 1000), 0)

  // Return the time difference as an object
  return {
    days,
    hours,
    minutes,
    seconds,
  }
}

const FAQ = [
  {
    text: 'How can I get involved?',
    value: 'how-involve',
    content: () => {
      return (
        <>
          <p className="bold">Volunteer</p>
          <p>
            We will be looking for volunteers for Devconnect Istanbul soon! Follow{' '}
            <Link indicateExternal href="https://twitter.com/efdevconnect">
              @EFDevconnect
            </Link>{' '}
            to stay up to date.
          </p>
          <p className="bold">Be an event host</p>
          <p>
            If you want to organize an event during Devconnect, head over to the{' '}
            <Link
              indicateExternal
              href="https://www.notion.so/ef-events/How-to-organize-an-event-during-Devconnect-4175048066254f48ae85679a35c94022?pvs=4"
            >
              event host guide
            </Link>
            .
          </p>
          <p className="bold">Media</p>
          <p>
            You want to cover Devconnect? Cool! Write us at press@devconnect.org for more info, or inquire to obtain a
            media pass that grants you access to the Devconnect Cowork{' '}
            <Link href="https://forms.gle/se7hd5Sz5x8Lkoj87 " indicateExternal>
              here
            </Link>
            . <span className="bold">We, the Devconnect team, are currently not seeking media partnerships.</span>
          </p>
        </>
      )
    },
  },
  {
    text: 'I need a Visa invitation letter, can you help?',
    value: 'visa',
    content: () => {
      return (
        <>
          <p>
            Yes, we are happy to help! You&apos;ll need a{' '}
            <Link href="/cowork" indicateExternal>
              ticket for the Devconnect Cowork
            </Link>{' '}
            first, then you can{' '}
            <Link href="https://forms.gle/zDQ6ax5Ukr75gDXt5" indicateExternal>
              fill out this form
            </Link>
            . You will hear back from us via email within 2 weeks.
          </p>
        </>
      )
    },
  },
  {
    text: 'How can I get a press pass?',
    value: 'press-pass',
    content: () => {
      return (
        <>
          <p>
            To inquire about obtaining a media pass for Devconnect,{' '}
            <Link href="https://forms.gle/se7hd5Sz5x8Lkoj87" indicateExternal>
              please fill out this form.
            </Link>{' '}
          </p>
          <p>
            A press pass grants access to the main Coworking Space that we are organizing. Please note that all other
            events are independently hosted, and a press pass does not guarantee entry into them.{' '}
          </p>
          <p>
            Ask us for more info about the event at <span className="bold">press@devconnect.org</span>.
          </p>
        </>
      )
    },
  },
  {
    text: 'Can I sponsor Devconnect?',
    value: 'sponsor',
    content: () => {
      return (
        <>
          <p>
            The Devconnect team, responsible for organizing the coworking space in ICC, is currently not seeking
            sponsorships.
          </p>
          <p>
            Some of the independent teams organizing the different events might be seeking sponsorships. You can find
            their websites and contact information <Link href="/schedule">on the curated Devconnect schedule</Link>.
          </p>
        </>
      )
    },
  },
  {
    text: 'Can I speak at Devconnect?',
    value: 'speak',
    content: () => {
      return (
        <>
          <p>
            The Devconnect team, responsible for organizing the coworking space in ICC, is not looking for speakers.
          </p>
          <p>
            Some of the independent teams organizing the different events might be looking for speakers or panelists.
            You can find their websites and contact information{' '}
            <Link href="/schedule">on the curated Devconnect schedule</Link>.
          </p>
        </>
      )
    },
  },
  {
    text: 'How do I know if Devconnect is for me?',
    value: 'howdoiknow',
    content: () => {
      return (
        <>
          <p>Devconnect is for you if you …</p>
          <ul>
            <li>want to meet people in Ethereum in person</li>
            <li>
              love to co-work in an incredible{' '}
              <Link
                href="https://www.notion.so/ef-events/Devconnect-IST-Coworking-space-e811d778b6a846989600d54158ff70cf?pvs=4"
                indicateExternal
              >
                Coworking Space
              </Link>{' '}
              next to others in the Ethereum space
            </li>
            <li>
              <b>dive</b> deep into topics you care about with other domain experts
            </li>
            <li>want to make progress on solving specific problems</li>
            <li>are passionate about creating more decentralized and fairer systems</li>
          </ul>
        </>
      )
    },
  },
  {
    text: 'How can I navigate through events and ticketing?',
    value: 'ticketingandevents',
    content: () => {
      return (
        <>
          <p>
            👉 Take a look at our curated <Link href="/schedule">events calendar here!</Link> You&apos;ll find brief
            descriptions of each event, an estimation of the difficulty level (beginner/intermediate/expert), and links
            to the event websites.
          </p>
          <p>
            👉 Follow{' '}
            <Link href="https://twitter.com/EFDevconnect" indicateExternal>
              @EFDevconnect
            </Link>{' '}
            on Twitter to stay in the loop. Follow the{' '}
            <Link href="https://twitter.com/i/lists/1663882935949295616" indicateExternal>
              Devconnect IST Twitter list
            </Link>{' '}
            for updates from event hosts.{' '}
          </p>
          <p>
            There will be many events in many different venues throughout Istanbul during the week. You can pick and
            choose based on your interests. <b>All events will be independently hosted, ticketed, and organized.</b>{' '}
            Some events will be free, some will be based on applications, and others may be ticketed with paid tickets.
          </p>
          <p>
            There will be an open{' '}
            <Link
              href="https://www.notion.so/ef-events/Devconnect-IST-Coworking-space-e811d778b6a846989600d54158ff70cf?pvs=4"
              indicateExternal
            >
              Coworking Space
            </Link>{' '}
            throughout the week with tickets available to all, organized by the Devconnect team. Once ticketing for the
            Cowork is open, you will find information here.
          </p>
        </>
      )
    },
  },
  {
    text: 'Why is Devconnect coming to Istanbul?',
    value: 'whyistanbul',
    content: () => {
      return (
        <>
          <p>
            In choosing Istanbul as the host city for Devconnect 2023, we aim to capitalize on its unique position as a
            bridge between East and West. Accessibility is a key priority, and Istanbul&apos;s major international
            airport, efficient local metro, and abundance of suitable venues for community events make it the perfect
            location for Devconnect 2023.
          </p>
          <p>
            The engaged local community and numerous student blockchain clubs in the region further strengthen our
            belief in the potential of this vibrant city. We are confident that Istanbul&apos;s unique blend of history,
            culture, and modernity will provide an inspiring backdrop for the global Ethereum developer community to
            come together, collaborate with these passionate groups, and drive innovation for Ethereum.
          </p>
        </>
      )
    },
  },
  // TODO: Add back in once the scholars program is announced
  // {
  //   text: 'Is there any financial support to help with travel costs?',
  //   value: 'financialsupport',
  //   content: () => {
  //     return (
  //       <>
  //         <p className="bold">Devconnect Scholars Program 🎓</p>
  //         <p>
  //           The Ethereum Foundation{' '}
  //           <Link href="https://twitter.com/EFNextBillion" indicateExternal>
  //             Next Billion Team
  //           </Link>{' '}
  //           offers the Devconnect Scholars Program to support talented individuals from diverse backgrounds in
  //           contributing their unique skills to unlock the potential of the Ethereum ecosystem.
  //         </p>
  //         <p>
  //           Who do you know that could significantly impact Ethereum&apos;s future and needs financial help to attend
  //           Devconnect in Istanbul?
  //         </p>
  //       </>
  //     )
  //   },
  // },
  {
    text: 'What about Devcon?',
    value: 'ondevcon',
    content: () => {
      return (
        <>
          <p>
            <Link href="https://twitter.com/EFDevcon" indicateExternal>
              Devcon
            </Link>{' '}
            will remain our principal event, and we&apos;re excited to bring Devcon 7 to Southeast Asia in 2024!
            Specific dates and location are coming soon. Read about why we&apos;re scheduling Devcon 7 for 2024 in
            Southeast Asia{' '}
            <Link href="https://blog.ethereum.org/2023/02/28/devcon-7-update" indicateExternal>
              here
            </Link>
            .
          </p>
        </>
      )
    },
  },
  {
    text: 'What is the difference between Devcon and Devconnect?',
    value: 'devconvsdevconnect',
    content: () => {
      return (
        <>
          <p>
            Devcon and Devconnect are the only two events organized by the Ethereum Foundation (yes, all the other
            amazing ETH events are community-run!). Both events are Ethereum-focused but serve different purposes.
          </p>
          <p>
            <b>Devcon</b> is a global Ethereum <i>family reunion</i>, a place to celebrate success and align on updates
            and direction. It is our principal event, all in one place with one big venue, and talks and workshops open
            to all. <Link href="devcon.org">Devcon 7 is scheduled for 2024 in Southeast Asia</Link>!
          </p>
          <p>
            <b>Devconnect</b> on the other hand, is a week to <i>make progress</i>, dive deep into specific topics among
            fellow experts, to co-work and collaborate. It is structurally entirely different from Devcon, and consists
            of many individual events, organized by you the community, that each cover one topic in depth.
          </p>
        </>
      )
    },
  },
]

const CodeOfConduct = () => {
  return (
    <div className={css['code-of-conduct']}>
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
        member, make a report at the registration desk or info booth, or submit a complaint to support@devconnect.org.
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
      <p>If you notice any violations of this Code of Conduct please report them to support@devconnect.org.</p>
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
        {/* <div className={css['footer-wrapper']} id="footer-wrapper">
          <div className={css['gradient-overlay']} id="footer-gradient"></div> */}

        <div className={className}>
          {/* <LogoBig className={css['background']} /> */}

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
                        {/* <div>
                        <label>First name</label>
                        <input type="text" name="name" />
                      </div> */}
                        <div>
                          <label>Email</label>
                          <input type="email" required name="email" />
                        </div>
                      </div>
                      <input type="hidden" name="sender" value="support@devconnect.org" />
                      <button className="button white sm">Subscribe to newsletter</button>
                    </form>
                  </div>
                  {/* <a target="_blank" rel="noreferrer" href="https://devcon.org" className={css['road-to-devcon']}>
                  <p className={`${css['title']} extra-large-text title`}>
                    A road to <br /> devcon event
                  </p>
                 <Image src={RoadToDevcon} alt="Road to devcon: man and dog" />
                </a>

                <p className={`${css['subtext']} dark-grey`}>Brought to you by the Ethereum Foundation</p>
                <p className={`${css['email']} medium-text`}>support@devconnect.org</p>
              </div>  */}

                  {/* <FooterMenu onClickMenuItem={onClickMenuItem} /> */}
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

                  <a
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setCodeOfConductModalOpen(!codeOfConductModalOpen)
                      }
                    }}
                    onClick={(e: React.SyntheticEvent) => {
                      e.preventDefault()

                      setCodeOfConductModalOpen(!codeOfConductModalOpen)
                    }}
                  >
                    Code of Conduct
                  </a>

                  <Link href="https://ethereum.org/en/privacy-policy/">Privacy policy</Link>
                  <Link href="https://ethereum.org/en/terms-of-use/">Terms of use</Link>
                  <Link href="https://ethereum.org/en/cookie-policy/">Cookie policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* </div> */}
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

const leftPadNumber = (number: number) => {
  if (number < 10) {
    return `0${number}`
  }

  return number
}

const Home: NextPage = (props: any) => {
  const [dateHovered, setDateHovered] = React.useState(false)
  const [hehe, setHehe] = React.useState(false)
  const organizersRef = React.useRef<any>()
  const splineRef = React.useRef<any>()
  const [mounted, setMounted] = React.useState(false)

  const [timeToEvent, setTimeToEvent] = React.useState<string | null>(null)

  React.useEffect(() => {
    const interval = setInterval(() => {
      const timeLeft = getTimeUntilNovember13InTurkey()

      setTimeToEvent(
        `${timeLeft.days}D:${leftPadNumber(timeLeft.hours)}H:${leftPadNumber(timeLeft.minutes)}M:${leftPadNumber(
          timeLeft.seconds
        )}S`
      )
    }, 1000)

    setMounted(true)

    return () => clearInterval(interval)
  }, [])

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
                    <p className={`${css['big-description']}`}>
                      Meet the builders of Ethereum
                      {/* <span className={css['red-underline']}>Meet the builders of Ethereum </span> */}
                      {/* <span>Devconnect</span> <span>is</span> <span className={css['red-underline']}>back!</span> */}
                    </p>

                    <p style={{ maxWidth: '575px', marginBottom: '12px', color: '#3b3b3b' }} className="big-text">
                      Devconnect is a week-long gathering of independent Ethereum events to learn, share, and{' '}
                      <b>make progress together</b>.
                    </p>

                    <div className={css['buttons']}>
                      <Link href="/cowork" className={`button orange-fill wide ${css['ticket-button']}`}>
                        <PlayIcon /> Get cowork tickets
                      </Link>

                      <Link href="#about" className={`button slick-purple ${css['video-recap-button']}`}>
                        <span>ISTANBUL, Türkiye</span>
                        <span>November 13-19, 2023</span>
                      </Link>
                    </div>
                  </div>
                  <div className={css['countdown']}>
                    <p className={css['countdown-header']}>Countdown</p>
                    <p className={css['countdown-number']}>{mounted ? timeToEvent : ''}</p>
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

          <Scene growVertically growNaturally id="istanbul" className={`${css['scene-istanbul']}`}>
            {/* <div className={`${css['background']} expand`}>
              <Image src={BluePrint} objectFit="contain" alt="Building outline" />
            </div> */}
            {/* <Observer> */}
            <div className="section" id="about">
              <h1 className="section-header clear-vertical" style={{ zIndex: 1 }}>
                <span className="orange">WHY DEVCONNECT</span>
              </h1>

              <div className={`columns margin-bottom`}>
                <div className="left fill-45">
                  <div>
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
                      rich history and culture of Istanbul.
                    </p>
                  </div>

                  <div className={`margin-top ${css['nowrap']}`}>
                    <Link href="/cowork" className={`button wide orange-fill ${css['cowork-tickets-button']}`}>
                      <PlayIcon className="icon large-text" /> COWORK TICKETS
                    </Link>
                    <Link
                      href="/city-guide"
                      className={`button wide orange margin-left-less ${css['city-guide-button']}`}
                      indicateExternal
                    >
                      City Guide
                    </Link>
                  </div>
                </div>
                <div className="right">
                  <div className="aspect">
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
            </div>
            {/* </Observer> */}

            <div className={css['background-cityscape']}>
              <ImageNew src={bgMerged} alt="Istanbul inspired cityscape background" />
            </div>

            {/* <div className={css['background-layers']}>
              <ImageNew src={bgUpper} alt="Istanbul inspired background" />
              <ImageNew src={bgLower} alt="Istanbul inspired background" />
              <ImageNew src={bgCenter} alt="Istanbul inspired background" />
            </div> */}
          </Scene>

          <Scene growNaturally growVertically className={`${css['scene-content']}`}>
            {/* <Observer> */}
            <div className="section margin-bottom" id="about">
              <h1 className="section-header orange margin-top-less margin-bottom-less">What to Expect</h1>

              <p className="extra-large-text margin-bottom-less">
                Multiple events, <u>independently</u> organized by the <span className="orange">community</span>.
                <br />
                Each event has a unique focus, ranging from <b>beginner-friendly to expert level.</b>
              </p>

              {/* <div className="margin-top margin-bottom"></div> */}

              <div className={css['topics-header']}>
                <p className="section-header uppercase grey">Topics Include</p>
                <Link href="/schedule" className={`orange button`} indicateExternal>
                  View Schedule
                </Link>
              </div>

              <div className="columns margin-top">
                <div
                  className={`${css['topics']} left fill-65 border-bottom padding-bottom-less`}
                  id="topics-container"
                >
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

                <div className={`right ${css['shapes-container']}`}>
                  <div className={css['shapes']}>
                    <ImageNew src={ShapesImage} alt="shapes image" />
                  </div>
                </div>
              </div>

              <div className="margin-top margin-bottom-less"></div>

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
              </div>
            </div>
            {/* </Observer> */}
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

          <Scene growVertically growNaturally className={`${css['scene-faq']}`}>
            {/* <Observer> */}
            <div className="section">
              <h1 className="section-header orange border-top padding-top-less">Blog Posts</h1>

              <BlogReel blogs={props.blogs} />

              <div className="padding-bottom-less border-bottom "></div>
            </div>
            {/* </Observer> */}
          </Scene>

          <Scene growVertically growNaturally className={`${css['scene-faq']} section`}>
            {/* <Observer> */}
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
            {/* </Observer> */}
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
  return {
    props: {
      blogs: await getBlogPosts(),
    },
    revalidate: 1 * 60 * 30, // 30 minutes, in seconds
  }
}

export default Home
