import { graphql } from 'gatsby'

export const query = graphql`
  fragment VideoData on Query {
    video: allMarkdownRemark(filter: { fields: { slug: { eq: $slug }, collection: { eq: "videos" } } }) {
      nodes {
        fields {
          id
          slug
        }
        frontmatter {
          title
          description
          edition
          slidesUrl
          youtubeUrl
          ipfsHash
          ethernaIndex
          ethernaPermalink
          duration
          expertise
          type
          track
          tags
          speakers
          profiles {
            id
            name
            lang
            description
            imageUrl
            role
            slug
          }
        }
      }
    }
  }

  fragment RelatedVideos on Query {
    relatedVideos: allMarkdownRemark(
      filter: { fields: { slug: { ne: $slug }, collection: { eq: "videos" } }, frontmatter: { tags: { regex: $tags } } }
    ) {
      nodes {
        fields {
          id
          slug
        }
        frontmatter {
          title
          description
          edition
          slidesUrl
          youtubeUrl
          ipfsHash
          ethernaIndex
          ethernaPermalink
          duration
          expertise
          type
          track
          tags
          speakers
        }
      }
    }
  }

  fragment VideoPlaylists on Query {
    playlists: allMarkdownRemark(filter: { frontmatter: { archiveVideos: { elemMatch: { slug: { eq: $slug } } } } }) {
      nodes {
        id
        fields {
          slug
          collection
        }
        frontmatter {
          title
          description
          imageUrl
          categories
          curators
          profiles {
            id
            name
            lang
            description
            imageUrl
            role
            slug
          }
          videos
          archiveVideos {
            id
            slug
            title
            description
            edition
            slidesUrl
            youtubeUrl
            ipfsHash
            ethernaIndex
            ethernaPermalink
            duration
            expertise
            type
            track
            tags
            speakers
          }
        }
      }
    }
  }

  fragment NavigationArchiveEvents on Query {
    distinctVideoTags
    navigationArchiveEvents: allMarkdownRemark(
      filter: {
        frontmatter: { title: { in: ["Devcon 0", "Devcon 1", "Devcon 2", "Devcon 3", "Devcon 4", "Devcon 5"] } }
      }
      sort: { fields: frontmatter___title }
    ) {
      nodes {
        id
        frontmatter {
          title
          archiveVideos {
            slug
          }
        }
      }
    }
  }
`
