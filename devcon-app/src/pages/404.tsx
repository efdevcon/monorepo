import React from 'react'
import Image404 from 'assets/images/state/route.png'
import Image from 'next/image'
import { AppLayout } from 'components/domain/app/Layout'

const FourOhFour = () => {
  return (
    <AppLayout pageTitle="Not Found" breadcrumbs={[]}>
      <div className="flex flex-col justify-center items-center h-full mt-8">
        <Image src={Image404} alt="Man looking for something" className="max-w-[80vh]" />
        <p className="bold text-xl">404 - Page not found</p>
      </div>
    </AppLayout>
  )
}

export default FourOhFour
