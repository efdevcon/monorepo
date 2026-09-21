/**
 * Legal links at the bottom of Home: the same seven policy links as the
 * devcon.org footer, for every user. Deliberately a peer section (heading +
 * links), not an app footer; it is expected to move into a "Guide" section
 * with a Legal dropdown later, so everything it needs lives in this file.
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
    <section aria-labelledby="home-legal-title">
      <h2
        id="home-legal-title"
        className="mb-4 text-[20px] font-bold leading-[28.8px] tracking-[-0.5px] text-dc-fg2"
      >
        Legal
      </h2>
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
    </section>
  );
}
