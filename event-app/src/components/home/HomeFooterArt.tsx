/**
 * Home-page sign-off: "Devcon 8 India" set in Chloe, filled with the India art
 * image and finished with the Figma inner shadow (inset 0 1px 4px + 0 2px 8px
 * rgba(22,11,43,.15)). Built as real SVG <text> — not a pre-rendered image —
 * so it scales fluidly with the viewport and the copy stays selectable by
 * assistive tech. SVG because CSS background-clip:text cannot carry a
 * glyph-following inner shadow, and CSS filter:url() on HTML text is
 * unreliable in Safari; precedent: SideArt in TicketSignIn.tsx.
 *
 * textLength pins the lockup to the full container width (like the Figma
 * full-bleed text) without depending on exact Chloe advance metrics. The
 * default lengthAdjust="spacing" stretches only the gaps BETWEEN glyphs —
 * never the glyph outlines ("spacingAndGlyphs" distorted the letterforms).
 */

const FILL_SRC = "/home/footer-art-fill.webp";

function InnerShadowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      {/* Invert the glyph alpha, blur+offset, tint, keep what falls back
          inside the glyphs. Two passes = Figma's two stacked inset shadows. */}
      <feComponentTransfer in="SourceAlpha" result="invert">
        <feFuncA type="table" tableValues="1 0" />
      </feComponentTransfer>
      <feGaussianBlur in="invert" stdDeviation="2" result="blur1" />
      <feOffset in="blur1" dx="0" dy="1" result="offset1" />
      <feFlood floodColor="#160b2b" floodOpacity="0.15" result="tint1" />
      <feComposite in="tint1" in2="offset1" operator="in" result="shadow1" />
      <feComposite in="shadow1" in2="SourceAlpha" operator="in" result="inner1" />
      <feGaussianBlur in="invert" stdDeviation="4" result="blur2" />
      <feOffset in="blur2" dx="0" dy="2" result="offset2" />
      <feFlood floodColor="#160b2b" floodOpacity="0.15" result="tint2" />
      <feComposite in="tint2" in2="offset2" operator="in" result="shadow2" />
      <feComposite in="shadow2" in2="SourceAlpha" operator="in" result="inner2" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="inner1" />
        <feMergeNode in="inner2" />
      </feMerge>
    </filter>
  );
}

const chloeTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-chloe), serif",
  fontWeight: 400,
  letterSpacing: "-0.03em",
};

export function HomeFooterArt() {
  return (
    <div className="pt-2">
      <p className="bg-gradient-to-r from-[#856abe] to-[#21a4bf] bg-clip-text text-center font-heading text-lg font-medium leading-6 tracking-[-0.25px] text-transparent lg:text-left">
        Gather with the curious, the builders, and the explorers
      </p>

      {/* Desktop: one full-width line */}
      <svg
        viewBox="0 0 1324 152"
        role="img"
        aria-label="Devcon 8 India"
        className="mt-6 hidden w-full lg:block"
      >
        <defs>
          <InnerShadowFilter id="footer-art-shadow-lg" />
          <clipPath id="footer-art-clip-lg">
            <text
              x="0"
              y="140"
              fontSize="150"
              textLength="1324"
              style={chloeTextStyle}
            >
              Devcon 8 India
            </text>
          </clipPath>
        </defs>
        <g filter="url(#footer-art-shadow-lg)">
          <g clipPath="url(#footer-art-clip-lg)">
            {/* Vertical placement mirrors the Figma crop (img y −194 of 737) */}
            <image
              href={FILL_SRC}
              x="0"
              y="-190"
              width="1324"
              height="744"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>
      </svg>

      {/* Mobile: two centered lines ("Devcon 8" sets the width) */}
      <svg
        viewBox="0 0 361 172"
        role="img"
        aria-label="Devcon 8 India"
        className="mt-4 w-full lg:hidden"
      >
        <defs>
          <InnerShadowFilter id="footer-art-shadow-sm" />
          <clipPath id="footer-art-clip-sm">
            <text
              x="0"
              y="80"
              fontSize="85"
              textLength="361"
              style={chloeTextStyle}
            >
              Devcon 8
            </text>
            <text
              x="180.5"
              y="166"
              fontSize="85"
              textAnchor="middle"
              style={chloeTextStyle}
            >
              India
            </text>
          </clipPath>
        </defs>
        <g filter="url(#footer-art-shadow-sm)">
          <g clipPath="url(#footer-art-clip-sm)">
            <image
              href={FILL_SRC}
              x="0"
              y="-20"
              width="361"
              height="230"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
