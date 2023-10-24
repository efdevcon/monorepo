import React from 'react'
import { graphql } from 'gatsby'
import Content from 'src/components/common/layouts/content'
import { pageHOC } from 'src/context/pageHOC'
import themes from './themes.module.scss'

export default pageHOC(function BlogTemplate({ data }: any) {
  const blog = data.markdownRemark

  if (!blog || !blog.frontmatter) return <></>

  return (
    <Content theme={themes['blue']}>
      {/* <SEO title={blog.frontmatter.Title} canonicalUrl={blog.frontmatter.permaLink} />

      <h2>{blog.frontmatter.title}</h2>
      <small>{blog.frontmatter.date}</small>
      <div dangerouslySetInnerHTML={{ __html: blog.html }} /> */}
    </Content>
  )
})

export const query = graphql`
  query ($language: String!) {
    ...Notification
    ...NavigationData
  }
`
