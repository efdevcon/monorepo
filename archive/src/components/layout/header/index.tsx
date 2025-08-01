"use client";

import React, { useEffect, useRef } from "react";
import { Menu } from "./menu";
import { Search } from "./search";
import { useOnOutsideClick } from "@/hooks/useOnOutsideClick";
import { Link } from "@/components/common/link";
import { Logo } from "./logo";
import css from "./header.module.scss";

export function Header() {
  const ref = useRef(null);
  const [foldoutOpen, setFoldoutOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  useOnOutsideClick(ref as any, () => setSearchOpen(false));

  const searchActive = searchOpen && !foldoutOpen;

  // Prevent page scroll when menu is open
  useEffect(() => {
    if (foldoutOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [foldoutOpen]);

  let headerContainerClass = `${css["header-container"]}`;
  let headerClass = `${css["header"]}`;

  if (foldoutOpen) headerClass += ` ${css["foldout-open"]}`;

  const body = (
    <header className={headerContainerClass}>
      <div id="header" className={headerClass} ref={ref}>
        <div className={css["menu-container"]}>
          <Link href="/">
            <Logo />
          </Link>

          <Menu
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            foldoutOpen={foldoutOpen}
            setFoldoutOpen={setFoldoutOpen}
          />
        </div>

        <Search open={searchActive} />
      </div>
    </header>
  );

  return body;
}
