import React from 'react'
import css from './collapsed.module.scss'
import ChevronDown from 'src/assets/icons/chevron-down.svg'
import ChevronUp from 'src/assets/icons/chevron-up.svg'

interface SectionProps {
  title?: string
  children?: any
  className?: string
  open?: boolean
  setOpen?: (open: boolean) => void
}

const CollapsedSectionHeader = (props: any) => {
  return (
    <div className={css['header']} onClick={() => props.setOpen(!props.open)}>
      {props.children}

      <div className={css['icon']}>{props.open ? <ChevronUp /> : <ChevronDown />}</div>
    </div>
  )
}

CollapsedSectionHeader.displayName = 'CollapsedSectionHeader'

export { CollapsedSectionHeader }

export const CollapsedSectionContent = (props: any) => {
  const [contentHeight, setContentHeight] = React.useState(props.open ? 'auto' : '0px')
  const ref = React.useRef<any>()
  const locked = React.useRef<any>()
  const mounting = React.useRef<any>(true)

  React.useEffect(() => {
    // Ignoring the initial mount to ensure our 0px default doesn't get overridden
    if (mounting.current) {
      mounting.current = false

      return
    }

    if (props.open) {
      setContentHeight(`${ref.current.scrollHeight}px`)
      // ref.current.style.setProperty('--contentHeight', `${ref.current.scrollHeight}px`)
    } else {
      locked.current = true

      // Can't animate from auto to 0px:
      // Have to stagger the content height changes to move element height from "auto" => natural size (in exact px) => 0px
      // Have to "lock" so the transition event handler doesn't re-trigger while this occurs
      setContentHeight(`${ref.current.scrollHeight}px`)

      setTimeout(() => {
        setContentHeight(`0px`)
        ref.current.style.setProperty('--contentHeight', `0px`)

        locked.current = false
      }, 10)
    }
  }, [props.open])

  React.useEffect(() => {
    if (props.open) {
      // Set height to auto when the transition completes - this allows the content to change size after it becomes visible
      const handler = () => {
        if (locked.current) return

        setContentHeight('auto')
      }

      const el = ref.current

      el.addEventListener('transitionend', handler)

      return () => {
        el.removeEventListener('transitionend', handler)
      }
    }
  }, [props.open])

  return (
    <div ref={ref} className={css['content']} style={{ '--contentHeight': contentHeight }}>
      {props.children}
    </div>
  )
}

export function CollapsedSection(props: SectionProps) {
  const isControlled = !!props.setOpen
  const [open, setOpen] = React.useState(isControlled ? props.open : false)
  let className = css['container']

  if (props.className) className += ` ${props.className}`

  return (
    <div className={className}>
      {React.Children.map(props.children, child => {
        if (child && child.type.displayName === 'CollapsedSectionHeader')
          return React.cloneElement(child, {
            open: isControlled ? props.open : open,
            setOpen: isControlled ? props.setOpen : setOpen,
          })

        return React.cloneElement(child, { open: isControlled ? props.open : open })
      })}
    </div>
  )
}
