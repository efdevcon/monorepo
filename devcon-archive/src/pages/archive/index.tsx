import React from 'react'
import { graphql } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'
import { Archive } from 'src/components/domain/archive'

export default pageHOC(function Index({ data }: any) {
  return <Archive />
})

export const query = graphql`
  query ($language: String!) {
    distinctVideoTags
    ...NavigationData
    ...NewsDataInline
    ...Notification
  }
`
