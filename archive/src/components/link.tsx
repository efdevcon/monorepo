import React, { ReactNode } from "react";
import NextLink from "next/link";

interface Props {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
  isExternal?: boolean;
  className?: string;
}

export function Link(props: Props) {
  if (!props.href) return <>{props.children}</>;

  let className = "hover:underline";
  if (props.className) className += ` ${props.className}`;
  const isExternal =
    props.href.match(/^([a-z0-9]*:|.{0})\/\/.*$/) || props.isExternal;

  if (isExternal) {
    return (
      <NextLink
        className={className}
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={props.ariaLabel}
      >
        {props.children}
      </NextLink>
    );
  }

  return (
    <NextLink
      className={className}
      href={props.href}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </NextLink>
  );
}
