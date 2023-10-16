import { UserProfile } from './UserProfile'

export interface ArchiveVideo {
  id: string
  slug: string
  edition: number
  title: string
  relatedVideos: [ArchiveVideo]
  description: string
  youtubeUrl: string
  image?: any
  imageUrl?: string
  ipfsHash: string
  duration: number
  expertise: string
  type: string
  track: string
  keywords: Array<string>
  tags: Array<string>
  speakers: Array<string>
  profiles: Array<UserProfile>
}

export function mapToArchiveVideo(source: any) {
  return {
    id: source.id,
    slug: source.fields.slug,
    edition: source.frontmatter.edition,
    title: source.frontmatter.title,
    description: source.frontmatter.description,
    youtubeUrl: source.frontmatter.youtubeUrl,
    image: source.frontmatter.image,
    imageUrl: source.frontmatter.imageUrl,
    ipfsHash: source.frontmatter.ipfsHash,
    duration: source.frontmatter.duration,
    expertise: source.frontmatter.expertise,
    type: source.frontmatter.type,
    track: source.frontmatter.track,
    tags: source.frontmatter.tags,
    speakers: source.frontmatter.speakers,
    profiles: source.frontmatter.profiles,
  }
}
