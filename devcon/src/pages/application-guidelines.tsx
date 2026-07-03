import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { GetStaticProps } from 'next'
import ReactMarkdown from 'react-markdown'
import { useTranslations } from 'next-intl'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { SEO } from 'components/domain/seo'
import { AtSign, ArrowUpRight, CircleAlert } from 'lucide-react'
import themes from './themes.module.scss'
import HeroBackground from './past-events-hero.png'
import MoonBackground from 'assets/images/pages/faq-moon-bg.svg'
import css from './application-guidelines.module.scss'
import cn from 'classnames'
import { getMessages } from 'utils/intl'

// Where the "Apply to speak" CTA points (Devcon 8 India Call for Proposals).
const APPLY_URL = 'https://mum.speakat.xyz/devcon8/cfp'

// Fixed, ordered section keys. Each maps to `sections.<key>` in the
// `application_guidelines` intl namespace and to an anchor id (underscores → hyphens).
const SECTION_KEYS = [
  'important_information',
  'code_of_conduct',
  'session_lengths',
  'programming_values',
  'review_process',
  'review_criteria',
  'decision',
] as const

type SectionKey = (typeof SECTION_KEYS)[number]

const anchorId = (key: SectionKey) => key.replace(/_/g, '-')

// External links open in a new tab; internal (/…) and mailto: links stay in place.
const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const isExternal = !!href && /^https?:\/\//.test(href)
    return isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    )
  },
}

export default function ApplicationGuidelinesPage() {
  const t = useTranslations('application_guidelines')

  const sections = useMemo(
    () =>
      SECTION_KEYS.map(key => ({
        key,
        id: anchorId(key),
        nav: t(`sections.${key}.nav`),
        title: t(`sections.${key}.title`),
        body: t(`sections.${key}.body`),
      })),
    [t]
  )

  // Active section follows scroll position so the sidebar highlight matches the
  // section currently at the top of the viewport.
  const [activeKey, setActiveKey] = useState<SectionKey>(SECTION_KEYS[0])
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const mobileNavRef = useRef<HTMLElement | null>(null)

  // Click offset = whatever is sticky-pinned at the top of the viewport, plus a
  // small buffer. Measured live so it adapts to the site header's variable height
  // and the mobile-nav (which is display:none on desktop).
  const getClickOffset = () => {
    if (typeof document === 'undefined') return 100
    const header = document.getElementById('header-container')
    const headerH = header ? header.getBoundingClientRect().height : 0
    const navEl = mobileNavRef.current
    const navH = navEl && navEl.offsetParent !== null ? navEl.getBoundingClientRect().height : 0
    return headerH + navH + 12
  }

  // Scroll-spy: pick the section whose top is closest to (but not past) an offset
  // line below the page header. Measuring bounding rects on scroll is reliable and
  // cheap at this scale and, unlike IntersectionObserver, handles short sections.
  useEffect(() => {
    const update = () => {
      const offset = getClickOffset() + 20
      let current: SectionKey = SECTION_KEYS[0]
      for (const { key } of sections) {
        const el = sectionRefs.current[key]
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top - offset <= 0) current = key
        else break
      }
      setActiveKey(prev => (prev === current ? prev : current))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [sections])

  // Keep the active pill visible in the horizontal mobile nav.
  useEffect(() => {
    const el = mobileNavItemRefs.current[activeKey]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeKey])

  const handleNavClick = (key: SectionKey) => (e: React.MouseEvent) => {
    e.preventDefault()
    const el = sectionRefs.current[key]
    if (!el) return
    // Manually calculate + clamp to max scroll so clicking the last (short)
    // section can't push us past the end of the page.
    const targetTop = el.getBoundingClientRect().top + window.scrollY - getClickOffset()
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: Math.min(targetTop, maxScroll), behavior: 'smooth' })
    setActiveKey(key)
  }

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <SEO title={t('page_title')} description={t('page_description')} />

      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('hero_title')}
      />

      {/* ── Mobile sticky section nav (outside .main-inner so it can span the
           full viewport width; hidden on desktop) ─────────────── */}
      <aside className={css['mobile-nav']} ref={mobileNavRef}>
        <ul className={css['mobile-nav-list']}>
          {sections.map(section => {
            const isActive = activeKey === section.key
            return (
              <li key={section.key}>
                <a
                  href={`#${section.id}`}
                  ref={el => {
                    mobileNavItemRefs.current[section.key] = el
                  }}
                  className={cn(css['mobile-nav-item'], isActive && css['mobile-nav-item-active'])}
                  onClick={handleNavClick(section.key)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {section.nav}
                </a>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* ── Main content ───────────────────────────────────── */}
      <section className={cn(css['main'], 'section')}>
        <div className={css['main-bg-moon']} aria-hidden="true">
          <MoonBackground />
        </div>
        <div className={css['main-inner']}>
          <div className={css['content']}>
            {/* Left: heading + prose sections */}
            <div className={css['content-column']}>
              <h1 className={css['page-heading']}>{t('heading')}</h1>

              {sections.map(section => (
                <div
                  key={section.key}
                  className={css['section-group']}
                  id={section.id}
                  ref={el => {
                    sectionRefs.current[section.key] = el
                  }}
                >
                  <h2 className={css['section-title']}>
                    {section.title}
                    {section.key === 'important_information' && (
                      <CircleAlert size={24} strokeWidth={2} className={css['section-title-icon']} aria-hidden="true" />
                    )}
                  </h2>
                  <div className={css['prose']}>
                    <ReactMarkdown components={markdownComponents}>{section.body}</ReactMarkdown>
                  </div>
                  {section.key === 'decision' && (
                    <a className={css['apply-button']} href={APPLY_URL} target="_blank" rel="noopener noreferrer">
                      <span>{t('apply_cta')}</span>
                      <ArrowUpRight size={16} strokeWidth={2} className={css['apply-button-arrow']} aria-hidden="true" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* Right: sticky sidebar navigation (desktop only) */}
            <aside className={css['sidebar']}>
              <ul className={css['sidebar-list']}>
                {sections.map(section => {
                  const isActive = activeKey === section.key
                  return (
                    <li key={section.key}>
                      <a
                        href={`#${section.id}`}
                        className={cn(css['sidebar-item'], isActive && css['sidebar-item-active'])}
                        onClick={handleNavClick(section.key)}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        {section.nav}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </aside>
          </div>

          {/* Contact CTA */}
          <hr className={css['cta-divider']} />
          <div className={css['contact-card']}>
            <p className={css['contact-heading']}>{t('contact_heading')}</p>
            <a
              href={`mailto:${t('contact_email')}`}
              className={css['contact-button']}
              aria-label={`${t('contact_prefix')}${t('contact_email')}`}
            >
              <span className={css['contact-button-text']}>
                {t('contact_prefix')}
                {t('contact_email')}
              </span>
              <AtSign className={css['contact-button-watermark']} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </Page>
  )
}

export const getStaticProps: GetStaticProps = async context => {
  const locale = context.locale ?? 'en'
  const messages = await getMessages(locale)
  return {
    props: { messages },
    revalidate: 60,
  }
}
