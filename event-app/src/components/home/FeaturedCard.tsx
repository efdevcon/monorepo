import { ArrowUpRight } from "lucide-react";

const TRAVEL_GUIDE_URL = "https://devcon.org/travel-guide";

/**
 * "Featured" section: static travel-guide card linking out to devcon.org.
 * Image is plan-trip-mumbai from the devcon site, optimized for the PWA.
 */
export function FeaturedCard() {
  return (
    <section>
      <h2 className="mb-4 font-heading text-xl font-extrabold leading-[26px] text-dc-fg2">
        Featured
      </h2>
      <a
        href={TRAVEL_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-[208px] w-full flex-col justify-end overflow-hidden rounded-xl border border-dc-hairline p-4 transition-[scale,box-shadow] duration-150 ease-out hover:shadow-sm motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97] lg:h-60 lg:max-w-[400px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/travel-guide-mumbai.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-black from-[14%] to-transparent" />
        <div className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/20 shadow-[inset_0_0_1px_rgba(255,255,255,0.66)] backdrop-blur-[1.5px] transition-colors duration-150 ease-out group-hover:bg-white/30">
          <ArrowUpRight className="size-4 text-dc-purple-fg" />
        </div>
        <div className="relative">
          <p className="font-heading text-lg font-bold tracking-[-0.5px] text-dc-purple-fg">
            Mumbai Travel Guide
          </p>
          <p className="mt-1 font-heading text-sm leading-5 text-dc-purple-fg">
            Access Devcon travel guides to get ready for India&rsquo;s energetic
            financial capital.
          </p>
        </div>
      </a>
    </section>
  );
}
