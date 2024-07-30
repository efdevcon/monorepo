import { ArchiveVideo } from 'src/types/ArchiveVideo'

export const videoResolver = {
  type: '[ArchiveVideo]',
  resolve: (source: any, args: any, context: any) => {
    const videos = source['videos']
    if (!videos) return []

    const filter: any = {
      fields: {
        collection: {
          eq: 'videos',
        },
        path: {
          in: videos,
        },
      },
    }

    return context.nodeModel
      .runQuery({
        query: {
          filter,
        },
        type: 'MarkdownRemark',
      })
      .then((videos: any) => {
        return videos.map((source: any) => {
          return {
            id: source.id,
            slug: source.fields.slug,
            edition: source.frontmatter.edition,
            title: source.frontmatter.title,
            description: source.frontmatter.description,
            slidesUrl: source.frontmatter.slidesUrl,
            youtubeUrl: source.frontmatter.youtubeUrl,
            image: source.fields.image,
            imageUrl: source.frontmatter.imageUrl,
            ipfsHash: source.frontmatter.ipfsHash,
            ethernaIndex: source.frontmatter.ethernaIndex,
            ethernaPermalink: source.frontmatter.ethernaPermalink,
            duration: source.frontmatter.duration,
            expertise: source.frontmatter.expertise,
            type: source.frontmatter.type,
            track: source.frontmatter.track,
            tags: source.frontmatter.tags,
            speakers: source.frontmatter.speakers,
            profiles: source.frontmatter.profiles,
          } as ArchiveVideo
        })
      })
  },
  args: {},
};

export const distinctVideoTagsResolver = {
  type: '[String]',
  resolve: (source: any, args: any, context: any) => {
    return [
      'Cryptoeconomics',
      'Devcon',
      'Developer Experience',
      'Coordination',
      'Core Protocol',
      'Layer 2s',
      'Real World Ethereum',
      'Cypherpunk & Privacy',
      'Security',
      'Applied Cryptography',
      'Usability'
    ]
  },
  args: {},
}
