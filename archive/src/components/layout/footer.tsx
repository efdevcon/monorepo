import React from "react";
import css from "./footer.module.scss";
import { ArrowUpIcon } from "@heroicons/react/24/solid";
import {
  BLOG_URL,
  DEVCON_URL,
  FORUM_URL,
  FOUNDATION_URL,
  SOCIAL_EMAIL,
  SOCIAL_FARCASTER,
  SOCIAL_GITHUB,
  SOCIAL_TWITTER,
  SOCIAL_YOUTUBE,
} from "@/utils/site";
import { IconTwitter } from "@/assets/icons/twitter";
import { IconGithub } from "@/assets/icons/github";
import { IconYouTube } from "@/assets/icons/youtube";
import { IconFarcaster } from "@/assets/icons/farcaster";
import { Link } from "@/components/link";
import LogoFoundation from "@/assets/logos/ef.svg";
import LogoArchive from "@/assets/logos/archive.svg";

interface Props {
  className?: string;
}

export function Footer(props: Props) {
  let className = `footer ${css["container"]} ${css["archive"]}`;
  if (props.className) className += ` ${props.className}`;

  return (
    <footer className={className}>
      <div className={css["top-section"]}>
        <div className={css["content"]}>
          <div className={css["col-1"]}>
            <Link href="/" className="max-w-[200px] min-w-[130px] block mb-8">
              <LogoArchive />
            </Link>

            <div className="flex flex-row gap-4 [&_svg]:size-5">
              <Link href={`https://x.com/${SOCIAL_TWITTER}`}>
                <IconTwitter />
              </Link>
              <Link href={`https://warpcast.com/~/channel/${SOCIAL_FARCASTER}`}>
                <IconFarcaster />
              </Link>
              <Link href={`https://github.com/${SOCIAL_GITHUB}`}>
                <IconGithub />
              </Link>
              <Link
                href={`https://www.youtube.com/c/${SOCIAL_YOUTUBE}/search?query=devcon`}
              >
                <IconYouTube />
              </Link>
            </div>
          </div>

          <div className={css["col-2"]}>
            <div>
              <p className="font-semibold">About Devcon —</p>
              <p>
                Devcon is the Ethereum conference for developers, researchers,
                thinkers, and makers.
              </p>
              <p>
                An intensive introduction for new Ethereum explorers, a global
                family reunion for those already a part of our ecosystem, and a
                source of energy and creativity for all.
              </p>
            </div>
          </div>

          <div className={css["col-3"]}>
            <ul className='flex flex-col gap-4 text-sm *:font-semibold'>
              <li>
                <Link href="watch">Watch</Link>
              </li>
              <li>
                <Link href="playlists">Playlists</Link>
              </li>
              <li>
                <Link href={DEVCON_URL}>Devcon</Link>
              </li>
              <li>
                <Link href={FORUM_URL}>Forum</Link>
              </li>
              <li>
                <Link href={BLOG_URL}>Blog</Link>
              </li>
            </ul>
          </div>

          <div className={css["col-4"]}>
            <div>
              <p className="font-semibold">Get in touch</p>
              <p className='mb-8'>{SOCIAL_EMAIL}</p>

              <div>Newsletter</div>
            </div>
          </div>

          <div className={css["col-5"]}>
            <div className={css["scroll-up"]}>
              <ArrowUpIcon style={{ cursor: "pointer" }} className="size-8"/>
            </div>
          </div>
        </div>
      </div>

      <div className={css["bottom-section"]}>
        <div className={css["content"]}>
          <div className={css["col-1"]}>
            <div className="font-xs">
              <p className="font-semibold">
                Crafted with passion ❤️ at the Ethereum Foundation
              </p>
              <p>
                © {new Date().getFullYear()} — Ethereum Foundation. All Rights
                Reserved.
              </p>
            </div>
          </div>

          <div className={css["col-3"]}>
            <Link href={FOUNDATION_URL} className="w-[125px]">
              <LogoFoundation />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
