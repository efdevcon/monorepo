import React from 'react'
import Page from 'components/common/layouts/page'
import themes from '../themes.module.scss'
import heroCss from '../tickets/tickets-landing.module.scss'
import { PageHero } from 'components/common/page-hero'
import { Contribute } from 'components/domain/dips/overview/contribute'
import { Proposals } from 'components/domain/dips/overview/proposals'
import { GetContributors, GetDIPs } from 'services/dips'
import HeroBackground from '../ecosystem-program/hero-bg.png'
import { useTina } from 'tinacms/dist/react'
import { client } from '../../../tina/__generated__/client'
import { PagesDips, PagesQuery } from '../../../tina/__generated__/types'
import { getMessages } from 'utils/intl'
import { useTranslations } from 'next-intl'

export default function DIPsTemplate(props: any) {
  const t = useTranslations('dips')
  const { data } = useTina<PagesQuery>(props.cms)
  // Tina returns the query name as the top-level key. For the default `pages` query
  // that's `data.pages`; for locale-specific collections it's `data.pagesHi`, `data.pagesMr`, etc.
  const d = data as any
  const pageNode = d.pages ?? d.pagesHi ?? d.pagesMr
  const pages = pageNode as PagesDips

  return (
    <Page theme={themes['tickets']} withHero darkFooter>
      <PageHero
        className={`${heroCss['hero-no-side-gradient']} !mb-0`}
        titleClassName={heroCss['hero-title']}
        heroBackground={HeroBackground}
        path={[]}
        title={t('title')}
        navigation={[
          {
            title: t('nav.contribute'),
            to: '#contribute',
          },
          {
            title: t('nav.accepted_proposals'),
            to: '#proposals',
          },
          {
            title: t('nav.forum'),
            to: 'https://forum.devcon.org',
          },
          {
            title: t('nav.github'),
            to: 'https://github.com/efdevcon/DIPs',
          },
        ]}
      />

      <div className="section" style={{ background: 'linear-gradient(to bottom, #fbfafc 0%, #e5ebff 80%)', paddingTop: '2rem', isolation: 'isolate' }}>
        <Contribute
          dipDescription={pages.section1?.about}
          communityHubs={pages.community_hubs}
          contributors={props.contributors}
        />
        <Proposals dips={props.dips} />
      </div>
    </Page>
  )
}

export async function getStaticProps(context: any) {
  const locale: string = context.locale ?? 'en'

  const dips = await GetDIPs()
  const dipsWithoutCommunityHub = dips.filter(dip => dip.tags.every(tag => tag !== ('Community Hub' as any)))
  const contributors = await GetContributors()

  // Locale-aware Tina query. `pagesHi` is only available after `tinacms build` regenerates
  // the client with the Hindi collection. Falls back to English `pages` until then.
  const queries = client.queries as any
  const queryFn =
    locale !== 'en' && typeof queries[`pages${capitalize(locale)}`] === 'function'
      ? queries[`pages${capitalize(locale)}`]
      : queries.pages

  const content = await queryFn({ relativePath: 'dips.mdx' })

  const messages = await getMessages(locale)

  return {
    props: {
      dips: dipsWithoutCommunityHub,
      contributors,
      cms: {
        variables: content.variables,
        data: content.data,
        query: content.query,
      },
      messages,
    },
    revalidate: 43200, // 12 hours
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
