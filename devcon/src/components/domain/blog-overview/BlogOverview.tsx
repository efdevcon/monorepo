import moment from 'moment'
import React from 'react'
import { Card } from 'components/common/card'
import { BlogPost } from 'types/BlogPost'
import css from './blog-overview.module.scss'

interface Props {
  blogs: Array<BlogPost>
  maxItems?: number
  className?: string
}

export const BlogOverview = (props: Props) => {
  let className = css['overview']
  if (props.className) className += ` ${props.className}`

  return (
    <div className={className}>
      {props.blogs.map((blog: BlogPost) => {
        return (
          <div className={css['outer']} id={blog.id} key={blog.slug}>
            <Card
              className={css['card']}
              title={blog.title}
              description={blog.description}
              imageUrl={blog.imageUrl}
              expandLink={true}
              linkUrl={blog.permaLink}
              metadata={[moment(blog.date).format('ll'), blog.author]}
            />
          </div>
        )
      })}
    </div>
  )
}
