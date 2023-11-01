import { ArchiveVideo } from 'types/ArchiveVideo'

export const useArchiveVideos = (): Array<ArchiveVideo> => {
  return []
  // const data = useStaticQuery(graphql`
  //   query {
  //     videos: allMarkdownRemark(filter: { fields: { collection: { eq: "videos" } } }) {
  //       nodes {
  //         id
  //         fields {
  //           slug
  //           path
  //         }
  //         frontmatter {
  //           title
  //           edition
  //           description
  //           youtubeUrl
  //           ipfsHash
  //           duration
  //           expertise
  //           type
  //           track
  //           tags
  //           speakers
  //           profiles {
  //             id
  //             name
  //             lang
  //             description
  //             imageUrl
  //             role
  //             slug
  //           }
  //         }
  //       }
  //     }
  //   }
  // `)

  // return data.videos.nodes.map((i: any) => mapToArchiveVideo(i))
}

export function mapToArchiveVideo(source: any): ArchiveVideo {
  return {
    id: source.id,
    slug: source.fields.slug,
    edition: source.frontmatter.edition,
    title: source.frontmatter.title,
    description: source.frontmatter.description,
    youtubeUrl: source.frontmatter.youtubeUrl,
    ipfsHash: source.frontmatter.ipfsHash,
    duration: source.frontmatter.duration,
    expertise: source.frontmatter.expertise,
    relatedVideos: source.frontmatter.relatedVideos,
    type: source.frontmatter.type,
    track: source.frontmatter.track,
    keywords: source.frontmatter.keywords,
    tags: source.frontmatter.tags,
    speakers: source.frontmatter.speakers,
    profiles: source.frontmatter.profiles,
  }
}
