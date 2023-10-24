import React from 'react'
import { graphql } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'
import css from './playlist.module.scss'
import { PageHero } from 'src/components/common/page-hero'
import { Footer } from 'src/components/common/layouts/footer'
import { SEO } from '../seo'
import { Header } from 'src/components/common/layouts/header'
import { PlaylistHeader } from '../archive/playlists/Header'
import { mapToPlaylist } from 'src/hooks/usePlaylists'
import { ArchiveVideo } from 'src/types/ArchiveVideo'
import { VideoCard } from '../archive/playlists'
import { getSrc } from 'gatsby-plugin-image'

export default pageHOC(function PlaylistTemplate(data: any) {
  const playlist = mapToPlaylist(data.data.playlist)
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''
  const og = playlist.id.startsWith('devcon-6') ?
    `${origin}/assets/uploads/og/devcon-6.png` :
    ''

  return (
    <div className={css['container']}>
      <SEO title={playlist.title} description={playlist.description} />
      <Header withStrip={false} />

      <PageHero path={[{ text: 'playlists', url: '/archive/playlists' }, { text: playlist.title }]}>
        <PlaylistHeader playlist={playlist} />

        <div className={css['videos']}>
          <div className={css['list-view']}>
            {playlist.videos.map((i: ArchiveVideo) => {
              return <VideoCard key={i.id} video={i} playlist={playlist} horizontal showDescription />
            })}
          </div>
        </div>
      </PageHero>

      <Footer />
    </div>
  )
})

export const query = graphql`
  query ($slug: String!, $language: String!) {
    distinctVideoTags
    ...Page
    ...Notification
    ...NavigationArchiveEvents
    ...NavigationData
    playlist: markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      frontmatter {
        title
        description
        imageUrl
        image {
          childImageSharp {
            gatsbyImageData(layout: FULL_WIDTH, placeholder: BLURRED, quality: 90)
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
`
