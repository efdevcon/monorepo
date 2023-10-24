import React, { useEffect, useImperativeHandle } from 'react'
import css from './navigation.module.scss'
import IconMenu from 'src/assets/icons/menu.svg'
import IconClose from 'src/assets/icons/cross.svg'
import IconGlobe from 'src/assets/icons/globe.svg'
import IconChevronRight from 'src/assets/icons/chevron_right.svg'
import IconChevronLeft from 'src/assets/icons/chevron_left.svg'
// import IconRoad from 'src/assets/icons/road.svg'
import ethLogo from 'src/assets/images/eth.svg'
import { leftPad } from 'src/utils/left-pad'
import HeaderLogo from '../../header/HeaderLogo'
import { Newsletter } from 'src/components/common/newsletter'
import { SocialMedia } from 'src/components/common/layouts/footer'
import { Link as LinkType } from 'src/types/Link'
import { Link } from 'src/components/common/link'
import usePageInView, { hashSlug } from './usePageInView'
import { useLanguageToggle } from 'src/components/common/layouts/header/strip/language-toggle'
import useKeyBinding from 'src/hooks/useKeybinding'
import { Copyright } from 'src/components/common/layouts/Copyright'

type PageRefs = {
  [key: string]: React.Ref<HTMLDivElement>
}

type NavigationProps = {
  pages: any[]
  links: LinkType[]
  pageRefs: PageRefs
  pageTrackRef: any
  lastX: any
}

const LanguageToggle = () => {
  const { redirectPath, currentLanguage } = useLanguageToggle()

  return (
    <div className={`no-select ${css['language-toggle']}`}>
      <Link
        className={currentLanguage === 'en' ? 'semi-bold hover-underline' : 'hover-underline'}
        to={`/en/${redirectPath}`}
      >
        EN
      </Link>
      <Link
        className={currentLanguage === 'es' ? 'semi-bold hover-underline' : 'hover-underline'}
        to={`/es/${redirectPath}`}
      >
        ES
      </Link>
    </div>
  )
}

const Foldout = ({ pageProps, hover, pages, setHover, pageInView, links, goToSlide }: any) => {
  useEffect(() => {
    var _overlay = document.getElementById('overlay')
    var _clientY = null // remember Y position on touch start

    function isOverlayTotallyScrolled() {
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
      return _overlay.scrollHeight - _overlay.scrollTop <= _overlay.clientHeight
    }

    function disableRubberBand(event) {
      var clientY = event.targetTouches[0].clientY - _clientY

      if (_overlay.scrollTop === 0 && clientY > 0) {
        // element is at the top of its scroll
        event.preventDefault()
      }

      if (isOverlayTotallyScrolled() && clientY < 0) {
        //element is at the top of its scroll
        event.preventDefault()
      }
    }

    _overlay.addEventListener(
      'touchstart',
      function (event) {
        if (event.targetTouches.length === 1) {
          // detect single touch
          _clientY = event.targetTouches[0].clientY
        }
      },
      false
    )

    _overlay.addEventListener(
      'touchmove',
      function (event) {
        if (event.targetTouches.length === 1) {
          // detect single touch
          disableRubberBand(event)
        }
      },
      false
    )
  })

  return (
    <div id="overlay" className={css['foldout']}>
      <div className={css['header']}>
        <HeaderLogo />
        {/* <IconRoad className="override" style={{ marginTop: '-3px' }} /> */}
      </div>

      <div className={css['globe-icon']}>
        <IconGlobe />
        <LanguageToggle /> {/* 0 opacity language toggle to synchronize the height of the sidebar */}
      </div>

      <ul className={css['nav']}>
        {pageProps?.map(({ title }, index) => {
          const selected = pageInView === title

          let className = 'text-uppercase font-secondary no-select'

          if (selected || hover === index) className += ` ${css['selected']}`

          return (
            <li
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(-1)}
              className={className}
              key={title}
              data-index={leftPad(index + '')}
              onClick={() => goToSlide(index)} //slide(title, props, setFoldoutOpen)}
            >
              {title}
            </li>
          )
        })}
      </ul>

      {links && (
        <nav className={css['links']}>
          {links.map((link, index) => {
            return (
              <Link key={index} className="bold hover-underline" to={link.url}>
                {link.title}
              </Link>
            )
          })}
        </nav>
      )}

      <div className={css['nav-footer']}>
        <div>
          <SocialMedia onShare={() => goToSlide(pages.length - 1)} />
          <Newsletter id='navigation_newsletter_email' />
          <Copyright />
        </div>
      </div>
    </div>
  )
}

