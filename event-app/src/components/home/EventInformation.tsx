"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy } from "lucide-react";
import { Link } from "@/routing";
import { LegalLinks } from "./LegalLinks";

/**
 * "Event information" at the bottom of Home: an always-open Essentials panel
 * (Wi-Fi, venue, help) beside a stack of disclosures for the longer guides,
 * the last of which holds the legal links. Basic first pass: every value is
 * a {Placeholder} until the real copy lands.
 *
 * Disclosures are native <details>/<summary>: keyboard, screen reader and
 * find-in-page support for free, no state to keep. Phones stack the panel
 * over the list; desktop puts them side by side.
 */

// TODO(event-info): replace every {Placeholder} with the real values.
const WIFI_SSID = "{SSID_NAME}";
const WIFI_PASSWORD = "{SSID_PW}";
const SUPPORT_FAQ_HREF = "#"; // {SUPPORT_FAQ_URL}
const ONBOARDING_HREF = "#"; // {ONBOARDING_AREA_URL}

const GUIDES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Venue & Facilities",
    body: "{Placeholder} Halls, cloakroom, prayer and quiet rooms, food courts, accessibility and first aid.",
  },
  {
    title: "Community",
    body: "{Placeholder} Community channels, side events and ways to meet other attendees.",
  },
  {
    title: "Safety & Conduct",
    body: "{Placeholder} Emergency contacts, safety tips and how to report a Code of Conduct concern.",
  },
];

const inlineLink =
  "font-bold text-dc-purple underline underline-offset-2 hover:no-underline";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard
          ?.writeText(value)
          .then(() => setCopied(true))
          .catch(() => {})
      }
      aria-label={copied ? "Copied" : label}
      // after:-inset-1.5 pads the 32px circle to a 44px hit area.
      className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dc-hairline bg-white transition-colors duration-150 ease-out after:absolute after:-inset-1.5 after:content-[''] hover:bg-dc-purple-wash"
    >
      {copied ? (
        <Check className="size-4 text-dc-purple" />
      ) : (
        <Copy className="size-4 text-dc-purple" />
      )}
    </button>
  );
}

function Essential({
  term,
  action,
  children,
}: {
  term: string;
  /** Optional control pinned to the row's right edge (e.g. copy). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 text-[14px] leading-5 text-dc-fg2 lg:text-[16px] lg:leading-6">
      <span>
        <span className="font-bold">{term}</span> {children}
      </span>
      {action}
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
            <Essential
              term="Wi-Fi:"
              action={<CopyButton value={WIFI_PASSWORD} label="Copy Wi-Fi password" />}
            >
              Connect to {WIFI_SSID} with password{" "}
              <span className="font-bold">{WIFI_PASSWORD}</span>
            </Essential>
            <Essential term="Venue address:">
              <Link href="/map" className={inlineLink}>
                View on map
              </Link>
            </Essential>
            <Essential term="Need help?">
              Read our{" "}
              <a
                href={SUPPORT_FAQ_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={inlineLink}
              >
                Support FAQ
                <ArrowUpRight className="ml-0.5 inline size-3.5 align-[-2px]" />
              </a>{" "}
              or visit the{" "}
              <a href={ONBOARDING_HREF} className={inlineLink}>
                Onboarding Area
              </a>
            </Essential>
          </ul>
        </div>

        <div className="flex flex-col">
          {GUIDES.map(({ title, body }) => (
            <Disclosure key={title} title={title}>
              <p className="text-[14px] leading-5 text-dc-muted">{body}</p>
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
