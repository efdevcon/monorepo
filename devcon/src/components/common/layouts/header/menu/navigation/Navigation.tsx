import React from 'react'
import IconArrowDown from 'assets/icons/arrow_drop_down.svg'
import { Link } from 'components/common/link'
import css from './navigation.module.scss'
import { Link as LinkType } from 'types/Link'
import ArrowCollapse from 'assets/icons/arrow_collapse.svg'
import ArrowDropdown from 'assets/icons/arrow_drop_down.svg'
import Image from 'next/legacy/image'
import useNavigationData from '../../useNavigationData'
import IconCalendar from 'assets/icons/calendar.svg'
import IconWatch from 'assets/icons/on_demand_video.svg'
import { Button } from 'lib/components/button'

const Mobile = (props: any) => {
  const [openItem, setOpenItem] = React.useState<string | undefined>()
  const navigationData = useNavigationData()

  const closeFoldout = () => {
    props.setFoldoutOpen(false)
  }

  return (
    <div className={css['mobile-navigation']}>
      <ul className={`${css['accordion']} text-sm`}>
        {navigationData.site.map((i: LinkType, index: number) => {
          const children = i.links
          const hasChildren = children && children.length > 0
          const open = openItem === i.title

          return (
            <li key={i.title} className={open && hasChildren ? css['open'] : ''}>
              {i.logo && (
                <div className={css['foldout-background']}>
                  <i.logo />
                  {/* <Image src={i.logo} alt={`${i.title}: background logo`} layout="fill" /> */}
                </div>
              )}
              {hasChildren ? (
                <div
                  className={css['accordion-toggle']}
                  onClick={() => {
                    setOpenItem(open ? undefined : i.title)
                  }}
                >
                  {i.title}
                  {hasChildren && (open ? <ArrowCollapse /> : <ArrowDropdown />)}
                </div>
              ) : (
                <div className={`${css['accordion-toggle']} ${css['no-children']}`}>
                  <Link
                    className={`plain hover-underline button ${css[i.highlight as any]}`}
                    style={
                      i.highlight
                        ? {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                          }
                        : undefined
                    }
                    to={i.url}
                    onClick={closeFoldout}
                  >
                    <>
                      {i.title}
                      {i.highlight === 'app' && <IconCalendar style={{ fontSize: '1em' }} />}
                      {i.highlight === 'livestream' ||
                        (i.highlight === 'archive' && <IconWatch style={{ fontSize: '1em' }} />)}
                    </>
                  </Link>
                </div>
              )}

              {hasChildren && (
                <>
                  {open && (
                    <div className={css['accordion-content']}>
                      {children?.map(child => {
                        const isHeader = child.type === 'header'

                        if (isHeader) {
                          return (
                            <p key={child.title} className={css['category-header']}>
                              {child.title}
                            </p>
                          )
                        }

                        return (
                          <ul key={child.title} className={css['category-items']}>
                            <li key={child.title}>
                              <Link
                                className="plain hover-underline"
                                indicateExternal
                                to={child.url}
                                onClick={closeFoldout}
                              >
                                {child.title}
                              </Link>
                            </li>
                          </ul>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const Navigation = (props: any) => {
  const navigationData = useNavigationData()

  if (props.mobile) {
    return <Mobile {...props} />
  }

  return (
    <>
      <ul className={css['navigation']}>
        {navigationData.site.map((i: LinkType, index: number) => {
          const primaryKey = `site-nav-1_${index}`
          const hasChildren = i.links && i.links.length > 0

          const link = (() => {
            let className = `${css['foldout-link']} bold`

            if (i.highlight) {
              className += ` button ${css[i.highlight as any]}`

              if (['app'].includes(i.highlight)) {
                className += ` rounded-purple`
              } else {
                className += ` black`
              }
            } else {
              className += ` plain`
            }

            if (i.highlight === 'archive') {
              return (
                <Link to={i.url}>
                  <Button color="purple-1" className="shadow lg !py-1" fill>
                    <IconWatch className="mr-2 icon" />
                    {i.title}
                  </Button>
                </Link>
              )
            }

            return (
              <Link to={i.url} className={className}>
                <>
                  {i.highlight === 'app' && <IconCalendar />}
                  {i.highlight === 'livestream' && <IconWatch />}
                  {i.highlight === 'archive' && <IconWatch className="mr-2 icon" />}
                  {i.title}
                </>
              </Link>
            )
          })()

          return (
            <li className="plain bold" key={primaryKey}>
              {hasChildren ? (
                <>
                  {i.title}
                  <IconArrowDown style={{ width: '10px', height: '5px', margin: '8px' }} />
                  <div className={`${css['foldout']} rounded shadow-lg`}>
                    {i.logo && (
                      <div className={css['foldout-background']}>
                        <i.logo />
                        {/* <Image src={i.logo} alt={`${i.title}: background logo`} layout="fill" /> */}
                      </div>
                    )}
                    {i.links && i.links.length > 0 && (
                      <ul className="text-sm font-medium">
                        {i.links?.map((c: LinkType, subIndex: number) => {
                          const subKey = `site-nav-2_${subIndex}`

                          if (c.type === 'header') {
                            return (
                              <li key={subKey} className={css['header']}>
                                <span className={css['foldout-header']}>{c.title}</span>
                              </li>
                            )
                          }

                          if (c.type === 'links') {
                            // nothing?
                          }

                          return (
                            <li key={subKey}>
                              <Link indicateExternal className={`${css['foldout-link']} plain`} to={c.url}>
                                {c.title}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                link
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
