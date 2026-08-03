import React from 'react'
import IconArrowDown from 'assets/icons/arrow_drop_down.svg'
import { Link } from 'components/common/link'
import css from './navigation.module.scss'
import { Link as LinkType } from 'types/Link'
// import ArrowCollapse from 'assets/icons/arrow_collapse.svg'
// import ArrowDropdown from 'assets/icons/arrow_drop_down.svg'
import Image from 'next/legacy/image'
import useNavigationData from '../../useNavigationData'
import IconCalendar from 'assets/icons/calendar.svg'
import IconWatch from 'assets/icons/on_demand_video.svg'
import { Button } from 'lib/components/button'
import AppIcons from 'assets/icons/app-icons.svg'
import { ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/router'
import dc8Logo from 'assets/images/dc-8/dc8-logo.png'
import NextImage from 'next/image'
import { LanguageToggle } from '../language-toggle'

const Mobile = (props: any) => {
  const navigationData = useNavigationData()
  const router = useRouter()
  const currentPath = router.pathname

  const foldableItems = navigationData.site.filter((i: LinkType) => i.links && i.links.length > 0)

  // Find which group contains the current page and auto-open it
  const initialOpen = React.useMemo(() => {
    for (const item of foldableItems) {
      if (item.links?.some((link: LinkType) => link.url && !link.url.startsWith('http') && currentPath.replace(/\/$/, '') === link.url.replace(/\/$/, ''))) {
        return item.title
      }
    }
    return undefined
  }, [currentPath])

  const [openItem, setOpenItem] = React.useState<string | undefined>(initialOpen)

  const closeFoldout = () => {
    props.setFoldoutOpen(false)
  }

  return (
    <div className={css['mobile-navigation']}>
      <div className={css['mobile-nav-logo']}>
        <NextImage src={dc8Logo} alt="Devcon 8 India" width={145} height={64} />
        <LanguageToggle />
      </div>
      <div className={css['mobile-nav-items']}>
        {foldableItems.map((i: LinkType) => {
          const open = openItem === i.title
          const sections = i.links ? groupLinksIntoSections(i.links) : []

          return (
            <div key={i.title} className={css['mobile-nav-group']}>
              <button
                className={css['mobile-nav-toggle']}
                onClick={() => setOpenItem(open ? undefined : i.title)}
                aria-expanded={open}
              >
                {i.title}
                <ChevronDown
                  size={20}
                  className={css['nav-chevron']}
                  style={{
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              <div className={`${css['mobile-accordion-panel']} ${open ? css['mobile-accordion-panel-open'] : ''}`}>
                <div className={css['mobile-accordion-inner']}>
                  <div className={css['mobile-accordion-content']}>
                    <FoldoutContent sections={sections} currentPath={currentPath} onLinkClick={closeFoldout} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type Section = {
  header: string
  headerIcon?: React.ComponentType<{ size?: number; className?: string }>
  columns?: number
  items: LinkType[]
}

function groupLinksIntoSections(links: LinkType[]): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const c of links) {
    if (c.type === 'header') {
      current = { header: c.title, headerIcon: c.icon, columns: c.columns, items: [] }
      sections.push(current)
    } else if (current) {
      current.items.push(c)
    } else {
      if (!sections.length) sections.push({ header: '', items: [] })
      sections[0].items.push(c)
    }
  }

  return sections
}

const FoldoutContent = ({ sections, currentPath, onLinkClick }: { sections: Section[]; currentPath?: string; onLinkClick?: () => void }) => (
  <div className={css['foldout-sections']}>
    {sections.map((section, sIdx) => (
      <div key={sIdx} className={css['foldout-section']}>
        {section.header && (
          <div className={css['foldout-header']}>
            {section.headerIcon && <section.headerIcon size={20} className={css['foldout-header-icon']} />}
            {section.header}
          </div>
        )}
        <div className={`${css['foldout-items']} ${section.columns === 2 ? css['foldout-items-two-col'] : ''}`}>
          {section.items.map((c, cIdx) => {
            const isExternal = c.url?.startsWith('http')
            const isActive = currentPath && c.url && !isExternal &&
              currentPath.replace(/\/$/, '') === c.url.replace(/\/$/, '')
            return (
              <Link
                key={cIdx}
                className={`${css['foldout-link-item']} ${isActive ? css['foldout-link-active'] : ''} plain`}
                to={c.url}
                onClick={onLinkClick}
              >
                <span className="inline-flex items-center gap-1">
                  {c.title}
                  {isExternal && <ArrowUpRight size={16} strokeWidth={2} />}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)

const DEFAULT_FOLDOUT_WIDTH = 320
// Card chrome around the content on each axis: 12px padding + 1px border, both sides (border-box)
const FOLDOUT_CHROME = 26
// Matches the .foldout-closing transition duration in navigation.module.scss
const FOLDOUT_CLOSE_MS = 150

export const Navigation = (props: any) => {
  const navigationData = useNavigationData()
  const router = useRouter()
  const currentPath = router.pathname
  // Hover/focus target; null while the menu plays its close transition
  const [activeItem, setActiveItem] = React.useState<string | null>(null)
  // Last opened item; keeps content mounted during the close transition
  const [renderedItem, setRenderedItem] = React.useState<string | null>(null)
  const [exitingItem, setExitingItem] = React.useState<string | null>(null)
  const [direction, setDirection] = React.useState<'left' | 'right'>('right')
  // True once the open menu has switched items; the content swap animation
  // only runs then — first open rides the card's foldoutAppear instead.
  // (Not derived from exitingItem: its onAnimationEnd cleanup would strip
  // the enter class mid-animation.)
  const [isSwap, setIsSwap] = React.useState(false)
  // Suppresses the position/size morph for keyboard-initiated changes
  const [instant, setInstant] = React.useState(false)
  const [menuX, setMenuX] = React.useState(0)
  const [menuHeight, setMenuHeight] = React.useState<number | null>(null)
  const prevActiveRef = React.useRef<string | null>(null)
  const activeIndexRef = React.useRef<number>(-1)
  const itemRefs = React.useRef<(HTMLLIElement | null)[]>([])
  const activeContentRef = React.useRef<HTMLDivElement | null>(null)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const instantTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Escape returns focus to the nav item; that focus event must not reopen the menu
  const suppressNextFocusRef = React.useRef(false)

  // Measure the active content after it mounts/swaps, before paint
  React.useLayoutEffect(() => {
    if (renderedItem && activeContentRef.current) {
      setMenuHeight(activeContentRef.current.offsetHeight + FOLDOUT_CHROME)
    }
  }, [renderedItem])

  // Keep the menu anchored to its nav item across window resizes
  React.useEffect(() => {
    const onResize = () => {
      const el = itemRefs.current[activeIndexRef.current]
      if (el) setMenuX(el.offsetLeft)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current)
    }
  }, [])

  if (props.mobile) {
    return <Mobile {...props} />
  }

  // Sort: items with children first, then the rest (stable, so authored order is display order)
  const sorted = [...navigationData.site].sort((a: LinkType, b: LinkType) => {
    const aHas = a.links && a.links.length > 0 ? 0 : 1
    const bHas = b.links && b.links.length > 0 ? 0 : 1
    return aHas - bHas
  })

  const foldableItems = sorted.filter((i: LinkType) => i.links && i.links.length > 0)
  const plainItems = sorted.filter((i: LinkType) => !i.links || i.links.length === 0)

  const handleSetActive = (title: string, source: 'pointer' | 'keyboard' = 'pointer') => {
    // Re-hover during the close transition retargets it back open
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setActiveItem(title)

    if (source === 'keyboard') {
      if (instantTimerRef.current) clearTimeout(instantTimerRef.current)
      setInstant(true)
      instantTimerRef.current = setTimeout(() => setInstant(false), 100)
    }

    const prev = prevActiveRef.current
    if (prev === title) return

    const nextIdx = foldableItems.findIndex((i: LinkType) => i.title === title)
    const el = itemRefs.current[nextIdx]
    if (el) setMenuX(el.offsetLeft)
    activeIndexRef.current = nextIdx

    if (prev && prev !== title) {
      const prevIdx = foldableItems.findIndex((i: LinkType) => i.title === prev)
      setDirection(nextIdx > prevIdx ? 'right' : 'left')
      setExitingItem(prev)
      setIsSwap(true)
    } else {
      setIsSwap(false)
    }

    setRenderedItem(title)
    prevActiveRef.current = title
  }

  const handleClearActive = () => {
    setActiveItem(null)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setRenderedItem(null)
      setExitingItem(null)
      setIsSwap(false)
      setMenuHeight(null)
      prevActiveRef.current = null
      activeIndexRef.current = -1
      closeTimerRef.current = null
    }, FOLDOUT_CLOSE_MS)
  }

  const renderedNavItem = renderedItem ? foldableItems.find((i: LinkType) => i.title === renderedItem) : null
  const renderedSections = renderedNavItem?.links?.length ? groupLinksIntoSections(renderedNavItem.links) : []
  const menuWidth = renderedNavItem?.foldoutWidth ?? DEFAULT_FOLDOUT_WIDTH

  const exitingNavItem = exitingItem ? foldableItems.find((i: LinkType) => i.title === exitingItem) : null
  const exitingSections = exitingNavItem?.links?.length ? groupLinksIntoSections(exitingNavItem.links) : []
  const exitingWidth = exitingNavItem?.foldoutWidth ?? DEFAULT_FOLDOUT_WIDTH

  const renderPlainLink = (i: LinkType) => {
    let className = `${css['foldout-link']} bold`

    if (i.type === 'button') {
      return (
        <button key={i.title} onClick={i.onClick} className={className}>
          {i.title}
        </button>
      )
    }

    if (i.highlight) {
      className += ` button ${css[i.highlight as any]}`

      if (['app'].includes(i.highlight)) {
        className += ` rounded-purple`
      } else {
        className += ` black`
      }
    } else {
      className += ` plain`
    }

    if (i.highlight === 'tickets') {
      return (
        <Link
          to={i.url}
          className="ml-3 bg-[#7235ed] text-white font-bold text-sm rounded-full px-4 py-2 shadow hover:scale-[1.02] transition-transform"
        >
          {i.title}
        </Link>
      )
    }

    if (i.highlight === 'archive') {
      return (
        <Link to={i.url}>
          <Button color="purple-1" className="shadow lg !py-1" fill>
            <IconWatch className="mr-2 icon" />
            {i.title}
          </Button>
        </Link>
      )
    }

    if (i.highlight === 'app') {
      return (
        <Link to={i.url}>
          <Button
            color="purple-2"
            className="shadow lg shrink-0 !py-1 flex gap-2 items-center !rounded-2xl"
            fill
          >
            <AppIcons
              className="mx-0.5 mr-1 transform scale-[140%] icon"
              style={{ width: 'auto', height: 'auto', fontSize: '20px' }}
            />
            {i.title}
          </Button>
        </Link>
      )
    }

    return (
      <Link to={i.url} className={className}>
        <>
          {i.highlight === 'app' && <IconCalendar />}
          {i.highlight === 'livestream' && <IconWatch />}
          {i.highlight === 'archive' && <IconWatch className="mr-2 icon" />}
          {i.title}
        </>
      </Link>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent, title: string, index: number) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (activeItem === title) {
          handleClearActive()
        } else {
          handleSetActive(title, 'keyboard')
        }
        break
      case 'Escape':
        e.preventDefault()
        handleClearActive()
        break
      case 'ArrowRight': {
        e.preventDefault()
        const next = foldableItems[index + 1]
        if (next) {
          handleSetActive(next.title, 'keyboard')
          // Focus the next item
          const nextEl = document.querySelector(`[data-nav-item="${index + 1}"]`) as HTMLElement
          nextEl?.focus()
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        const prev = foldableItems[index - 1]
        if (prev) {
          handleSetActive(prev.title, 'keyboard')
          const prevEl = document.querySelector(`[data-nav-item="${index - 1}"]`) as HTMLElement
          prevEl?.focus()
        }
        break
      }
      case 'ArrowDown':
        e.preventDefault()
        if (activeItem === title) {
          // Focus the first link in the active foldout content (not the exiting layer)
          const firstLink = activeContentRef.current?.querySelector(`.${css['foldout-link-item']}`) as HTMLElement
          firstLink?.focus()
        } else {
          handleSetActive(title, 'keyboard')
        }
        break
    }
  }

  const handleFoldoutKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Return focus to the nav item the menu belongs to
      const idx = foldableItems.findIndex((i: LinkType) => i.title === renderedItem)
      handleClearActive()
      suppressNextFocusRef.current = true
      const navEl = document.querySelector(`[data-nav-item="${idx}"]`) as HTMLElement
      navEl?.focus()
    }
  }

  return (
    <div className={css['nav-wrapper']}>
      {/* Foldable group: items with children + shared foldout */}
      <div
        className={css['nav-foldable-group']}
        onMouseLeave={handleClearActive}
      >
        <ul className={css['navigation']} role="menubar">
          {foldableItems.map((i: LinkType, index: number) => {
            const isActive = activeItem === i.title

            return (
              <li
                className={`plain bold ${isActive ? css['nav-item-active'] : ''}`}
                key={`foldable-${index}`}
                ref={el => {
                  itemRefs.current[index] = el
                }}
                role="menuitem"
                tabIndex={0}
                aria-haspopup="true"
                aria-expanded={isActive}
                data-nav-item={index}
                onMouseEnter={() => handleSetActive(i.title)}
                onFocus={() => {
                  if (suppressNextFocusRef.current) {
                    suppressNextFocusRef.current = false
                    return
                  }
                  handleSetActive(i.title, 'keyboard')
                }}
                onKeyDown={e => handleKeyDown(e, i.title, index)}
              >
                {i.title}
                <ChevronDown
                  size={16}
                  color={isActive ? 'white' : 'currentColor'}
                  className={css['nav-chevron']}
                  style={{
                    margin: '0 0 0 4px',
                    transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </li>
            )
          })}
        </ul>

        {renderedItem && renderedSections.length > 0 && (
          <div
            className={css['foldout-positioner']}
            data-instant={instant || undefined}
            style={{ transform: `translateX(${menuX}px)`, width: menuWidth }}
          >
            <div
              className={`${css['foldout']} ${!activeItem ? css['foldout-closing'] : ''}`}
              role="menu"
              onKeyDown={handleFoldoutKeyDown}
              style={{ height: menuHeight ?? undefined }}
            >
              <div className={css['foldout-viewport']}>
                {/* Exiting content */}
                {exitingItem && exitingSections.length > 0 && (
                  <div
                    key={`exit-${exitingItem}`}
                    className={`${css['foldout-content-exit']} ${direction === 'right' ? css['exit-left'] : css['exit-right']}`}
                    style={{ width: exitingWidth - FOLDOUT_CHROME }}
                    onAnimationEnd={() => setExitingItem(null)}
                  >
                    <FoldoutContent sections={exitingSections} currentPath={currentPath} />
                  </div>
                )}

                {/* Entering content */}
                <div
                  key={renderedItem}
                  ref={activeContentRef}
                  className={isSwap ? `${css['foldout-content-enter']} ${direction === 'right' ? css['enter-from-right'] : css['enter-from-left']}` : ''}
                  style={{ width: menuWidth - FOLDOUT_CHROME }}
                >
                  <FoldoutContent sections={renderedSections} currentPath={currentPath} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plain items: no foldout */}
      <ul className={css['navigation']}>
        {plainItems.map((i: LinkType, index: number) => (
          <li className="plain bold" key={`plain-${index}`}>
            {renderPlainLink(i)}
          </li>
        ))}
      </ul>
    </div>
  )
}
