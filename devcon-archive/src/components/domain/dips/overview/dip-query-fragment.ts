import { graphql } from 'gatsby'

export const query = graphql`
  fragment DipsData on Query {
    contributors: allContributorsJson(filter: { url: { ne: null } }) {
      nodes {
        name
        avatarUrl
      }
    }
    dips: allMarkdownRemark(
      filter: { fields: { lang: { eq: $language }, collection: { eq: "dips" } } }
      sort: { fields: frontmatter___DIP }
    ) {
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
        excerpt(pruneLength: 280)
        fields {
          slug
        }
      }
    }
  }
`
