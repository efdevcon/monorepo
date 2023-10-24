import { useStaticQuery, graphql } from 'gatsby'
import { Playlist } from 'src/types/Playlist'

export const usePlaylists = (): Array<Playlist> => {
  const data = useStaticQuery(graphql`
    query {
      playlists: allMarkdownRemark(filter: { fields: { collection: { eq: "playlists" } } }) {
        nodes {
          id
          frontmatter {
            title
            description
            image {
              childImageSharp {
                gatsbyImageData(layout: FULL_WIDTH, placeholder: BLURRED)
              }
            }
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
              youtubeUrl
              image {
                childImageSharp {
                  gatsbyImageData(layout: FULL_WIDTH, placeholder: BLURRED)
                }
              }
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
          fields {
            collection
            slug
            id
          }
        }
      }
    }
  `)

  return data.playlists.nodes.map((i: any) => mapToPlaylist(i))
}

export function mapToPlaylist(source: any): Playlist {
  return {
    id: source.fields.id,
    slug: source.fields.slug,
    title: source.frontmatter.title,
    description: source.frontmatter.description,
    image: source.frontmatter.image,
    curators: source.frontmatter.curators,
    profiles: source.frontmatter.profiles,
    categories: source.frontmatter.categories,
    videoCount: source.frontmatter.archiveVideos.length,
    videos: source.frontmatter.archiveVideos,
  }
}
