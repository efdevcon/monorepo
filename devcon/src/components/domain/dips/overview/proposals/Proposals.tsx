import React from 'react'
import css from './proposals.module.scss'
import { Label } from 'components/common/label'
import { Link } from 'components/common/link'
import { leftPad } from 'utils/left-pad'
import { Table, TableColumn } from 'components/common/table/Table'
import { SortVariation } from 'components/common/sort'
import { DIP } from 'types/DIP'
import GithubIcon from 'assets/icons/github.svg'
import TooltipIcon from 'assets/icons/tooltip.svg'
import ArrowRight from 'assets/icons/arrow_right.svg'
import { useTranslations } from 'next-intl'
import { useFilter } from 'components/common/filter'
import { CopyToClipboard } from 'components/common/share/CopyToClipboard'
import { usePageContext } from 'context/page-context'

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
  const intl = useTranslations()
  const context = usePageContext()

  // Pushing an extra column into the table to make room for a link back to the page
  const dipsWithLink = React.useMemo(() => {
    return props.dips
      .map(dip => {
        return {
          ...dip,
          link: dip.github,
        }
      })
      .filter(dip => dip.status.toLowerCase() === 'accepted')
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
      sort: SortVariation.basic,
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
      intl: 'dips_name',
      key: 'title',
      className: css['name-column'],
      sort: SortVariation.basic,
      render: (item: DIP) => {
        return <Link to={item.github} /*commented out until DIP page is deployed: to={item.slug}*/>{item.title}</Link>
      },
    },
    {
      intl: 'dips_summary',
      className: css['summary-column'],
      key: 'summary',
      render: (item: DIP) => {
        if (item.summary) {
          return <div dangerouslySetInnerHTML={{ __html: item.summary ?? '' }} className="markdown" />
        }
      },
    },
    {
      intl: 'dips_status',
      key: 'status',
      className: css['status-column'],
      // sort: (item1: DIP, item2: DIP) => {
      //   const a = item1.status
      //   const b = item2.status

      //   // Active first
      //   if (a === 'Active') return 1
      //   if (b === 'Active') return 1

      //   // Secondary sort by number when a === b
      //   if (a === b) {
      //     if (item1.number > item2.number) return 1
      //     if (item1.number < item2.number) return -1
      //   }

      //   // Sort by status
      //   return a.localeCompare(b)
      // },
      render: (item: DIP) => {
        let labelType = 'neutral'

        switch (item.status.toLowerCase()) {
          case 'withdrawn':
          case 'not implemented':
            labelType = 'error'

            break
          case 'active':
          case 'accepted':
            labelType = 'success'

            break
        }

        return (
          <Label type={labelType} className="shrink-0">
            <div className={css['label-content']}>
              {/* <span>&#8226;</span> */}
              <p className="shrink-0">{item.status.toUpperCase()}</p>
            </div>
          </Label>
        )
      },
    },
    {
      intl: 'dips_themes',
      key: 'themes',
      className: css['themes-column'],
      sort: SortVariation.basic,
      render: (item: DIP) => {
        return item.themes ? item.themes.join(', ') : null
      },
    },
    {
      intl: 'dips_tags',
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
              <Label key={tag} type="neutral" className={css['tag']}>
                <p className="font-xs bold text-uppercase">{tag}</p>
              </Label>
            ))
          : null
      },
    },
    {
      intl: 'dips_links',
      key: 'links',
      className: css['links-column'],
      render: (item: DIP) => {
        return <Links dip={item} />
      },
    },
    {
      intl: 'dips_expand',
      key: 'link',
      className: css['expand-column'],
      render: (item: DIP) => {
        return (
          <Link to={item.github}>
            {' '}
            {/*"{`/${context?.current?.lang || 'en'}/dips/dip-${item.number}`}>*/}
            <ArrowRight />
          </Link>
        )
      },
    },
  ]

  return (
    <section id="proposals" className={css['container']}>
      <div className={css['top-container']}>
        <p className="h2">Accepted Proposals</p>

        {/* <Filter {...filterState} /> */}
      </div>

      <Table itemKey="number" items={filteredDips} columns={tableColumns} initialSort={0} />
      <div className="clear-bottom"></div>
    </section>
  )
}
