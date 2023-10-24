import React from 'react'
import { graphql } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'
import { Video } from 'src/components/domain/archive'
import { mapToArchiveVideo } from 'src/hooks/useArchiveVideos'
import { mapToPlaylist } from 'src/hooks/usePlaylists'

export default pageHOC(function ArchiveVideoTemplate(props: any) {
  const video = mapToArchiveVideo(props.data.video.nodes[0])
  const playlists = props.data.playlists && props.data.playlists.nodes.map(mapToPlaylist)
  const relatedVideos = props.data.relatedVideos && props.data.relatedVideos.nodes.map(mapToArchiveVideo)

  return <Video video={video} playlists={playlists} relatedVideos={relatedVideos} />
})

export const query = graphql`
  query ($slug: String!, $language: String!, $tags: String) {
    distinctVideoTags
    ...Page
    ...Notification
    ...NavigationArchiveEvents
    ...NavigationData
    ...VideoData
    ...VideoPlaylists
    ...RelatedVideos
  }
`
