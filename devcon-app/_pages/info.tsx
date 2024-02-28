// import { Info } from 'components/domain/app/info'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
import React from 'react'
// import { GetCategories, GetContentSections, GetFAQ } from 'services/page'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import { getGlobalData } from 'services/global'
import { SEO } from 'components/domain/seo'

export default pageHOC((props: any) => {
  return <AppLayout>Info Page Under Construction</AppLayout>
  // return (
  //   <AppLayout>
  //     <>
  //       <SEO title="Info" />
  //       <Info {...props} />
  //     </>
  //   </AppLayout>
  // )
})

export async function getStaticProps(context: any) {
  // const globalData = await getGlobalData(context)
  const globalAppData = await getGlobalData(context, true)
  // // const pageFAQ = await GetPage('/faq', context.locale)
  // // const pageBogota = await GetPage('/bogota', context.locale)
  // const sections = await GetContentSections(
  //   [
  //     'why-devcon-in-bogota',
  //     'is-bogota-safe',
  //     'devcon-manual',
  //     'hacker-basement',
  //     'relaxation',
  //     'sustainability',
  //     'general-tips',
  //     'internet-wifi-sim-cards',
  //     'community-hubs',
  //     'devcon-activations-and-experiences',
  //     'ticket-attestations-nft-minting',
  //     'impact-booths',
  //     'public-good-supporters',
  //     'passport-app-tips',
  //     'registration-checkin',
  //     'venue-guide',
  //   ],
  //   context.locale
  // )

  return {
    props: {
      ...globalAppData,
      // faqs: await GetCategories(context.locale),
      // cityGuideFaqs: await GetFAQ(context.locale),
      // sections,
      page: DEFAULT_APP_PAGE,
    },
  }
}
