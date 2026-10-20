"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { LegalLinks } from "./LegalLinks";
import { openFeedback } from "@/data/feedback/feedbackState";

/**
 * "Event information" at the bottom of Home: an always-open Essentials panel
 * (Wi-Fi, venue, help) beside a stack of disclosures for the longer guides,
 * the last of which holds the legal links.
 *
 * Disclosures are native <details>/<summary>: keyboard, screen reader and
 * find-in-page support for free, no state to keep. Phones stack the panel
 * over the list; desktop puts them side by side.
 */

// TODO(event-info): Wi-Fi details are still to come.
const SUPPORT_FAQ_HREF =
  "https://ef-events.notion.site/Devcon-India-App-Support-FAQ-3ff638cdc4158059a5ccfbad9e243fb1";
const VENUE_MAPS_HREF = "https://maps.app.goo.gl/BN2AaTKh2cEy82Sy7";
const MEETING_ROOMS_HREF = "https://rooms.devcon.org/";
const GETTING_THERE_HREF = "https://devcon.org/en/travel-guide/#getting-there";
const SIDE_EVENTS_HREF = "https://devcon.org/en/road-to-devcon/#side-events";
const TELEGRAM_HREF = "https://t.me/+sitvvHw8D8EzN2Yx";
const X_HREF = "https://x.com/efdevcon";
const INSTAGRAM_HREF = "https://instagram.com/efdevcon";
const EMERGENCY_NUMBER = "108";

const inlineLink =
  "font-bold text-dc-purple underline underline-offset-2 hover:no-underline";

/** Inline link with the north-east arrow every outbound link in this section carries. */
function OutLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={inlineLink}>
      {children}
      <ArrowUpRight className="ml-0.5 inline size-3.5 align-[-2px]" />
    </a>
  );
}

const GUIDES: ReadonlyArray<{
  title: string;
  /** `term` is the bold lead-in; items without one are plain sentences. */
  items: ReadonlyArray<{ term?: string; body: ReactNode }>;
}> = [
  {
    title: "Venue & Facilities",
    items: [
      {
        term: "Getting there:",
        body: (
          <>
            Read our travel guide on{" "}
            <OutLink href={GETTING_THERE_HREF}>how to get to Jio World Centre</OutLink>
          </>
        ),
      },
      {
        term: "Meeting Rooms:",
        body: (
          <>
            Book a slot in our <OutLink href={MEETING_ROOMS_HREF}>booking calendar</OutLink>
          </>
        ),
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        term: "Side events:",
        body: (
          <>
            Check out our <OutLink href={SIDE_EVENTS_HREF}>curated list of Side Events</OutLink>{" "}
            happening in Mumbai
          </>
        ),
      },
      {
        term: "Connect with attendees:",
        body: (
          <>
            Join the official <OutLink href={TELEGRAM_HREF}>Devcon 8 India Telegram group</OutLink>
          </>
        ),
      },
      {
        body: (
          <>
            Follow <OutLink href={X_HREF}>us on X</OutLink>
          </>
        ),
      },
      {
        body: (
          <>
            Follow <OutLink href={INSTAGRAM_HREF}>us on Instagram</OutLink>
          </>
        ),
      },
    ],
  },
  {
    title: "Safety & Conduct",
    items: [
      {
        term: "Emergency:",
        body: (
          <>
            Call <OutLink href={`tel:${EMERGENCY_NUMBER}`}>{EMERGENCY_NUMBER}</OutLink> for
            emergency services
          </>
        ),
      },
      {
        term: "Evacuation:",
        body: (
          <>
            Look for the <span className="font-bold text-dc-green">green Exit signs</span> and
            follow staff instructions
          </>
        ),
      },
    ],
  },
];

function Essential({ term, children }: { term: string; children: ReactNode }) {
  return (
    <li className="text-[14px] leading-5 text-dc-fg2 lg:text-[16px] lg:leading-6">
      <span className="font-bold">{term}</span> {children}
    </li>
  );
}

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-dc-hairline last:border-b-0">
      <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold leading-6 text-dc-fg2 transition-colors duration-150 ease-out hover:text-dc-purple [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 shrink-0 text-dc-purple transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

export function EventInformation() {
  return (
    <section aria-labelledby="home-event-info-title">
      <h2
        id="home-event-info-title"
        className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2"
      >
        Event information
      </h2>
      <div className="flex flex-col gap-2 rounded-xl border border-dc-hairline bg-white p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:p-6">
        <div className="rounded-lg bg-dc-lavender p-4 lg:p-6">
          <h3 className="text-[16px] font-bold leading-6 text-dc-fg2 lg:text-[18px]">
            Essentials
          </h3>
          <ul className="mt-3 flex flex-col gap-4">
            <Essential term="Wi-Fi:">Coming soon</Essential>
            <Essential term="Venue address:">
              <OutLink href={VENUE_MAPS_HREF}>Jio World Centre, BKC, Mumbai</OutLink>
            </Essential>
            <Essential term="Day 1:">Tues 3 November 2026, 08:30 – 18:30</Essential>
            <Essential term="Need help?">
              Read our <OutLink href={SUPPORT_FAQ_HREF}>Support FAQ</OutLink>
            </Essential>
            <Essential term="Found a bug?">
              <button
                type="button"
                onClick={() => openFeedback()}
                className={`${inlineLink} cursor-pointer`}
              >
                Send feedback
              </button>{" "}
              to the team
            </Essential>
          </ul>
        </div>

        <div className="flex flex-col">
          {GUIDES.map(({ title, items }) => (
            <Disclosure key={title} title={title}>
              <ul className="flex list-disc flex-col gap-3 pl-5 text-[14px] leading-5 text-dc-fg2 marker:text-dc-muted">
                {items.map(({ term, body }, i) => (
                  <li key={term ?? i}>
                    {term && <span className="font-bold">{term}</span>} {body}
                  </li>
                ))}
              </ul>
            </Disclosure>
          ))}
          <Disclosure title="Legal">
            <LegalLinks />
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
