import React from "react";
import { Navigation } from "./navigation";
import { Foldout } from "./foldout";
import { Link } from "@/components/common/link";
import IconMenu from "@/assets/icons/menu.svg";
import IconCross from "@/assets/icons/cross.svg";
import SearchIcon from "@/assets/icons/search.svg";
import css from "./menu.module.scss";
import { BLOG_URL } from "@/utils/site";
import { DEVCON_URL, FORUM_URL } from "@/utils/site";

interface MenuProps {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  foldoutOpen: boolean;
  setFoldoutOpen: (open: boolean) => void;
}

interface ButtonProps {
  buttons: {
    key: string;
    icon: React.ReactNode;
    url?: string;
    className?: string;
    onClick?: () => void;
  }[];
}

export const NavigationItems = [
  {
    key: "devcon",
    title: "Devcon",
    url: DEVCON_URL,
  },
  {
    key: "forum",
    title: "Forum",
    url: FORUM_URL,
  },
  {
    key: "blog",
    title: "Blog",
    url: BLOG_URL,
  },
];

export const Left = () => {
  return (
    <div className={css["left"]}>
      {NavigationItems.map((i: any) => {
        return (
          <Link
            key={`top-${i.url}`}
            href={i.url}
            className={`hover-underline ${css["highlighted-link"]}`}
          >
            {i.title}
          </Link>
        );
      })}
    </div>
  );
};

const Buttons = (props: ButtonProps) => {
  return (
    <div className={css["buttons"]}>
      {props.buttons.map((button) => {
        let className = css["button"];

        if (button.url) {
          return (
            <Link key={button.key} href={button.url} className={className}>
              {button.icon}
            </Link>
          );
        }

        return (
          <button
            key={button.key}
            aria-label={button.key}
            className={`${className} plain ${button.className}`}
            onClick={button.onClick}
          >
            {button.icon}
          </button>
        );
      })}
    </div>
  );
};

export const Menu = (props: MenuProps) => {
  let buttons: ButtonProps["buttons"] = [
    {
      key: "search",
      icon: (
        <SearchIcon style={props.searchOpen ? { opacity: 0.5 } : undefined} />
      ),
      onClick: () => props.setSearchOpen(!props.searchOpen),
    },
    {
      key: "mobile-menu-toggle",
      icon: props.foldoutOpen ? (
        <IconCross style={{ width: "0.8em" }} />
      ) : (
        <IconMenu />
      ),
      onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
      className: css["mobile-only"],
    },
  ];

  return (
    <div className={css["menu"]}>
      <Left />

      <div className={css["right"]}>
        <Navigation />
      </div>

      <Buttons buttons={buttons} />

      {/* Mobile */}
      <Foldout
        foldoutOpen={props.foldoutOpen}
        setFoldoutOpen={props.setFoldoutOpen}
      >
        <div className={css["foldout-top"]}>
          <Left />
        </div>
        <Navigation setFoldoutOpen={props.setFoldoutOpen} mobile={true} />
      </Foldout>
    </div>
  );
};
