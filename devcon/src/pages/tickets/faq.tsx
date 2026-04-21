import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { GetStaticProps } from 'next'
import ReactMarkdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { ChevronDown, AtSign, ArrowUpRight } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from '../past-events-hero.png'
import MoonBackground from 'assets/images/pages/faq-moon-bg.svg'
import css from './faq.module.scss'
import cn from 'classnames'
import { getFaqData, FaqData, FaqItem } from 'services/faq'
import { EMAIL_DEVCON } from 'utils/constants'

type Props = {
  faq: FaqData
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// "Tickets & availability" → "Tickets", "Refunds & cancellations" → "Refunds"
function shortLabel(category: string) {
  return category.split(/\s+/)[0]
}

function groupByCategory(items: FaqItem[], categories: string[]) {
  const bucket = new Map<string, FaqItem[]>()
  for (const cat of categories) bucket.set(cat, [])
  for (const item of items) {
    if (!item.category) continue
    const list = bucket.get(item.category)
    if (list) list.push(item)
  }
  return categories
    .map(cat => ({ category: cat, items: bucket.get(cat) || [] }))
    .filter(group => group.items.length > 0)
}

export default function FaqPage({ faq }: Props) {
  const groups = useMemo(() => groupByCategory(faq.items, faq.categories), [faq])
  // Only one question can be open at a time.
  const [openId, setOpenId] = useState<number | null>(null)
  // Active category follows scroll position so the sidebar highlight matches
  // the section currently at the top of the viewport.
  const [activeCategory, setActiveCategory] = useState<string | null>(
    groups.length > 0 ? groups[0].category : null
  )
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const mobileNavRef = useRef<HTMLElement | null>(null)

  // Click offset = whatever is sticky-pinned at the top of the viewport, plus
  // a small buffer. Measured live so it adapts to the site header's variable
  // height (strip/no-strip) and the mobile-nav (which is display:none on desktop).
  const getClickOffset = () => {
    if (typeof document === 'undefined') return 100
    const header = document.getElementById('header-container')
    const headerH = header ? header.getBoundingClientRect().height : 0
    const navEl = mobileNavRef.current
    const navH = navEl && navEl.offsetParent !== null ? navEl.getBoundingClientRect().height : 0
    return headerH + navH + 12
  }

  // Scroll-spy: pick the section whose top is closest to (but not past) an
  // offset line below the page header. IntersectionObserver alone is clumsy
  // for "current section" UX because short sections may never fully intersect;
  // measuring bounding rects on scroll is reliable and cheap at this scale.
  // Use a slightly larger offset than the click landing so the highlight flips
  // in as the section approaches, rather than only once it locks into place.
  useEffect(() => {
    if (groups.length === 0) return

    const update = () => {
      const offset = getClickOffset() + 20
      let current = groups[0].category
      for (const { category } of groups) {
        const el = sectionRefs.current[category]
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top - offset <= 0) current = category
        else break
      }
      setActiveCategory(prev => (prev === current ? prev : current))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [groups])

  // Keep the active pill visible in the horizontal mobile nav.
  useEffect(() => {
    if (!activeCategory) return
    const el = mobileNavItemRefs.current[activeCategory]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeCategory])

  const toggle = (id: number) => {
    setOpenId(prev => (prev === id ? null : id))
  }

  const handleNavClick = (cat: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const el = sectionRefs.current[cat]
    if (!el) return
    // Manually calculate + clamp to max scroll position so that clicking the
    // last (short) section can't push us past the end of the page (which would
    // otherwise leave the hero hidden and empty space at the bottom).
    // Offset matches .category-group scroll-margin-top responsive value.
    const targetTop = el.getBoundingClientRect().top + window.scrollY - getClickOffset()
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: Math.min(targetTop, maxScroll), behavior: 'smooth' })
    setActiveCategory(cat)
  }

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${css['hero-no-side-gradient']} !mb-0`}
        titleClassName={css['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title="FAQs"
      />

      {/* ── Intro band ─────────────────────────────────────── */}
      <section className={cn(css['intro'], 'section')}>
        <div className={css['intro-inner']}>
          <h1 className={css['intro-title']}>
            Frequently
            <br />
            Asked Questions
          </h1>
          <p className={css['intro-description']}>
            Most Devcon questions are answered in our FAQs – it&apos;s the fastest way to find what you need. Still
            stuck?{' '}
            <a href={`mailto:${EMAIL_DEVCON}`}>Get in touch</a>.
          </p>
        </div>
      </section>

      {/* ── Mobile sticky category nav (outside .main-inner so it can span
           the full viewport width; hidden on desktop) ─────────── */}
      {groups.length > 0 && (
        <aside className={css['mobile-nav']} ref={mobileNavRef}>
          <ul className={css['mobile-nav-list']}>
            {groups.map(group => {
              const isActive = activeCategory === group.category
              return (
                <li key={group.category}>
                  <a
                    href={`#${slugify(group.category)}`}
                    ref={el => {
                      mobileNavItemRefs.current[group.category] = el
                    }}
                    className={cn(css['mobile-nav-item'], isActive && css['mobile-nav-item-active'])}
                    onClick={handleNavClick(group.category)}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {shortLabel(group.category)}
                  </a>
                </li>
              )
            })}
          </ul>
        </aside>
      )}

      {/* ── Main FAQ section ───────────────────────────────── */}
      <section className={cn(css['main'], 'section')}>
        <div className={css['main-bg-moon']} aria-hidden="true">
          <MoonBackground />
        </div>
        <div className={css['main-inner']}>
          <div className={css['content']}>
            {/* Left: accordions grouped by category */}
            <div className={css['faq-column']}>
            {groups.length === 0 && <div className={css['empty']}>No questions available yet. Check back soon.</div>}

            {groups.map(group => (
              <div
                key={group.category}
                className={css['category-group']}
                id={slugify(group.category)}
                data-category={group.category}
                ref={el => {
                  sectionRefs.current[group.category] = el
                }}
              >
                <p className={css['category-title']}>{group.category}</p>
                <div className={css['accordion']}>
                  {group.items.map(item => {
                    const isOpen = openId === item.id
                    return (
                      <div key={item.id} className={css['faq-item']}>
                        <button
                          type="button"
                          className={css['faq-trigger']}
                          onClick={() => toggle(item.id)}
                          aria-expanded={isOpen}
                          aria-controls={`faq-answer-${item.id}`}
                        >
                          <span>{item.question}</span>
                          <ChevronDown
                            size={16}
                            strokeWidth={2}
                            className={cn(css['chevron'], isOpen && css['chevron-open'])}
                          />
                        </button>
                        <div
                          id={`faq-answer-${item.id}`}
                          className={cn(css['answer-wrap'], isOpen && css['answer-wrap-open'])}
                          aria-hidden={!isOpen}
                        >
                          <div className={css['answer-inner']}>
                            <div className={css['answer']}>
                              {item.answer ? (
                                <ReactMarkdown>{item.answer}</ReactMarkdown>
                              ) : (
                                <p>Answer coming soon.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: sticky sidebar navigation (desktop only) */}
          {groups.length > 0 && (
            <aside className={css['sidebar']}>
              <ul className={css['sidebar-list']}>
                {groups.map(group => {
                  const isActive = activeCategory === group.category
                  return (
                    <li key={group.category}>
                      <a
                        href={`#${slugify(group.category)}`}
                        className={cn(css['sidebar-item'], isActive && css['sidebar-item-active'])}
                        onClick={handleNavClick(group.category)}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        {group.category}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </aside>
            )}
          </div>

          {/* Contact CTA */}
          <hr className={css['cta-divider']} />
          <div className={css['cta-card']}>
            <p className={css['cta-title']}>Can&apos;t find the answer to your question?</p>
            <a href={`mailto:${EMAIL_DEVCON}`} className={css['cta-button']} aria-label="Email our Support team">
              <span className={css['cta-button-text']}>Email our Support team</span>
              <ArrowUpRight size={16} strokeWidth={2} className={css['cta-button-arrow']} aria-hidden="true" />
              <AtSign className={css['cta-button-watermark']} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </Page>
  )
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const faq = await getFaqData()
    return {
      props: { faq },
      revalidate: 60,
    }
  } catch (err) {
    console.error('[faq] failed to load FAQ data', err)
    return {
      props: { faq: { categories: [], items: [] } },
      revalidate: 30,
    }
  }
}
