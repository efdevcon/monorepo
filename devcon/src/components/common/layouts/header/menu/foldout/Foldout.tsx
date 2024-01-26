import React, { useEffect } from 'react'
import css from './foldout.module.scss'
import { Newsletter } from 'components/common/newsletter'
import { SocialMedia } from 'components/common/layouts/footer'
import useGetElementHeight from 'hooks/useGetElementHeight'
import { Copyright } from 'components/common/layouts/Copyright'
import { createPortal } from 'react-dom'

const Foldout = (props: any) => {
  const headerHeight = useGetElementHeight('header')
  const stripHeight = useGetElementHeight('strip')
  const fullHeaderHeight = headerHeight + stripHeight
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <></>

  let foldoutClassName = `${css['foldout']} section`

  if (props.foldoutOpen) foldoutClassName += ` ${css['open']}`

  // Moving the foldout content to the root so we have better control over z-index in relation to the header
  return (
    <>
      {createPortal(
        <div className={foldoutClassName} style={{ '--headerHeight': `${fullHeaderHeight}px` } as any}>
          <div>
            <div className={css['top']}>{props.children}</div>

            <div className={css['bottom']}>
              <div className={css['social-media']}>
                <p>Social</p>
                <SocialMedia url="devcon.org" className={css['social-media-extension']} onShare={() => {}} />
              </div>

              <div className={css['newsletter']}>
                <Newsletter id="foldout_newsletter_email" />
              </div>

              <div className={css['copyright']}>
                <Copyright />
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
