import React, { useState } from 'react'
import css from './proposals.module.scss'
import { Label } from 'components/common/label'
import { Link } from 'components/common/link'
import { leftPad } from 'utils/left-pad'
import { Table, TableColumn } from 'components/common/table/Table'
import { SortVariation, presetSortingMethods } from 'components/common/sort'
import { DIP } from 'types/DIP'
import GithubIcon from 'assets/icons/github.svg'
import TooltipIcon from 'assets/icons/tooltip.svg'
import { useFilter } from 'components/common/filter'
import { CopyToClipboard } from 'components/common/share/CopyToClipboard'
import { usePageContext } from 'context/page-context'
import { useTranslations } from 'next-intl'

export const Links = ({ dip }: { dip: DIP }) => {
  return (
    <div className={css['links']} data-type="links">
      {dip.discussion && (
        <Link to={dip.discussion}>
          <TooltipIcon />
        </Link>
      )}
      {dip.github && (
        <Link to={dip.github}>
          <GithubIcon />
        </Link>
      )}
      <CopyToClipboard
        url={dip.github} /*commented out until DIP page is deployed: url={`https://devcon.org${dip.slug}`}*/
      />
    </div>
  )
}

type ProposalsProps = {
  dips: Array<DIP>
  filter?: string
}

export const Proposals = (props: ProposalsProps) => {
  const t = useTranslations('dips')
  // Filter accepted DIPs and sort by number descending (most recent first)
  const dipsWithLink = React.useMemo(() => {
    return props.dips
      .map(dip => ({
        ...dip,
        link: dip.github,
      }))
      .filter(dip => dip.status && dip.status.toLowerCase() === 'accepted')
      .sort((a, b) => b.number - a.number)
  }, [props.dips])

  const [filteredDips, filterState] = useFilter({
    filters: [
      {
        text: 'All',
        value: 'all',
      },
      {
        text: 'Draft',
        value: 'draft',
      },
      {
        text: 'Accepted',
        value: 'accepted',
      },
      {
        text: 'Withdrawn',
        value: 'withdrawn',
      },
      {
        text: 'Not Implemented',
        value: 'not implemented',
      },
    ],
    filterFunction: activeFilter => {
      return !activeFilter || activeFilter === 'all'
        ? dipsWithLink
        : dipsWithLink.filter(dip => dip.status.toLowerCase() === activeFilter?.toLowerCase())
    },
  })

  const tableColumns: Array<TableColumn> = [
    {
      title: '#',
      key: 'number',
      className: css['index-column'],
      sort: SortVariation.basicReverse,
      render: (item: DIP) => {
        return (
          <p className={`${css['index']} h3`}>
            <Link to={item.github} /*commented out until DIP page is deployed: to={item.slug}*/>
              {leftPad(String(item.number))}
            </Link>
          </p>
        )
      },
    },
    {
      title: 'Name',
      key: 'title',
      className: css['name-column'],
      sort: SortVariation.basic,
      render: (item: DIP) => {
        return <Link to={item.github} /*commented out until DIP page is deployed: to={item.slug}*/>{item.title}</Link>
      },
    },
    {
      title: 'Summary',
      className: css['summary-column'],
      key: 'summary',
      render: (item: DIP) => {
        if (item.summary) {
          return <div dangerouslySetInnerHTML={{ __html: item.summary ?? '' }} className="markdown" />
        }
      },
    },
    {
      title: 'Edition',
      key: 'Edition',
      className: '!basis-[120px] !grow-0 !hidden lg:!flex', // css['name-column'],
      // sort: SortVariation.basic,
      render: (item: DIP) => {
        if (item.instances) {
          return <div>{item.instances.join(', ')}</div>
        }

        return null
      },
    },
    {
      title: 'Themes',
      key: 'themes',
      className: css['themes-column'],
      sort: SortVariation.basic,
      render: (item: DIP) => {
        return item.themes ? item.themes.join(', ') : null
      },
    },
    {
      title: 'Tags',
      key: 'tags',
      className: css['tag-column'],
      sort: (item1: DIP, item2: DIP) => {
        const a = item1.tags
          .map(item => item.toString().trim().toLowerCase())
          .sort()
          .join('')
        const b = item2.tags
          .map(item => item.toString().trim().toLowerCase())
          .sort()
          .join('')

        return a.localeCompare(b)
      },
      render: (item: DIP) => {
        return item.tags
          ? item.tags.map(tag => (
              <Label key={tag} type="neutral" className={`${css['tag']} !rounded-lg`}>
                <p className="font-xs bold text-uppercase">{tag}</p>
              </Label>
            ))
          : null
      },
    },
    {
      title: 'Links',
      key: 'links',
      className: css['links-column'],
      render: (item: DIP) => {
        return <Links dip={item} />
      },
    },
  ]

  const INITIAL_COUNT = 10
  const [showAll, setShowAll] = useState(false)
  const visibleDips = showAll ? filteredDips : filteredDips.slice(0, INITIAL_COUNT)
  const hasMore = filteredDips.length > INITIAL_COUNT && !showAll

  return (
    <section id="proposals" className={css['container']}>
      <div className={css['top-container']}>
        <p className="h2">{t('accepted_proposals_heading')}</p>

        {/* <Filter {...filterState} /> */}
      </div>

      <Table
        itemKey="number"
        items={visibleDips}
        columns={tableColumns}
        initialSort={0}
        onRowClick={(item: DIP) => {
          if (item.github) window.open(item.github, '_blank')
        }}
      />

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
          <button
            onClick={() => setShowAll(true)}
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
            {t('load_all_proposals')} <span style={{ fontWeight: 400 }}>({filteredDips.length})</span>
          </button>
        </div>
      )}
      <div className="clear-bottom"></div>
    </section>
  )
}
