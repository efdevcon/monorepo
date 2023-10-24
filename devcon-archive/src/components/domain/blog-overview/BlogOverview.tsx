import moment from 'moment'
import React from 'react'
import { Card } from 'src/components/common/card'
import { useBlogs } from 'src/hooks/useBlogs'
import { BlogPost } from 'src/types/BlogPost'
import css from './blog-overview.module.scss'

interface Props {
  maxItems?: number
  className?: string
}

export const BlogOverview = (props: Props) => {
  const blogs: BlogPost[] = [] // useBlogs(props.maxItems) - NOT USED ON Archive

  let className = css['overview']
  if (props.className) className += ` ${props.className}`

  return (
    <div className={className}>
      {blogs.map((blog: BlogPost) => {
        return (
          <div className={css['outer']} id={blog.id}>
            <Card
              className={css['card']}
              key={blog.slug}
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
