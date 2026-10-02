/**
 * Legal links: the same seven policy links as the devcon.org footer, for
 * every user. Rendered inside the "Legal" disclosure of Home's Event
 * information section (EventInformation.tsx).
 *
 * Hrefs are absolute canonical URLs (the app is on a different origin; the
 * bare devcon.org paths redirect to `/en/…/`). Plain anchors open in a new
 * tab like every other external link in the app.
 */

const LEGAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  {
    label: "Ticket Terms and Conditions",
    href: "https://devcon.org/en/terms-of-service/",
  },
  { label: "Privacy Notice", href: "https://devcon.org/en/privacy-notice/" },
  { label: "Code of Conduct", href: "https://devcon.org/en/code-of-conduct/" },
  {
    label: "Speaker Guidelines",
    href: "https://devcon.org/Devcon8-Speaker-Guidelines-2026.pdf",
  },
  {
    label: "Attendee Guidelines",
    href: "https://devcon.org/Devcon8-Attendee-Guidelines-2026.pdf",
  },
  {
    label: "Booth Guidelines",
    href: "https://devcon.org/Devcon8-Booth-Guidelines-2026.pdf",
  },
  { label: "Terms of Use", href: "https://ethereum.org/terms-of-use/" },
];

export function LegalLinks() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-3">
      {LEGAL_LINKS.map(({ label, href }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] leading-5 text-dc-purple underline-offset-2 hover:underline"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
