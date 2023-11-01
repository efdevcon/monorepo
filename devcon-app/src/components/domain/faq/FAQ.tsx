import React from 'react'
import { Category } from 'types/Category'
import { FAQ as FaqType } from 'types/FAQ'
import css from './faq.module.scss'
import Accordion from 'components/common/accordion'
import { AccordionItem } from 'components/common/accordion/types'
import { Input } from 'components/common/input-form'
import SearchIcon from 'assets/icons/search.svg'

interface FaqProps {
  data: Array<Category>
  filter?: string
  noSearch?: boolean
  customCategoryTitle?: string // ideally used with a single FAQ category
}

export function FAQ(props: FaqProps) {
  const [searchFilter, setSearchFilter] = React.useState('')

  const filterQuestions = (questions: Array<FaqType>) => {
    if (!searchFilter) return questions

    const filter = searchFilter.toLowerCase()
    const filtered = questions.filter(
      question => question.title.toLowerCase().includes(filter) || question.body.toLowerCase().includes(filter)
    )

    return filtered
  }

  const formatQuestions = (items: Array<FaqType>): Array<AccordionItem> => {
    return items.map(item => {
      return {
        id: item.title,
        title: item.title,
        body: <div className="markdown" dangerouslySetInnerHTML={{ __html: item.body }} />,
      }
    })
  }

  return (
    <div className={css['container']}>
      {!props.noSearch && (
        <div className={css['search']}>
          <Input
            placeholder="Search FAQ"
            onChange={(e: any) => setSearchFilter(e.target.value)}
            value={searchFilter}
            icon={SearchIcon}
          />
        </div>
      )}

      {props.data.map((category: Category) => {
        const items = formatQuestions(filterQuestions(category.questions))

        if (items.length === 0) return null

        return (
          <div id={category.id} className={css['accordion-container']} key={category.id}>
            <h2 className="spaced">{props.customCategoryTitle || category.title}</h2>
            <Accordion items={formatQuestions(filterQuestions(category.questions))} />
          </div>
        )
      })}
    </div>
  )
}
