import React from 'react'
import css from './proposals.module.scss'
import { Label } from 'src/components/common/label'
import { Link } from 'src/components/common/link'
import { leftPad } from 'src/utils/left-pad'
import { Table, TableColumn } from 'src/components/common/table'
import {  SortVariation } from 'src/components/common/sort'
import { DIP } from 'src/types/dip'
import GithubIcon from 'src/assets/icons/github.svg'
import TooltipIcon from 'src/assets/icons/tooltip.svg'
import { Share } from 'src/components/common/share'
import ArrowRight from 'src/assets/icons/arrow_right.svg'
import { useIntl } from 'gatsby-plugin-intl'
import { Filter, useFilter } from 'src/components/common/filter'

export const Links = ({ dip }: { dip: DIP }) => {
  return (
    <div className={css['links']}>
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
      <Share url={dip.github} /*commented out until DIP page is deployed: url={`https://devcon.org${dip.slug}`}*/ />
    </div>
  )
}

const tableColumns: Array<TableColumn> = [
  {
    title: '#',
    key: 'number',
    className: css['index-column'],
    sort: SortVariation.basic,
    render: item => {
      return (
        <p className={`${css['index']} h3`}>
          <Link to={item.github} /*commented out until DIP page is deployed: to={item.slug}*/>
            {leftPad(item.number)}
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
    render: item => {
      return <Link to={item.github} /*commented out until DIP page is deployed: to={item.slug}*/>{item.title}</Link>
    },
  },
  {
    intl: 'dips_summary',
    className: css['summary-column'],
    key: 'summary',
  },
  {
    intl: 'dips_status',
    key: 'status',
    className: css['status-column'],
    sort: SortVariation.basic,
    render: item => {
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
        <Label type={labelType}>
          <div className={css['label-content']}>
            <span>&#8226;</span>
            <p>{item.status.toUpperCase()}</p>
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
    render: item => {
      return item.themes ? item.themes.join(', ') : null
    },
  },
  {
    intl: 'dips_tags',
    key: 'tags',
    className: css['tag-column'],
    sort: (item1, item2) => {
      const a = item1.tags
        .map(item => item.trim().toLowerCase())
        .sort()
        .join('')
      const b = item2.tags
        .map(item => item.trim().toLowerCase())
        .sort()
        .join('')

      return a.localeCompare(b)
    },
    render: item => {
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
    intl: 'dips_authors',
    className: css['authors-column'],
    key: 'authors',
    // Authors have no standard format so this is a tricky one
    // render: item => {
    //   console.log(item.authors, 'authors')

    //   if (!item.authors) return null

    //   return (
    //     <li>
    //       {item.authors.map(
    //         author =>
    //           console.log(author, 'author') || (
    //             <li key={author} className="font-xs bold text-uppercase">
    //               {author}
    //             </li>
    //           )
    //       )}
    //     </li>
    //   )

    //   return item.authors ? item.authors.map(author => <p className="font-xs bold text-uppercase">{author}</p>) : null
    // },
  },
  {
    intl: 'dips_links',
    key: 'links',
    className: css['links-column'],
    render: item => {
      return <Links dip={item} />
    },
  },
  // RTD: remove expand colum/link
  {
    intl: 'dips_expand',
    key: 'link',
    className: css['expand-column'],
    render: item => {
      return (
        <Link to={item.slug}>
          <ArrowRight />
        </Link>
      )
    },
  },
]

type ProposalsProps = {
  dips: Array<DIP>
  filter?: string
}

export const Proposals = (props: ProposalsProps) => {
  const intl = useIntl()

  // Pushing an extra column into the table to make room for a link back to the page
  const dipsWithLink = React.useMemo(() => {
    return props.dips.map(dip => {
      return {
        ...dip,
        link: dip.github,
      }
    })
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

  return (
    <section id="proposals" className={css['container']}>
      <div className={css['top-container']}>
        <h3 className="spaced">{intl.formatMessage({ id: 'dips_proposals' })}</h3>

        <Filter {...filterState} />
      </div>

      <Table itemKey="number" items={filteredDips} columns={tableColumns} />
    </section>
  )
}
