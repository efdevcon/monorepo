import React from 'react'
import css from './accordion.module.scss'
import ChevronDown from 'assets/icons/plus.svg'
import ChevronUp from 'assets/icons/minus.svg'

export const AccordionItem = React.forwardRef((props: any, ref: any) => {
  const [open, setOpen] = React.useState(props.alwaysOpen || false)
  let className = css['accordion']

  if (props.className) className += ` ${props.className}`
  if (props.alwaysOpen) className += ` ${css['always-open']}`

  React.useEffect(() => {}, [])

  React.useImperativeHandle(ref, () => {
    return {
      open: () => setOpen(true),
    }
  })

  return (
    <div className={className}>
      <div id={props.id} className={`big-text ${css['toggle']}`} onClick={() => setOpen(props.alwaysOpen || !open)}>
        {props.title}
        {open ? <ChevronUp /> : <ChevronDown />}
      </div>
      {open && <div className={css['content']}>{props.children}</div>}
    </div>
  )
})

AccordionItem.displayName = 'AccordionItem'

const Accordion = (props: any) => {
  let className = css['accordions']

  if (props.className) className += ` ${props.className}`

  return <div className={className}>{props.children}</div>
}

export default Accordion
