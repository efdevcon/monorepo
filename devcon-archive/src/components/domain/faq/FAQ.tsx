import React from 'react'
import { Category } from 'src/types/Category'
import { FAQ as FaqType } from 'src/types/FAQ'
import { Accordion, AccordionItem } from '../../common/accordion'
import css from './faq.module.scss'

interface FaqProps {
  data: Array<Category>
  filter?: string
  customCategoryTitle?: string // ideally used with a single FAQ category
}

export function FAQ(props: FaqProps) {
  function filter(questions: Array<FaqType>): Array<AccordionItem> {
    if (!props.filter) return questions

    const filter = props.filter.toLowerCase()
    const filtered = questions.filter(
      i => i.title.toLowerCase().includes(filter) || i.body.toLowerCase().includes(filter)
    )
    return filtered.map(i => {
      return { id: i.id, title: i.title, body: i.body }
    })
  }

  return (
    <div className={css['container']}>
      {props.data.map((category: Category) => {
        return (
          <Accordion
            key={category.id}
            open={false}
            title={props.customCategoryTitle || category.title}
            items={filter(category.questions)}
          />
        )
      })}
    </div>
  )
}
