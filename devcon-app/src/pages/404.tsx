import React from 'react'
import Image404 from 'assets/images/404.png'
import Image from 'next/image'
// import { GetPage } from 'services/page'
import { AppLayout } from 'components/domain/app/Layout'
import { pageHOC } from 'context/pageHOC'
// import { getGlobalData } from 'services/global'

const FourOhFour = pageHOC(() => {
  return (
    <AppLayout>
      <div className="flex flex-col justify-center items-center h-full mt-8">
        <Image src={Image404} alt="Man looking for something" className="max-w-[80vh]" />
        <p className="bold text-xl">404 - Page not found</p>
      </div>
    </AppLayout>
  )
})

// export async function getStaticProps(context: any) {
//   const globalData = await getGlobalData(context)
//   const page = await GetPage('/404')

//   return {
//     props: {
//       ...globalData,
//       page,
//     },
//   }
// }

export default FourOhFour
