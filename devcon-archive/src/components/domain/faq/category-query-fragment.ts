import { graphql } from 'gatsby'

export const query = graphql`
  fragment Categories on Query {
    categories: allMarkdownRemark(filter: { fields: { collection: { eq: "categories" }, lang: { eq: $language } } }) {
      nodes {
        frontmatter {
          title
        }
        fields {
          id
        }
      }
    }
  }
`
