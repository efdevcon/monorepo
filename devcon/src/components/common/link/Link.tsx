import React, { ReactNode } from 'react'
import { default as NextLink } from 'next/link'
import NorthEast from 'assets/icons/north_east.svg'
import LinkIndicator from 'assets/icons/link-indicator.svg'
import css from './link.module.scss'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'

type LinkProps = {
  children: ReactNode
  indicateExternal?: boolean // Whether or not to add an external link indicator (only applies when the url is external)
  allowDrag?: boolean
  to: string // Gatsby legacy - can rename to href at some point if we want
  [key: string]: any
}

const Link = React.forwardRef(
  ({ children, indicateExternal, external, allowDrag, locale, to, ...rest }: LinkProps, ref: any) => {
    const dragging = React.useRef(false)

    const linkAttributes = {
      ...rest,
    }

    // Links can exist within a draggable context; we don't want drag events to be mistaken for clicks, so we preventDefault if the mouse is moving
    if (allowDrag) {
      linkAttributes.onMouseDown = () => {
        dragging.current = false
      }

      linkAttributes.onMouseMove = () => {
        dragging.current = true
      }

      linkAttributes.onClick = (e: React.SyntheticEvent) => {
        if (dragging.current) {
          e.preventDefault()
        }

        if (rest.onClick) rest.onClick(e)
      }

      linkAttributes.draggable = false
    }

    if (to.startsWith('mailto:')) {
      return (
        <a href={to} ref={ref} {...linkAttributes}>
          {children}
        </a>
      )
    }

    // Detects fully qualified domain name
    // One caveat to this approach is that you could link to a devcon.org page via a FQDN, and it would be detected as external.
    // Possible solutions: 1) Make sure to always use relative links for internal navigation 2) Add an escape hatch if "devcon.org" is in the url
    const isExternal = to.match(/^([a-z0-9]*:|.{0})\/\/.*$/)

    if (isExternal) {
      return (
        <a href={to} ref={ref} {...linkAttributes} target="_blank" rel="noopener noreferrer">
          {children}
          {indicateExternal && (
            <span className={css['external-indicator']} data-type="external-indicator">
              &nbsp;
              <LinkIndicator className={`${css['icon']} icon`} />
            </span>
          )}
        </a>
      )
    }

    if (to.startsWith('#')) {
      return (
        <AnchorLink href={to} {...linkAttributes} offset={125}>
          {children}
        </AnchorLink>
      )
    }

    return (
      <NextLink href={to} locale={locale} legacyBehavior>
        <a {...linkAttributes}>{children}</a>
      </NextLink>
    )
  }
)

Link.displayName = 'LinkComponent'

export { Link }