export const Navigation = React.forwardRef((props: NavigationProps, ref: any) => {
  const [foldoutOpen, setFoldoutOpen] = React.useState(false)
  const [hover, setHover] = React.useState(-1)
  const pageProps: any[] | null | undefined = React.Children.map(props.pages, page => page.props)
  const [pageInView, pageInViewIndex] = usePageInView(props.pageRefs)

  const slide = (pageTitle: string, props: any) => {
    const targetSlide = props.pageRefs.current[pageTitle]

    if (!targetSlide) return

    const offsetLeft = targetSlide.offsetLeft

    props.pageTrackRef.current.style.transform = `translateX(-${offsetLeft}px)`
    props.lastX.current = offsetLeft
  }

  const goToSlide = (action: ('next' | 'prev' | 'syncCurrent') | number) => {
    setFoldoutOpen(false)
    const currentPageIndex = props.pages.findIndex(page => page.props.title === pageInView)
    let nextPageIndex

    if (action === 'prev') {
      nextPageIndex = Math.max(0, currentPageIndex - 1)
    } else if (action === 'next') {
      const lastPageIndex = props.pages.length - 1

      nextPageIndex = Math.min(lastPageIndex, currentPageIndex + 1)
    } else if (typeof action === 'number') {
      nextPageIndex = action
    }

    const isSamePage = nextPageIndex === currentPageIndex

    if (isSamePage) return

    // When resizing the window, we have to resynchronize the position of the current page so it snaps into the new viewport size
    if (action === 'syncCurrent') {
      nextPageIndex = currentPageIndex
    }

    const nextPage = pageProps[nextPageIndex]

    if (!nextPage) return

    slide(nextPage.title, props)
  }

  useImperativeHandle(ref, () => ({
    goToSlide,
  }))

  useEffect(() => {
    if (foldoutOpen) {
      document.body.classList.add(css['no-overflow-body'])
    } else {
      document.body.classList.remove(css['no-overflow-body'])
    }
  }, [foldoutOpen])

  useKeyBinding(() => goToSlide('prev'), ['ArrowLeft'])
  useKeyBinding(() => goToSlide('next'), ['ArrowRight'])

  // Sync page position with anchor on mount
  React.useEffect(() => {
    const hash = window.location.hash

    if (hash) {
      props.pageTrackRef.current.style.transition = 'none'

      pageProps?.find(({ title: pageTitle }) => {
        if (hashSlug(pageTitle) === hash) {
          slide(pageTitle, props)

          // Dirty fix for letting anchor navigate on mount - other hooks can read the window object to see if anchor has been handled or not before deciding to navigate
          setTimeout(() => {
            props.pageTrackRef.current.style.transition = ''
            window.__anchor_handled = true
          }, 100)
        }
      })
    }
  }, [])

  return (
    <>
      <div className={`${css['navigation']} ${foldoutOpen ? css['open'] : ''}`}>
        <div className={css['upper-fold']}>
          {/* <div
            className={css['logo-mobile']}
            onClick={() => {
              goToSlide(0)
              setFoldoutOpen(false)
            }}
          >
            <HeaderLogo />
          </div> */}

          <div className={css['toggle']} onClick={() => setFoldoutOpen(!foldoutOpen)}>
            <IconMenu />
            <IconClose />
          </div>

          <div className={css['nav-middle']}>
            <LanguageToggle />

            <ul className={css['slide-nav']}>
              {pageProps?.map(({ title, icon }, index) => {
                const selected = pageInView === title

                let className = 'text-uppercase font-secondary no-select'

                if (selected || hover === index) className += ` ${css['selected']}`

                return (
                  <li
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(-1)}
                    className={className}
                    key={title}
                    onClick={() => slide(title, props, setFoldoutOpen)}
                  >
                    {icon || leftPad(index + '')}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={css['logo']}>
            <img src={ethLogo} alt="Ethereum logo" />
          </div>

          <div className={css['mobile-navigation']}>
            <p>
              <span className="bold">
                {typeof pageInViewIndex === 'undefined' ? '00' : leftPad(pageInViewIndex + '')}
              </span>{' '}
              / 07
            </p>
            <div onClick={() => goToSlide('prev')}>
              <IconChevronLeft />
            </div>
            <div onClick={() => goToSlide('next')}>
              <IconChevronRight />
            </div>
          </div>

          <div className={css['logo-mobile']}>
            <HeaderLogo />
          </div>

          {/* Need a layer with a filled in background to avoid content overlapping when menu slides in */}
          <div className={css['backdrop']} />
        </div>

        <Foldout
          pageProps={pageProps}
          pages={props.pages}
          hover={hover}
          pageInView={pageInView}
          setHover={setHover}
          links={props.links}
          goToSlide={goToSlide}
        />
      </div>
    </>
  )
})
