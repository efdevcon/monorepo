import { graphql } from 'gatsby'

export const query = graphql`
  fragment NavigationData on Query {
    navigationData: allMarkdownRemark(filter: { fields: { collection: { eq: "navigation" } } }) {
      nodes {
        frontmatter {
          title
          links(language: $language) {
            title
            type
            url
            links {
              title
              type
              url
            }
          }
        }
      }
    }
  }
`
