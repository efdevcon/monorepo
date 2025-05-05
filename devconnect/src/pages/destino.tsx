import React from 'react'
import Destino from 'common/components/ba/destino/destino'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import { useTina } from 'tinacms/dist/react'
import { SEO } from 'common/components/SEO'

const DestinoPage = ({ content, events }: { content: any; events: any }) => {
  const { data }: { data: any } = useTina(content)

  console.log(events, 'EVENTS')

  return (
    <>
      <SEO
        title="Destino Devconnect Grants"
        description="A local grant round to bring Argentina onchain."
        imageUrl={`https://devconnect.org/destino/hero-bg.png`}
      />
      <Header active />
      <Destino content={data.pages} events={events} />
      <Footer />
    </>
  )
}

export const fetchFromSalesforce = async (apiUrl: string) => {
  console.log(
    process.env.SF_CONSUMER_KEY,
    process.env.SF_CONSUMER_SECRET,
    process.env.SF_USERNAME,
    process.env.SF_PASSWORD,
    process.env.SF_SECURITY_TOKEN,
    'CREDENTIALS'
  )

  const fetchSalesforceData = async () => {
    const auth = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.SF_CONSUMER_KEY || '',
        client_secret: process.env.SF_CONSUMER_SECRET || '',
        username: process.env.SF_USERNAME || '',
        password: process.env.SF_PASSWORD || '' + (process.env.SF_SECURITY_TOKEN || ''),
      }),
    })

    const authData = await auth.json()

    console.log(authData, 'AUTH')

    const { access_token, instance_url } = authData

    console.log(access_token, instance_url, 'ACCESS TOKEN AND INSTANCE URL')

    /*
        Project_Name__c
        Estimated_Number_of_Attendees__c: 40,
        Event_Location__c: 'Jardín de Lolita',
        Target_Audience__c: 'People building web3 products, and people interested in learning more about blockchain technology and the different opportunities.',
        Sponsorship_Details__c: 'The purpose of the event is going to be a meetup where builders, contributors, researchers and people interested in web3 and blockchain technology can learn more about projects that are having real-world positive impact in LATAM, and future projects which need development. It is going to have the support from other communities such as Dojo Coding and Web3 Mentorhood.'
              Sponsorship_Topics__c: 'Stablecoins, how they can enable cross-border payment for countries or communities in nation-wide problems\n' +
        '\n' +
        'Community building, how can blockchain and tokenization enable community-driven organizations. (RISE San José)\n' +
        '\n' +
        'Zero Knowledge proofs "Crash Course", how do they work and real world use-cases.\n' +       
        '\n' +
        'Identity, how can digital identities be private and enable trustless voting systems (ZK Firma Digital)\n' +
        '\n' +
        'ReFi, how are projects and communities giving back to the world',
          Type_of_Event__c: 'Meetup',
           Sponsorship_Date__c: '2025-07-12',
         Company: 'Ethereum Costa Rica',
        Time_Zone__c: 'GMT–06:00 Central Standard Time (America/El_Salvador)',
              Team_Profile__c: 'Main and official Ethereum community in Costa Rica, in charge of sponsoring and organizing community-led events to promote the adoption of blockchain technologies and encouraging developers to contribute to core protocol development, research and open source projects.',

    */

    // Query for PGR_Destino_Devconnect filtered leads
    // const query = encodeURIComponent(`SELECT Name FROM Lead WHERE LeadSource = 'PGR_Destino_Devconnect'`)
    // const query = encodeURIComponent(
    //   `SELECT FIELDS(ALL) FROM Lead WHERE Proactive_Community_Grants_Round__c = 'Destino Devconnect' LIMIT 5`
    // )
    const query = encodeURIComponent(
      `SELECT Sponsorship_Link__c, Twitter_Handle__c, Type_of_Event__c, Sponsorship_Date__c, Event_Location__c FROM Opportunity WHERE Proactive_Community_Grants_Round__c = 'Destino Devconnect' AND StageName = 'Awarded'`
    )
    // const query = encodeURIComponent(
    //   `SELECT Name FROM Lead WHERE Proactive_Community_Grants_Round__c = 'Destino Devconnect' LIMIT 5`
    // )
    const response = await fetch(`${instance_url}/services/data/v59.0/query?q=${query}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    console.log(response, 'RESPONSE')

    const responseJson = await response.json()

    console.log(responseJson, 'RESPONSE JSON')

    const { records } = responseJson

    // Format to match your events data structure
    return records.map((record: any) => ({
      Name: record.Name,
      Date: {
        startDate: record.Sponsorship_Date__c,
        endDate: record.Sponsorship_Date__c,
      },
      Location: record.Event_Location__c,
      ['Type of Event']: record.Type_of_Event__c,
      Social: record.Twitter_Handle__c,
      Link: record.Sponsorship_Link__c,
      Team: record.Company || '',
    }))
  }

  let events

  try {
    events = await fetchSalesforceData()
  } catch (error) {
    console.error('Error fetching Salesforce data:', error)
    // Fall back to mock data if API call fails
    events = [
      // ... existing mock events ...
    ]
  }

  return events
}

export async function getStaticProps({ locale }: { locale: string }) {
  const path = locale === 'en' ? 'destino_devconnect.mdx' : locale + '/destino_devconnect.mdx'
  const content = await client.queries.pages({ relativePath: path })
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  const apiUrl = 'https://ef-esp.lightning.force.com/lightning/o/Lead/list?filterName=PGR_Destino_Devconnect'

  const events = await fetchFromSalesforce(apiUrl)

  return {
    props: {
      translations,
      locale,
      content,
      events,
    },
    revalidate: 1 * 60 * 60, // 60 minutes, in seconds
  }
}

export default withTranslations(DestinoPage)
