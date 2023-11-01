import React from 'react'
import css from './dip.module.scss'
import proposalCss from 'components/domain/dips/overview/proposals/proposals.module.scss'
import { Links } from 'components/domain/dips/overview/proposals/Proposals'
import { PageHero } from 'components/common/page-hero'
import { Link } from 'components/common/link'
import { Label } from 'components/common/label'
import { Table } from 'components/common/table/Table'
import { leftPad } from 'utils/left-pad'
import { DIP as DIPType } from 'types/DIP'
import ArrowLeft from 'assets/icons/chevron_left.svg'
import ArrowRight from 'assets/icons/chevron_right.svg'
import { useTranslations } from 'next-intl'

// import { MDXRemote } from 'next-mdx-remote'

// const tableColumns: any = [
//   {
//     intl: 'dips_status',
//     key: 'status',
//     // className: proposalCss['status-column'],
//     render: (item: DIPType) => {
//       let labelType

//       switch (item.status.toLowerCase()) {
//         case 'withdrawn':
//         case 'not implemented':
//           labelType = 'error'

//           break
//         case 'active':
//         case 'accepted':
//           labelType = 'success'

//           break
//       }

//       return (
//         <Label type={labelType}>
//           <div className={proposalCss['label-content']}>
//             <span>&#8226;</span>
//             <p>{item.status.toUpperCase()}</p>
//           </div>
//         </Label>
//       )
//     },
//   },
//   {
//     intl: 'dips_themes',
//     key: 'themes',
//     // className: proposalCss['themes-column'],
//     render: (item: DIPType) => {
//       return item.themes ? item.themes.join(', ') : null
//     },
//   },
//   {
//     intl: 'dips_tags',
//     key: 'tags',
//     render: (item: DIPType) => {
//       return item.tags
//         ? item.tags.map(tag => (
//             <Label key={tag} type="neutral" className={proposalCss['tag']}>
//               <p className="font-xs bold text-uppercase">{tag}</p>
//             </Label>
//           ))
//         : null
//     },
//   },
//   {
//     intl: 'dips_authors',
//     // className: proposalCss['authors-column'],
//     key: 'authors',
//   },
// ]

export function DIP(props: { dip: DIPType }) {
  const dip = props.dip
  const intl = useTranslations()

  return (
    <div className={css['dip-container']}>
      <PageHero
        title={dip.title}
        titleClassName={css['hero-title']}
        path={[{ text: 'dips', url: '/dips' }, { text: dip.title }]}
        renderCustom={() => {
          return (
            <div className={css['nav']}>
              <Link to={dip.prev_dip} className={`button bold black ghost ${css['prev']}`}>
                <ArrowLeft />
                {intl('previous')}
              </Link>

              {dip.next_dip && (
                <Link to={dip.next_dip} className={`button bold black ghost ${css['next']}`}>
                  {intl('next')} <ArrowRight />
                </Link>
              )}
            </div>
          )
        }}
      />

      <div className="section clear-bottom">
        {/* <div className={css['header']}>
            <div className={css['dip-number']}>
              <p className="h3 bold">DIP</p>
              <p className="h2 bold">{leftPad(dip.number + '')}</p>
            </div>

            <h1 className={css['title']}>{dip.title}</h1>

            <Links dip={dip} />
          </div> */}

        <div className={`clear-bottom ${css['meta']}`}>
          <div className={css['dip-number']}>
            <h2 className="h2 bold text-uppercase text-underline">
              DIP {leftPad(dip.number + '')}: {dip.title}
            </h2>
          </div>
          <Links dip={dip} />
        </div>

        {/* <Table itemKey="number" items={[dip]} columns={tableColumns} /> */}
        {dip.body && <div dangerouslySetInnerHTML={{ __html: dip.body ?? '' }} className="markdown" />}
      </div>
    </div>
  )
}
