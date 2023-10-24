import { graphql } from 'gatsby'

export const query = graphql`
  fragment FAQs on Query {
    faqs: allMarkdownRemark(
      filter: { fields: { collection: { eq: "faq" }, lang: { eq: $language } } }
      sort: { fields: frontmatter___order, order: ASC }
    ) {
      nodes {
        html
        frontmatter {
          title
          category
          order
        }
        fields {
          id
        }
      }
    }
  }
`
