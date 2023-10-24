import React from 'react'
import IconArrowDown from 'src/assets/icons/arrow_drop_down.svg'
import { Link } from 'src/components/common/link'
import css from './navigation.module.scss'
import { Link as LinkType } from 'src/types/Link'
import ArrowCollapse from 'src/assets/icons/arrow_collapse.svg'
import ArrowDropdown from 'src/assets/icons/arrow_drop_down.svg'
import OnDemandVideoIcon from 'src/assets/icons/on_demand_video.svg'

const Mobile = (props: any) => {
  const [openItem, setOpenItem] = React.useState<string | undefined>()

  const closeFoldout = () => {
    props.setFoldoutOpen(false)
  }

  return (
    <div className={css['mobile-navigation']}>
      <ul className={css['accordion']}>
        {props.navigationData.site.map((i: LinkType, index: number) => {
          const children = i.links
          const hasChildren = children && children.length > 0
          const open = openItem === i.title

          return (
            <li key={i.title} className={open && hasChildren ? css['open'] : ''}>
              {i.logo && (
                <div className={css['foldout-background']}>
                  <img src={i.logo} alt={`${i.title}: background logo`} />
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
                    className={`plain hover-underline`}
                    style={
                      i.title === 'Watch'
                        ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }
                        : undefined
                    }
                    to={i.url}
                    onClick={closeFoldout}
                  >
                    {i.title}
                    {i.title === 'Watch' && <OnDemandVideoIcon style={{ fontSize: '1em' }} />}
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
                          return <p className={css['category-header']}>{child.title}</p>
                        }

                        return (
                          <ul key={child.title} className={css['category-items']}>
                            <li key={child.title}>
                              <Link className="plain hover-underline" to={child.url} onClick={closeFoldout}>
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
  if (props.mobile) {
    return <Mobile {...props} />
  }

  return (
    <>
      <ul className={css['navigation']}>
        {props.navigationData.site.map((i: LinkType, index: number) => {
          const primaryKey = `site-nav-1_${index}`
          const hasChildren = i.links && i.links.length > 0

          const link = (() => {
            let className = `${css['foldout-link']} bold`

            const isWatch = i.title === 'Watch'

            // Just keeping it simple since this is possibly a one-off thing - can generalize later if needed
            if (isWatch) {
              className += ` ${css['highlight']}`
            } else {
              className += ` plain`
            }

            return (
              <Link className={className} to={i.url}>
                {i.title}
                {isWatch && <OnDemandVideoIcon />}
              </Link>
            )
          })()

          return (
            <li className="plain bold" key={primaryKey}>
              {hasChildren ? (
                <>
                  {i.title}
                  <IconArrowDown style={{ width: '10px', height: '5px', margin: '8px' }} />
                  <div className={css['foldout']}>
                    {i.logo && (
                      <div className={css['foldout-background']}>
                        <img src={i.logo} alt={`${i.title}: background logo`} />
                      </div>
                    )}
                    {i.links && i.links.length > 0 && (
                      <ul>
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
                              <Link className={`${css['foldout-link']} plain`} to={c.url}>
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
