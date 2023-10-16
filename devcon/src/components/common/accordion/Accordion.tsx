import React from 'react'
import IconMinus from 'assets/icons/chevron-up.svg'
import IconPlus from 'assets/icons/chevron-down.svg'
import css from './accordion.module.scss'
import { AccordionItem } from './types'

interface AccordionProps {
  items: AccordionItem[]
  dense?: boolean
}

const Accordion = (props: AccordionProps) => {
  const [open, setOpen] = React.useState<{ [key: string]: boolean }>({})

  let className = css['accordion']

  if (props.dense) className += ` ${css['dense']}`

  return (
    <ul className={className}>
      {props.items.map((item: AccordionItem) => {
        let className = css['accordion-item']

        const selected = open[item.id]

        if (selected) className += ` ${css['open']}`

        return (
          <li
            id={item.id.toString()}
            key={item.id}
            onClick={(e: any) => {
              const nextOpenState = {
                ...open,
                [item.id]: !selected,
              }

              // If clicking on a link it can be a bit jarring if the accordion closes so we'll hold off in that case
              if (e.target?.tagName === 'A') return

              setOpen(nextOpenState)
            }}
            className={className}
          >
            <div className={css['header']}>
              <span className={css['title']}>{item.title}</span>
              {selected ? <IconMinus /> : <IconPlus />}
            </div>
            <div className={css['content']}>{item.body}</div>
          </li>
        )
      })}
    </ul>
  )
}

export default Accordion
