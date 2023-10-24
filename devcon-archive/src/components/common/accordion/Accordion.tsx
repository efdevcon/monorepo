import React, { useState } from 'react'
import { AccordionItem } from './AccordionItem'
import css from './accordion.module.scss'

import IconMinus from 'src/assets/icons/minus.svg'
import IconPlus from 'src/assets/icons/plus.svg'
import IconArrowCollapse from 'src/assets/icons/arrow_collapse.svg'
import IconArrowDropdown from 'src/assets/icons/arrow_drop_down.svg'

interface AccordionProps {
  title?: string
  items: AccordionItem[]
  open: boolean
}

export function Accordion(props: AccordionProps) {
  const [opens, setOpens] = useState(props.items.map(i => props.open))
  const [showQuestions, setShowQuestions] = useState(true)

  function toggle(index: number) {
    if (index === -1) {
      const newState = opens.includes(false) ? true : false
      setOpens(props.items.map(i => newState))
    } else {
      opens[index] = !opens[index]
      setOpens([...opens])
    }
  }

  return (
    <div>
      {props.title && (
        <div
          role="button"
          className={css['category']}
          aria-label={`Toggle ${props.title}`}
          onClick={() => setShowQuestions(!showQuestions)}
        >
          <h3>{props.title}</h3>
          {showQuestions && <IconMinus />}
          {!showQuestions && <IconPlus />}
        </div>
      )}

      {props.items.length > 0 &&
        showQuestions &&
        props.items.map((item, index) => {
          const open = opens[index]

          return (
            <div id={item.id} key={item.id} className={css['item-container']}>
              <div className={css[open ? 'active' : 'header']} onClick={() => toggle(index)}>
                <p className="font-lg">{item.title}</p>
                <div className={css['icon']}>{open ? <IconArrowCollapse /> : <IconArrowDropdown />}</div>
              </div>
              {open && (
                <div className={css['body']}>
                  <p dangerouslySetInnerHTML={{ __html: item.body }} />
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
