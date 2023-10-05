import { NextPage } from 'next'
import React from 'react'
import { Header, Footer } from './index'
import Hero from 'common/components/hero'
import CoworkHero from 'assets/images/cowork-alt-2.jpg'
import Cowork1 from 'assets/images/cowork-gallery/cowork-1.png'
import Cowork2 from 'assets/images/cowork-gallery/cowork-2.jpg'
import Cowork3 from 'assets/images/cowork-gallery/cowork-3.png'
import Cowork4 from 'assets/images/cowork-gallery/cowork-4.png'
import Cowork5 from 'assets/images/cowork-gallery/cowork-5.png'
import Image from 'next/legacy/image'
import css from './cowork.module.scss'
import PinIcon from 'assets/icons/pin.svg'
import TicketIcon from 'assets/icons/ticket.svg'
import { SEO } from 'common/components/SEO'
import Link from 'common/components/link/Link'
import { Tabs } from './archived-city-guide'
import Alert from 'common/components/alert'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'
import Head from 'next/head'
import SoldOut from 'assets/images/sold-out.png'
import Accordion, { AccordionItem } from 'common/components/accordion'
import SwipeToScroll from 'common/components/swipe-to-scroll'

const waves = [
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
  {
    status: 'sold out',
  },
]

const Cowork: NextPage = (props: any) => {
  const [soldOut, setSoldout] = React.useState(!waves.some(wave => wave.status === 'on sale now'))

  return (
    <>
      <SEO title="Cowork" description="Coworking at Devconnect" />
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      {/* <div
        style={{ position: 'fixed', top: '0px', width: '100vw', zIndex: 100, background: 'black' }}
        onClick={() => setSoldout(!soldOut)}
      >
        soldout: {soldOut.toString()}
      </div> */}
      <Hero
        className={css['cowork-hero']}
        imageProps={{ src: CoworkHero, alt: 'Coworking space' }}
        backgroundTitle="Co/work"
      >
        <div className={css['content']}>
          <div>
            <p className="uppercase extra-large-text bold secondary title">Co-Work —</p>

            <p className={`${css['info']} uppercase big-text`}>
              <Link href="https://www.google.com/maps?ll=52.375062,4.896171&z=16&t=m&hl=en&gl=DK&mapclient=embed&cid=18286565975988533039">
                <u>Beurs Van Berlage (BVB)</u>
              </Link>{' '}
              📍
              <br />
              <span className="large-text">APRIL 18th — 25th</span>
              <br />
              every day 09:00 AM - 11:00 PM
            </p>
            <br />
            <AnchorLink href="#first-come-first-serve" offset="32" className="hover-underline">
              <i className="bold">Space is limited:</i> <br />
              <i>First-come first-serve, even with a ticket</i>
            </AnchorLink>
          </div>

          <div className={css['call-to-action']}>
            <AnchorLink href="#ticketing" offset="32" className={`button orange`}>
              <TicketIcon />
              Ticketing Information
            </AnchorLink>

            <a
              href="https://goo.gl/maps/279RVpXu5jpCYtAU9"
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
                    text: 'Ticketing Info',
                    value: 'ticketing',
                  },
                ]}
              />
            </div>
          </div>

          <div className={`${css['ticketing-alert']} clear-vertical`}>
            <Alert title="Ticket Information" color="orange">
              <b>
                Co-work tickets will only grant you access to the Co-work Space at the Beurs van Berlage venue in
                Amsterdam.
              </b>
              <br />
              These tickets will NOT grant access to any other events taking place during Devconnect.
            </Alert>
          </div>

          <div className="clear-vertical">
            <div className={`${css['body']}`}>
              <div className={css['left']}>
                <p className={`uppercase bold large-text ${css['title']}`}>Co-work</p>
                <p className={`uppercase bold`}>Devconnect</p>
                <p className="big-text">
                  As part of our goal to foster <b>collaboration and community</b> throughout Devconnect week, we will
                  be hosting a co-work space for all those coming to Amsterdam to use as a meeting point, a place to
                  work, and a space to relax.
                </p>
                <p>
                  While all of the other events happening throughout the week will be independently-organized, this
                  co-work space will be officially hosted by the <b>Devconnect</b> team.
                </p>
              </div>

              <div className={`${css['right']}`}>
                <div className={css['what-to-expect']}>
                  <p className={`big-text bold uppercase ${css['title']}`}>What to expect?</p>
                  <p>
                    <b>Work.</b> Tables, wifi, and outlets.
                  </p>

                  <p>
                    <b>Relax.</b> Comfy areas to relax alone or in a small group.
                  </p>
                  <p>
                    <b>Collaborate.</b> Several meeting rooms available for informal meetings (first-come first-serve).
                  </p>

                  <p>
                    <b>Energize.</b> Light snacks and drinks will be offered throughout.
                  </p>
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

          <div>
            <div className={`${css['ticketing']}`} id="ticketing">
              <Accordion className={css['accordion']}>
                <AccordionItem alwaysOpen title="Ticketing information" id="ticketing">
                  <div className="tab-content small-text">
                    <p>
                      All events during Devconnect are independently hosted and it is their choice how they do
                      ticketing: open ticket sales, applications, pre-defined list of attendees, etc.
                    </p>
                    <p>
                      For information on attending the independently-hosted events during the week of Devconnect, see
                      our&nbsp;
                      <Link href="/schedule">schedule</Link> and find the event you are interested in attending.
                    </p>
                    <div className="divider"></div>
                    <div className={css['current-wave']}>
                      <p className={`header small-text bold no-clearance`} id="waves">
                        Ticketing
                      </p>
                    </div>
                    <br />
                    {/* <br />
                    <div className={css['current-wave']}>
                      <p className={`${css['wave-number']} bold uppercase`}>Current Wave — 9 of 9</p>
                    </div>
                    <div className={`${css['waves-info']}`}>
                      <div className={css['waves']}>
                        {waves.map(({ status }, index) => {
                          let classNameTag = 'tag'
                          let className = css['wave']

                          if (status === 'sold out') {
                            classNameTag += ` red`
                            className += ` ${css['wave-sold-out']}`
                          }

                          if (status === 'on sale now') {
                            classNameTag += ` blue`
                            className += ` ${css['wave-on-sale']}`
                          }

                          const waveIsOnSale = status === 'on sale now'

                          const body = (
                            <>
                              <div className="medium-text">Ticket Wave 0{index + 1}</div>
                              <div className={`${classNameTag} tiny-text bold`}>{status}</div>
                            </>
                          )

                          if (waveIsOnSale) {
                            return (
                              <Link
                                href="https://ticketh.xyz/devconnect/cowork"
                                key={index}
                                className={`${className} small-text-fixed bold`}
                              >
                                {body}
                              </Link>
                            )
                          } else {
                            return (
                              <div key={index} className={`${className} small-text-fixed bold`}>
                                {body}
                              </div>
                            )
                          }
                        })}
                      </div>
                    </div> */}
                    <p>
                      {/* <b>
                        Tickets are fully sold out, but you can sign up for the waitlist for a chance to get a ticket
                        should the venue not be fully utilized over the week.
                      </b>{' '} */}
                      <b>
                        If the co-work venue is not at capacity tickets may become available over the course of the
                        week.
                      </b>
                      &nbsp;
                      <b>
                        If you are without a ticket or need a private co-working space, here&apos;s a list of discounted{' '}
                      </b>
                      <Link
                        href="https://ef-events.notion.site/Co-working-spaces-for-Devconnect-attendees-3028a648d3714d1587be6f70b8d04ff5"
                        indicateExternal
                      >
                        alternative co-working spaces
                      </Link>
                      .
                    </p>

                    <p>
                      Tickets to the Co-work Space will be €1. We will accept fiat payments via Stripe and ETH &amp; DAI
                      payments via two L2s: Optimism and Arbitrum. To keep costs low for everyone, we will only be
                      accepting payments on L2s.{' '}
                    </p>

                    <Link
                      indicateExternal
                      href="https://ticketh.xyz/devconnect/cowork/"
                      className="button sm orange-fill"
                    >
                      Get tickets here
                    </Link>
                    {/* <div style={{ position: 'relative' }}>
                      <div className={css['sold-out']}>
                        <Link
                          indicateExternal
                          href="https://ticketh.xyz/devconnect/cowork/"
                          className="button sm blue-fill"
                        >
                          Sign up for waitlist
                        </Link>

                        <Image src={SoldOut} alt="Sold out sticker" />
                      </div>
                    </div> */}

                    {/* {!soldOut && (
                      <>
                        <Link
                          indicateExternal
                          href="https://ticketh.xyz/devconnect/cowork/"
                          className="button sm orange-fill"
                        >
                          Sign up for waitlist
                        </Link>
                        <br />
                      </>
                    )} */}
                    <div className="divider"></div>
                    <p className={`header small-text bold`} id="first-come-first-serve">
                      First Come First Serve
                    </p>
                    <p>
                      The Co-work Space will be open from: <b>April 18-25th, 2022 09:00 - 23:00.</b>
                    </p>
                    <p>
                      Co-work ticket are valid for the full week; however, admission is first-come first-serve and entry
                      is <i>not</i> guaranteed.
                    </p>
                    <p className="bold">
                      In an effort to ensure maximum availability of the Co-work Space to the Ethereum community, we
                      will be over-distributing tickets. In other words, the total number of tickets we distribute will
                      exceed the max capacity of the Co-work Space at one time.
                    </p>
                    <p className="bold">
                      Therefore, entry to the Co-work Space will be granted on a first-come first-serve basis. In the
                      event that the venue is at full-capacity, even those with a wristband may be denied entry until
                      space becomes available.
                    </p>
                    <p>
                      From April 22-24th, ETHGlobal will be hosting a Hackathon within the Beurs van Berlage venue, and
                      therefore we will have more limited capacity on these days.
                    </p>
                    <p className={`header small-text bold`}>Covid-19 Policy</p>
                    <p>
                      COVID-19 regulations are constantly changing around the world. We will be following the COVID-19
                      policy of the Netherlands and the Beurs van Berlage venue during the week of Devconnect.
                    </p>
                    <p>
                      <b>
                        This may include verifying IDs to match any required proof of negative test or COVID-19
                        Vaccination, if they are required to enter the venue at the time of the event.
                      </b>
                    </p>
                    <p className={`header small-text bold`}>Registration</p>
                    <p>
                      If you purchase a ticket, a QR-code will be emailed to you 3 days before the event, and you may
                      use that to check-in.
                    </p>
                    <p>
                      Depending on the Netherlands&apos; COVID measures at the time of the event, you may be required to
                      show proof of COVID-19 vaccination or a negative test from 48-72 hours prior to check-in. This
                      will also need to be cross-checked with a matching ID, so please bring matching ID in the event we
                      have to screen for COVID-19 measures.
                    </p>
                    <p>
                      When your ticket is scanned &amp; approved, you will be given a wristband. This wristband is how
                      you will access the Co-work Space for the full week, so we advise that you wear it immediately
                      upon receipt &amp; do not lose or remove the wristband unless you no longer plan on attending the
                      Co-work Space.
                    </p>
                    <p>If you lose your wristband, you will not be granted re-entry to the venue.</p>
                    <p>
                      <b>Once you&apos;re checked in, head over to our Swag Desk to snag some sweet Devconnect swag!</b>
                    </p>
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <div className={`clear`}>
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
          </div>
        </div>
      </div>

      <div className={css['map']}>
        <div className={css['directions']}>
          <div className={`section`}>
            <div className="clear-vertical">
              <p className={`large-text bold uppercase`}>Directions</p>
            </div>
          </div>
        </div>

        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2435.7437976717924!2d4.893982616106426!3d52.37506545471201!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c609c787f17ca7%3A0xfdc6eede688a772f!2sBeurs%20van%20Berlage!5e0!3m2!1sen!2sdk!4v1643376954216!5m2!1sen!2sdk"
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
