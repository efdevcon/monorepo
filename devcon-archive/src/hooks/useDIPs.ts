import { useStaticQuery, graphql } from 'gatsby'
import { DIP, Contributor } from 'src/types/dip'

type DIPData = {
  dips: Array<DIP>
  contributors: Array<Contributor>
}

export const useDIPs = (): DIPData => {
  const data = useStaticQuery(graphql`
    query {
      contributors: allContributorsJson {
        nodes {
          name
          avatarUrl
        }
      }
      dips: allMarkdownRemark(filter: { fields: { collection: { eq: "dips" } } }, sort: { fields: frontmatter___DIP }) {
        nodes {
          frontmatter {
            DIP
            Title
            Status
            Themes
            Discussion
            Authors
            Resources_Required
            Github_URL
            Summary
            Tags
          }
          fields {
            slug
          }
        }
      }
    }
  `)

  return {
    dips: data.dips.nodes.map((i: any) => mapToDIP(i)),
    contributors: data.contributors.nodes.map((i: any) => i),
  }
}

export function mapToDIP(source: any): DIP {
  return {
    github: source.frontmatter.Github_URL,
    summary: source.frontmatter.Summary,
    number: source.frontmatter.DIP,
    title: source.frontmatter.Title,
    status: source.frontmatter.Status,
    themes: source.frontmatter.Themes ? source.frontmatter.Themes.split(',') : [],
    tags: source.frontmatter.Tags ? source.frontmatter.Tags.split(',') : [],
    authors: source.frontmatter.Authors ? source.frontmatter.Authors.split(',') : [],
    resources: source.frontmatter.Resources,
    discussion: source.frontmatter.Discussion,
    created: new Date(source.frontmatter.Created),
    next_dip: source.frontmatter.next_dip,
    prev_dip: source.frontmatter.prev_dip,
    // body: source.html,
    slug: source.fields?.slug,
  }
}
