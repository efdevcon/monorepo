"use client";

import React, { ReactNode } from "react";
import NextLink from "next/link";
import NorthEast from "@/assets/icons/north_east.svg";

type LinkProps = {
  children: ReactNode;
  indicateExternal?: boolean;
  allowDrag?: boolean;
  href: string;
  [key: string]: any;
};

export const Link = React.forwardRef(
  (
    {
      children,
      indicateExternal,
      external,
      allowDrag,
      href,
      ...rest
    }: LinkProps,
    ref: any
  ) => {
    const isMailTo = href.startsWith("mailto:");
    const dragging = React.useRef(false);

    const linkAttributes = {
      ...rest,
    };

    // Links can exist within a draggable context; we don't want drag events to be mistaken for clicks, so we preventDefault if the mouse is moving
    if (allowDrag) {
      linkAttributes.onMouseDown = () => {
        dragging.current = false;
      };

      linkAttributes.onMouseMove = () => {
        dragging.current = true;
      };

      linkAttributes.onClick = (e: React.SyntheticEvent) => {
        if (dragging.current) {
          e.preventDefault();
        }
      };

      linkAttributes.draggable = false;
    }

    if (isMailTo) {
      return (
        <a href={href} ref={ref} {...linkAttributes}>
          {children}
        </a>
      );
    }

    // Detects fully qualified domain name
    // One caveat to this approach is that you could link to a devcon.org page via a FQDN, and it would be detected as external.
    // Possible solutions: 1) Make sure to always use relative links for internal navigation 2) Add an escape hatch if "devcon.org" is in the url
    const isExternal = href.match(/^([a-z0-9]*:|.{0})\/\/.*$/);

    if (isExternal) {
      return (
        <a
          href={href}
          ref={ref}
          {...linkAttributes}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}{" "}
          {indicateExternal && <NorthEast style={{ fontSize: "0.5rem" }} />}
        </a>
      );
    }

    return (
      <NextLink href={href} ref={ref} {...linkAttributes}>
        {children}
      </NextLink>
    );
  }
);
