import React from 'react'
import { graphql, navigate } from 'gatsby'
import { pageHOC } from 'src/context/pageHOC'

export default pageHOC(function Index({ data }: any) {
  React.useEffect(() => {
    navigate('/archive')
  })

  return (
    <></>
    // <Default>
    //   <SEO />
    //   {/* <PWAPrompt /> */}
    //   <News data={data.newsDataInline} />
    //   <BlogReel />
    // </Default>
  )
})

export const query = graphql`
  query ($language: String!) {
    ...NavigationData
    ...NewsDataInline
    ...Notification
  }
`
