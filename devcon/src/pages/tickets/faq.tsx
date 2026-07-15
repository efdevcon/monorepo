import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { GetStaticProps } from 'next'
import ReactMarkdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { ChevronDown, AtSign, ArrowUpRight, Search, CircleX } from 'lucide-react'
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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Wrap query matches in <mark> for plain strings (questions).
function highlightString(text: string, query: string, markClass: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className={markClass}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// Rehype plugin that wraps query matches in <mark> inside rendered answers.
// Walks the hast tree and splits text nodes; hand-rolled to avoid pulling in
// unist-util-visit for a ~20-line walk.
function createHighlightPlugin(query: string, markClass: string) {
  return () => (tree: { children?: HastNode[] }) => {
    if (!query) return
    const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi')
    const walk = (node: { children?: HastNode[] }) => {
      if (!node.children) return
      const next: HastNode[] = []
      for (const child of node.children) {
        // String.split ignores the regex's stateful lastIndex, unlike .test()
        const parts = child.type === 'text' && typeof child.value === 'string' ? child.value.split(pattern) : null
        if (parts && parts.length > 1) {
          parts.forEach((part, i) => {
            if (!part) return
            next.push(
              i % 2 === 1
                ? { type: 'element', tagName: 'mark', properties: { className: [markClass] }, children: [{ type: 'text', value: part }] }
                : { type: 'text', value: part }
            )
          })
        } else {
          walk(child)
          next.push(child)
        }
      }
      node.children = next
    }
    walk(tree)
  }
}

type HastNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

// Answers are raw Markdown; search should match the visible text, not link
// URLs or emphasis markers. Regex-based on purpose — good enough for search,
// not worth a parser dependency.
function stripMarkdown(md: string) {
  return md
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|`|\*|_)/g, '')
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
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
  // Search: `query` tracks the input directly; `debouncedQuery` drives
  // filtering so the list doesn't churn on every keystroke.
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  // Searchable text per item, built once per data load rather than per keystroke.
  const corpus = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of faq.items) {
      map.set(item.id, `${item.question.toLowerCase()}\n${stripMarkdown(item.answer)}`)
    }
    return map
  }, [faq.items])

  const activeQuery = debouncedQuery.trim().toLowerCase()
  const isSearching = activeQuery.length > 0

  const visibleItems = useMemo(
    () => (activeQuery ? faq.items.filter(item => (corpus.get(item.id) ?? '').includes(activeQuery)) : faq.items),
    [faq.items, corpus, activeQuery]
  )

  const groups = useMemo(() => groupByCategory(visibleItems, faq.categories), [visibleItems, faq.categories])

  const highlightPlugin = useMemo(() => createHighlightPlugin(activeQuery, css['highlight']), [activeQuery])
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

  // Set both states so clearing takes effect immediately, skipping the debounce.
  const clearSearch = () => {
    setQuery('')
    setDebouncedQuery('')
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
            <div className={css['search']}>
              <div className={css['search-input-wrap']}>
                <Search size={16} strokeWidth={2} className={css['search-icon']} aria-hidden="true" />
                <input
                  type="search"
                  className={css['search-input']}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by term"
                  aria-label="Search FAQs"
                />
                <span className={css['search-count']} role="status" aria-live="polite">
                  {isSearching ? `${visibleItems.length} ${visibleItems.length === 1 ? 'result' : 'results'}` : ''}
                </span>
                {query.length > 0 && (
                  <button type="button" className={css['search-clear']} onClick={clearSearch}>
                    <CircleX size={16} strokeWidth={2} aria-hidden="true" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {groups.length === 0 &&
              (isSearching ? (
                <div className={css['empty']}>
                  No results for &ldquo;{debouncedQuery.trim()}&rdquo;.{' '}
                  <button type="button" className={css['empty-clear']} onClick={clearSearch}>
                    Clear search
                  </button>
                </div>
              ) : (
                <div className={css['empty']}>No questions available yet. Check back soon.</div>
              ))}

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
                    // While searching, show every match expanded so answer-only
                    // matches are visible; the single-open behavior (and the
                    // previously open item) comes back when the query clears.
                    const isOpen = isSearching || openId === item.id
                    return (
                      <div key={item.id} className={css['faq-item']}>
                        <button
                          type="button"
                          className={css['faq-trigger']}
                          onClick={() => toggle(item.id)}
                          aria-expanded={isOpen}
                          aria-controls={`faq-answer-${item.id}`}
                        >
                          <span>{isSearching ? highlightString(item.question, activeQuery, css['highlight']) : item.question}</span>
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
                                <ReactMarkdown rehypePlugins={isSearching ? [highlightPlugin] : []}>
                                  {item.answer}
                                </ReactMarkdown>
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

export const getStaticProps: GetStaticProps<Props> = async context => {
  const locale = context.locale ?? 'en'
  try {
    const faq = await getFaqData(locale)
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
