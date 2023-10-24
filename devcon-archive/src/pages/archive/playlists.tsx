import React from 'react'
import { graphql } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'
import { Playlists } from 'src/components/domain/page-templates/playlists'

export default pageHOC(function Index({ data }: any) {
  return <Playlists />
})

export const query = graphql`
  query ($language: String!) {
    distinctVideoTags
    ...NavigationData
    ...NavigationArchiveEvents
    ...NewsDataInline
    ...Notification
  }
`
