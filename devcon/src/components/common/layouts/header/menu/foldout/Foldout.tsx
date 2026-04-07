import React, { useEffect } from 'react'
import css from './foldout.module.scss'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { createPortal } from 'react-dom'
import { Link } from 'components/common/link'
import useNavigationData from '../../useNavigationData'
import { ArrowUpRight, Twitter, Instagram } from 'lucide-react'
import FarcasterIcon from 'assets/icons/farcaster.svg'

const Foldout = (props: any) => {
  const headerHeight = useGetElementHeight('header')
  const stripHeight = useGetElementHeight('strip')
  const fullHeaderHeight = headerHeight + stripHeight
  const [mounted, setMounted] = React.useState(false)
  const navigationData = useNavigationData()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <></>

  let foldoutClassName = css['foldout']

  if (props.foldoutOpen) foldoutClassName += ` ${css['open']}`

  // Find CTA items (highlighted items without children, like "View Tickets")
  const ctaItem = navigationData.site.find((i: any) => i.highlight && (!i.links || i.links.length === 0))

  return (
    <>
      {createPortal(
        <div className={foldoutClassName} style={{ '--headerHeight': `${fullHeaderHeight}px` } as any}>
          <div>
            <div className={css['top']}>{props.children}</div>

            <div className={css['bottom']}>
              {/* CTA Group */}
              <div className={css['cta-group']}>
                {ctaItem && (
                  <Link
                    to={ctaItem.url}
                    className={css['cta-primary']}
                    onClick={() => props.setFoldoutOpen(false)}
                  >
                    {ctaItem.title}
                  </Link>
                )}

                <div className={css['cta-row']}>
                  <Link
                    to="https://devcon.org"
                    className={css['cta-secondary']}
                    onClick={() => props.setFoldoutOpen(false)}
                  >
                    Subscribe
                    <ArrowUpRight size={16} />
                  </Link>

                  <div className={css['social-icons']}>
                    {[
                      { icon: <Twitter size={16} />, url: 'https://x.com/efdevcon' },
                      { icon: <Instagram size={16} />, url: 'https://instagram.com/efdevcon' },
                      { icon: <FarcasterIcon style={{ width: 16, height: 16 }} />, url: 'https://warpcast.com/devcon' },
                    ].map(social => (
                      <a
                        key={social.url}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css['social-icon-btn']}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* EF Sign off */}
              <div className={css['ef-signoff']}>
                <p className={css['signoff-crafted']}>Crafted with passion ♥ ✨ in the Infinite Garden</p>
                <p className={css['signoff-copyright']}>© 2026 — Ethereum Foundation. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// const Foldout = (props: any) => {
//   return (
//     <FoldoutContent foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
//       {props.children}
//     </FoldoutContent>
//   )
// }

export { Foldout }
