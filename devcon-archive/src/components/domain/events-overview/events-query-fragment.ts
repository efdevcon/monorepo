import { graphql } from 'gatsby'

export const query = graphql`
  fragment EventsData on Query {
    events: allMarkdownRemark(
      filter: { fields: { collection: { eq: "events" }, lang: { eq: $language } } }
      sort: { fields: frontmatter___startDate, order: ASC }
    ) {
      nodes {
        id
        html
        fields {
          id
        }
        frontmatter {
          title
          startDate
          endDate
          imageUrl
          url
        }
      }
    }
  }
`
