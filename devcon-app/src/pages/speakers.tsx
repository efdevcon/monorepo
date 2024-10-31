import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { useSpeakerData } from 'services/event-data'
import { SEO } from 'components/domain/seo'
import { FancyLoader } from 'lib/components/loader/loader'
import { SpeakerLayout } from 'components/domain/app/dc7/speakers/index'

export default (props: any) => {
  const speakers = useSpeakerData()

  return (
    <AppLayout pageTitle="Speakers" breadcrumbs={[{ label: 'Speakers' }]}>
      <SEO title={'Speakers'} />

      <SpeakerLayout speakers={speakers} />

      <div className="fixed inset-0 h-[101vh] w-full flex justify-center items-center z-5 pointer-events-none">
        <FancyLoader loading={!speakers} />
      </div>
    </AppLayout>
  )
}

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
