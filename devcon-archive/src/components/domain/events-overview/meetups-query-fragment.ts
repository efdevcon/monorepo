import { graphql } from 'gatsby'

export const query = graphql`
  fragment MeetupData on Query {
    meetups: allMarkdownRemark(filter: { fields: { collection: { eq: "meetups" }, lang: { eq: $language } } }) {
      nodes {
        id
        html
        fields {
          id
        }
        frontmatter {
          title
          location
          imageUrl
          url
        }
      }
    }
  }
`
