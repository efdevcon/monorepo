import { PrivatePage } from 'components/domain/app/account/PrivatePage'
import SettingsPage from 'components/domain/app/account/Settings'
import { AppLayout } from 'components/domain/app/Layout'
import { SEO } from 'components/domain/seo'
import React from 'react'
import { ZupassTickets } from 'components/domain/app/dc7/dashboard/ticket'
import { CollapsedSection, CollapsedSectionHeader, CollapsedSectionContent } from 'components/common/collapsed-section'

const Account = (props: any) => {
  return (
    <AppLayout pageTitle="Passport" breadcrumbs={[{ label: 'Passport' }]}>
      <SEO title="Passport" />
      <PrivatePage>
        {/* <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:bg-[#fbfbfb] rounded-3xl relative lg:p-4"> */}
        <SettingsPage onlyAccount>
          <ZupassTickets />
        </SettingsPage>
        {/* <CollapsedSection className="bg-white rounded-2xl border border-solid border-[#E1E4EA]">
            <CollapsedSectionHeader className="py-4 px-4">Zupass Tickets</CollapsedSectionHeader>
            <CollapsedSectionContent> */}
        {/* </CollapsedSectionContent>
          </CollapsedSection>
        {/* </div> */}
        {/* <SettingsPage {...props} /> */}
      </PrivatePage>
    </AppLayout>
  )
}

export default Account

export async function getStaticProps(context: any) {
  return {
    props: {},
  }
}
