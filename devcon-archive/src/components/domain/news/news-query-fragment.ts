import { graphql } from 'gatsby'

export const query = graphql`
  fragment NewsData on Query {
    newsData: allMarkdownRemark(
      filter: {
        fields: { lang: { in: [$language, "tweets", "blog-posts"] }, collection: { in: ["news", "news-external"] } }
      }
      sort: { fields: frontmatter___date, order: DESC }
    ) {
      nodes {
        fields {
          id
        }
        frontmatter {
          url
          title
          author
          date
          tags
        }
        rawMarkdownBody
      }
    }
  }

  fragment NewsDataInline on Query {
    newsDataInline: allMarkdownRemark(
      filter: {
        fields: { lang: { in: [$language, "tweets", "blog-posts"] }, collection: { in: ["news", "news-external"] } }
      }
      sort: { fields: frontmatter___date, order: DESC }
      limit: 10
    ) {
      nodes {
        fields {
          id
        }
        frontmatter {
          url
          title
          author
          date
          tags
        }
        rawMarkdownBody
      }
    }
  }

  fragment Notification on Query {
    notification: allMarkdownRemark(
      filter: {
        fields: { collection: { eq: "notifications" }, lang: { eq: $language } }
        frontmatter: { active: { eq: true } }
      }
      limit: 1
    ) {
      nodes {
        frontmatter {
          url
          label
          labelType
        }
        rawMarkdownBody
      }
    }
  }

  fragment NewsItemData on Query {
    newsData: allMarkdownRemark(
      filter: { fields: { slug: { eq: $slug }, lang: { eq: $language }, collection: { eq: "news" } } }
    ) {
      nodes {
        fields {
          id
        }
        frontmatter {
          url
          title
          imageUrl
          author
          date
          tags
        }
      }
    }
  }
`
