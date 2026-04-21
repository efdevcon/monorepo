import React, { useState } from 'react'
import Page from 'components/common/layouts/page'
import { PageHero } from 'components/common/page-hero'
import themes from './themes.module.scss'
import heroCss from './tickets/tickets-landing.module.scss'
import { BlogOverview } from 'components/domain/blog-overview'
import { GetBlogs, EDITION_ORDER } from 'services/blogs'
import { BlogPost } from 'types/BlogPost'
import HeroBackground from './past-events-hero.png'
import { useTranslations } from 'next-intl'

const CURRENT_EDITION = EDITION_ORDER[0] // Devcon 8 India
const PREVIEW_COUNT = 2

function EditionSection({ edition, blogs, isFirst }: { edition: string; blogs: BlogPost[]; isFirst?: boolean }) {
  const t = useTranslations('blogs')
  const isCurrent = edition === CURRENT_EDITION
  const [expanded, setExpanded] = useState(isCurrent)
  const visibleBlogs = expanded ? blogs : blogs.slice(0, PREVIEW_COUNT)
  const hasMore = blogs.length > PREVIEW_COUNT && !expanded

  return (
    <div id={edition.replace(/\s+/g, '-')} style={{ scrollMarginTop: 100 }}>
      <h2 style={{ fontWeight: 800, fontSize: 32, color: '#160b2b', margin: isFirst ? '0 0 1.5rem' : '2.5rem 0 1.5rem', letterSpacing: '-0.5px' }}>
        {edition}
      </h2>
      <BlogOverview blogs={visibleBlogs} />
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0 1rem' }}>
          <button
            onClick={() => setExpanded(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 48,
              padding: '0 32px',
              fontSize: 16,
              fontWeight: 700,
              color: '#1a0d33',
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(34,17,68,0.1)',
              borderRadius: 9999,
              cursor: 'pointer',
            }}
          >
            {t('view_all')} <span style={{ fontWeight: 400 }}>({blogs.length})</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function BlogsTemplate(props: any) {
  const t = useTranslations('blogs')
  const blogs: BlogPost[] = props.blogs

  // Group blogs by edition
  const grouped: Record<string, BlogPost[]> = {}
  for (const blog of blogs) {
    const edition = blog.edition || 'Other'
    if (!grouped[edition]) grouped[edition] = []
    grouped[edition].push(blog)
  }

  // Order editions per EDITION_ORDER, skip empty ones
  const editions = EDITION_ORDER.filter(e => grouped[e]?.length)

  // Build nav links from editions
  const navLinks = editions.map(edition => ({
    title: edition.toUpperCase(),
    to: `#${edition.replace(/\s+/g, '-')}`,
  }))

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${heroCss['hero-no-side-gradient']} !mb-0`}
        titleClassName={heroCss['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={navLinks}
      />

      <div className="section" style={{ background: 'linear-gradient(to bottom, #fbfafc 0%, #e5ebff 80%)', paddingTop: '2rem' }}>
        {editions.map((edition, i) => (
          <EditionSection key={edition} edition={edition} blogs={grouped[edition]} isFirst={i === 0} />
        ))}
        <div style={{ height: '2rem' }} />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const blogs = await GetBlogs()

  return {
    props: {
      blogs,
    },
    revalidate: 3600,
  }
}
