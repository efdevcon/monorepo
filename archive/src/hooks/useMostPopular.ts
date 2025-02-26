import { useStaticQuery, graphql } from 'gatsby'
import { Playlist } from 'src/types/Playlist'
import { mapToPlaylist } from './usePlaylists'

export const useMostPopular = (): Playlist => {
  const data = useStaticQuery(graphql`
    query {
      playlist: markdownRemark(fields: { slug: { eq: "/archive/playlists/most-popular/" } }) {
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
  `)

  return mapToPlaylist(data.playlist)
}
