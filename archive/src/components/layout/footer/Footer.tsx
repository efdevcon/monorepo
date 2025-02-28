"use client";

import React from "react";
import css from "./footer.module.scss";
import IconArrowUpward from "@/assets/icons/arrow_upward.svg";
import IconGithub from "@/assets/icons/github.svg";
import IconTwitter from "@/assets/icons/twitter.svg";
import IconFarcaster from "@/assets/icons/farcaster.svg";
import IconYoutube from "@/assets/icons/youtube.svg";
import smallLogo from "@/assets/images/ef-logo.svg";
import ArchiveLogo from "@/assets/logos/archive.svg";
import { Newsletter } from "@/components/common/newsletter";
import { Link } from "@/components/common/link";
import {
  BLOG_URL,
  DEVCON_URL,
  FORUM_URL,
  FOUNDATION_URL,
  SOCIAL_EMAIL,
  SOCIAL_FARCASTER,
} from "@/utils/site";

type SocialMediaProps = {
  className?: string;
};

export const SocialMedia = ({
  className: extraClassName,
}: SocialMediaProps) => {
  let className = css["social-media"];

  if (extraClassName) className += ` ${extraClassName}`;

  return (
    <div className={className}>
      <Link href="https://twitter.com/efdevcon">
        <IconTwitter style={{ cursor: "pointer" }} />
      </Link>
      <Link href={`https://warpcast.com/~/channel/${SOCIAL_FARCASTER}`}>
        <IconFarcaster />
      </Link>
      <Link href="https://github.com/efdevcon">
        <IconGithub style={{ cursor: "pointer" }} />
      </Link>
      <Link href="https://www.youtube.com/c/EthereumFoundation/search?query=devcon">
        <IconYoutube style={{ cursor: "pointer" }} />
      </Link>
    </div>
  );
};

export const Footer = () => {
  return (
    <footer className={`footer ${css["container"]} ${css["archive"]}`}>
      <div className={css["top-section"]}>
        <div className={css["content"]}>
          <div className={css["col-1"]}>
            <Link
              href={`/`}
              style={{ maxWidth: "200px", minWidth: "130px", display: "block" }}
            >
              <ArchiveLogo />
            </Link>

            <SocialMedia />
          </div>

          <div className={css["col-2"]}>
            <div>
              <p className="semi-bold">About Devcon —</p>
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
            <ul className={css["list"]}>
              <li className="semi-bold">
                <Link href="/watch" className="plain hover-underline">
                  Watch
                </Link>
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
            <div className={css["contact"]}>
              <p className="semi-bold">Get in touch</p>
              <p className={css["email-1"]}>{SOCIAL_EMAIL}</p>

              <div className={css["newsletter"]}>
                <Newsletter id="footer_newsletter_email" />
              </div>
            </div>
          </div>

          <div className={css["col-5"]}>
            <div className={css["scroll-up"]}>
              <IconArrowUpward
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={css["bottom-section"]}>
        <div className={css["content"]}>
          <div className={css["col-1"]}>
            <div className="font-xs">
              <p className="bold">
                Crafted with passion ❤️ at the Ethereum Foundation
              </p>
              <p>
                © {new Date().getFullYear()} — Ethereum Foundation. All Rights
                Reserved.
              </p>
            </div>
          </div>

          <div className={css["col-3"]}>
            <Link className={css["small-logo"]} href={FOUNDATION_URL}>
              <img src={smallLogo} alt="Ethereum Foundation" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
