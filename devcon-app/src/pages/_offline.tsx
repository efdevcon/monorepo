import React from 'react'
import { AppLayout } from 'components/domain/app/Layout'
import { Link } from 'components/common/link'
import ImageOffline from 'assets/images/state/offline.png'
import Image from 'next/image'

const Offline = () => {
  return (
    <AppLayout pageTitle="Offline" breadcrumbs={[{ label: 'Offline' }]}>
      <div className="flex flex-col justify-center items-center h-full mt-8">
        <Image src={ImageOffline} alt="Offline" className="max-w-[50vh]" />
        <p className="bold text-xl text-center mt-8">You are currently offline and this page was not cached.</p>
        <p className="text-center mt-2">
          <Link to="/" className="text-[#7D52F4] underline">
            Go back to home.
          </Link>
        </p>
      </div>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}

export default Offline
