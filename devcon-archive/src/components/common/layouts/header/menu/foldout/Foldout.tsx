import React, { useEffect } from 'react'
import css from './foldout.module.scss'
import { Newsletter } from 'src/components/common/newsletter'
import { SocialMedia } from 'src/components/common/layouts/footer'
import useGetElementHeight from 'src/hooks/useGetElementHeight'
import { Copyright } from 'src/components/common/layouts/Copyright'
import { createPortal } from 'react-dom'

const FoldoutContent = (props: any) => {
  const headerHeight = useGetElementHeight('header')
  const stripHeight = useGetElementHeight('strip')
  const fullHeaderHeight = headerHeight + stripHeight
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  let foldoutClassName = `${css['foldout']}`

  if (props.foldoutOpen) foldoutClassName += ` ${css['open']}`

  // Moving the foldout content to the root so we have better control over z-index in relation to the header
  return createPortal(
    <div className={foldoutClassName} style={{ '--headerHeight': `${fullHeaderHeight}px` }}>
      <div>
        <div className={css['top']}>{props.children}</div>

        <div className={css['bottom']}>
          <div className={css['social-media']}>
            <p>Social</p>
            <SocialMedia url="devcon.org" className={css['social-media-extension']} />
          </div>

          <div className={css['newsletter']}>
            <Newsletter id='foldout_newsletter_email' />
          </div>

          <div className={css['copyright']}>
            <Copyright />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

const Foldout = (props: any) => {
  // const iconProps = {
  //   id: 'hamburger-toggle',
  //   className: `icon ${css['toggle']}`,
  //   onClick: () => props.setFoldoutOpen(!props.foldoutOpen),
  //   role: 'button',
  // }

  return (
    <>
      {/* <div className={css['toggle-container']}>
        {props.foldoutOpen ? <IconCross {...iconProps} style={{ width: '0.8em' }} /> : <IconMenu {...iconProps} />}
      </div> */}

      <FoldoutContent foldoutOpen={props.foldoutOpen} setFoldoutOpen={props.setFoldoutOpen}>
        {props.children}
      </FoldoutContent>
    </>
  )
}

export { Foldout }
