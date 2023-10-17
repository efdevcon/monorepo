import React, { ReactNode } from 'react'
import NextLink from 'next/link'
import LinkIndicator from 'assets/icons/link-indicator.svg'
import css from './link.module.scss'
// @ts-ignore
import AnchorLink from 'react-anchor-link-smooth-scroll'

type LinkProps = {
  children: ReactNode
  indicateExternal?: boolean // Whether or not to add an external link indicator (if the url is a FQDN)
  allowDrag?: boolean
  to: string
  [key: string]: any
}

export const useDraggableLink = (thresholdPixels = 5) => {
  const mouseDownPosition = React.useRef({ x: 0, y: 0 })
  const dragging = React.useRef(false)

  const onMouseDown = (e: any) => {
    dragging.current = false
    mouseDownPosition.current = { x: e.clientX, y: e.clientY }
  }

  const onMouseMove = (e: any) => {
    const deltaX = Math.abs(e.clientX - mouseDownPosition.current.x)
    const deltaY = Math.abs(e.clientY - mouseDownPosition.current.y)

    if (deltaX > thresholdPixels || deltaY > thresholdPixels) {
      dragging.current = true
    }
  }

  const onClickCapture = (e: any) => {
    if (dragging.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  return {
    onMouseDown,
    onMouseMove,
    onClickCapture,
    draggable: false,
  }
}

const WrappedLink = React.forwardRef(
  ({ children, indicateExternal, external, allowDrag, onClick, href, ...rest }: LinkProps, ref: any) => {
    const isMailTo = href.startsWith('mailto:')
    const linkAttributes = {
      ...rest,
      className: rest.className ? `${rest.className} ${css['link']} generic` : `${css['link']} generic`,
      ...useDraggableLink(),
      onClick,
    }

    if (isMailTo) {
      return (
        <a href={href} ref={ref} {...linkAttributes}>
          {children}
        </a>
      )
    }

    // Detects fully qualified domain name
    // One caveat to this approach is that you could link to a devcon.org page via a FQDN, and it would be detected as external:
    // Make sure to always use relative links for internal navigation
    const isExternal = href.match(/^([a-z0-9]*:|.{0})\/\/.*$/)

    // External links have no use of next Link component
    if (isExternal) {
      return (
        <a href={href} ref={ref} {...linkAttributes} target="_blank" rel="noopener noreferrer">
          <span className={css['link']} data-type="link-text">
            {children}
          </span>
          {indicateExternal && (
            <span className={css['external-indicator']} data-type="external-indicator">
              &nbsp;
              <LinkIndicator className={`${css['icon']} icon`} />
            </span>
          )}
        </a>
      )
    }

    if (href.startsWith('#')) {
      return (
        <AnchorLink href={href} {...linkAttributes} offset={125}>
          {children}
        </AnchorLink>
      )
    }

    return (
      <NextLink href={href} {...linkAttributes}>
        <span className={css['link']} data-type="link-text">
          {children}
        </span>
      </NextLink>
    )
  }
)

WrappedLink.displayName = 'LinkComponent'

export default WrappedLink
