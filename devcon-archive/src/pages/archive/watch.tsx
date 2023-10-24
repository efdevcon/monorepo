import React from 'react'
import { graphql } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'
import { Watch } from 'src/components/domain/archive'

export default pageHOC(function Index({ data }: any) {
  return <Watch />
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
