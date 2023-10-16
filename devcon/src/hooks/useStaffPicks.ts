import { Playlist } from 'types/Playlist'

export const useStaffPicks = (): Playlist => {
  return {} as Playlist
  // const data = useStaticQuery(graphql`
  //   query {
  //     playlist: markdownRemark(fields: { slug: { eq: "/archive/playlists/staff-picks/" } }) {
  //       id
  //       frontmatter {
  //         title
  //         description
  //         imageUrl
  //         image {
  //           childImageSharp {
  //             gatsbyImageData(layout: FULL_WIDTH, placeholder: BLURRED)
  //           }
  //         }
  //         categories
  //         curators
  //         profiles {
  //           id
  //           name
  //           lang
  //           description
  //           imageUrl
  //           role
  //           slug
  //         }
  //         videos
  //         archiveVideos {
  //           id
  //           slug
  //           title
  //           description
  //           edition
  //           youtubeUrl
  //           imageUrl
  //           image {
  //             childImageSharp {
  //               id
  //               gatsbyImageData(layout: FULL_WIDTH, placeholder: BLURRED, quality: 100)
  //             }
  //           }
  //           ipfsHash
  //           duration
  //           expertise
  //           type
  //           track
  //           tags
  //           speakers
  //         }
  //       }
  //       fields {
  //         collection
  //         slug
  //         id
  //       }
  //     }
  //   }
  // `)

  // return mapToPlaylist(data.playlist)
}
