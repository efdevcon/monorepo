import React from 'react'
// import IconCheck from 'src/assets/icons/check_circle.svg'
// import IconPlus from 'src/assets/icons/plus.svg'
// import IconArrowRight from 'src/assets/icons/arrow_right.svg'
import css from './interests.module.scss'
import { chunkArray } from 'src/utils/chunk-array'
// import { Button } from 'src/components/common/button'
import { useQueryStringer } from 'src/hooks/useQueryStringer'
import { usePageContext } from 'src/context/page-context'
import { Link } from 'src/components/common/link'
// import NorthEast from 'src/assets/icons/north_east.svg'

export const Interests = (props: any) => {
  const [selectedTags, setSelectedTags] = React.useState({} as { [key: string]: any })
  const tags = usePageContext()?.data.distinctVideoTags.filter((i: string) => !!i)
  const tagRows = chunkArray(tags, 1 /*2*/) // Accounts currently missing, so we'll wait with chunking the array to take up more horizontal space in the meantime
  const queryString = useQueryStringer({ tags: selectedTags }, false)

  // const hasSelectedTags = Object.keys(selectedTags).length > 0

  return (
    <div className="section">
      <div className={`${css['container']} content padding-bottom`}>
        <div className={css['header']}>
          <h2 className={`bold font-xl font-primary ${css['title']}`}>Explore Devcon Archive —</h2>
          <p className="font-sm">
            Dive into the immersive world of Devcon content by selecting topics most relevant to your interest.
          </p>
          <p className={css['unicorn']}>✨🦄</p>
        </div>

        <div className={css['tags-container']}>
          <p className="bold font-sm">Choose Category</p>
          {tagRows.map((tagRow, index) => {
            return (
              <div key={index} className={css['tags']}>
                {tagRow.map(tag => {
                  let className = `${css['tag']} label label-hover plain white`
                  // const selected = selectedTags[tag]

                  // if (selected) className += ` ${css['selected']} black`

                  return (
                    <Link
                      className={className}
                      key={tag}
                      to={`/archive/watch?tags=${encodeURIComponent(tag)}`}
                      // onClick={() => {
                      //   const nextTags = {
                      //     ...selectedTags,
                      //     [tag]: true,
                      //   } as any

                      //   const selected = selectedTags[tag]

                      //   if (selected) delete nextTags[tag]

                      //   setSelectedTags(nextTags)
                      // }}
                    >
                      {/* <div className={css['icons']}>
                        <IconCheck className={`icon ${css['icon-check']}`} />
                        <IconPlus className={`icon ${css['icon-plus']}`} />
                      </div> */}
                      <span>{tag}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* <div className={css['clear']}>
            <Button
              disabled={!hasSelectedTags}
              className={`${css['continue']} font-sm red`}
              to={`/archive/watch${queryString}`}
            >
              <span className={css['text']}>View talks</span> <IconArrowRight className={`icon ${css['text-icon']}`} />
            </Button>

            {hasSelectedTags && (
              <p className={`${css['clear']} bold text-underline`} onClick={() => setSelectedTags({})}>
                Clear All
              </p>
            )}
          </div> */}
        </div>
      </div>
    </div>
  )
}
