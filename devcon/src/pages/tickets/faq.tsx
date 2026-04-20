import React, { useMemo, useRef, useState } from 'react'
import type { GetStaticProps } from 'next'
import ReactMarkdown from 'react-markdown'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import { ChevronDown, AtSign, ArrowUpRight } from 'lucide-react'
import themes from '../themes.module.scss'
import HeroBackground from './updated-hero.png'
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
  // Active category is set only when the user clicks a sidebar item — no scroll-spy.
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

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
    const SCROLL_OFFSET = 100 // matches .category-group scroll-margin-top
    const targetTop = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
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

          {/* Right: sticky sidebar navigation */}
          {groups.length > 0 && (
            <aside className={css['sidebar']}>
              <ul className={css['sidebar-list']}>
                {groups.map(group => (
                  <li key={group.category}>
                    <a
                      href={`#${slugify(group.category)}`}
                      className={cn(
                        css['sidebar-item'],
                        activeCategory === group.category && css['sidebar-item-active']
                      )}
                      onClick={handleNavClick(group.category)}
                    >
                      {group.category}
                    </a>
                  </li>
                ))}
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
