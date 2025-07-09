import fetch from 'node-fetch'

export const fetchFromSalesforce = async () => {
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

    const { access_token, instance_url } = authData

    // Query for PGR_Destino_Devconnect filtered leads
    // const query = encodeURIComponent(`SELECT FIELDS(ALL) FROM Opportunity WHERE Proactive_Community_Grants_Round__c = 'Destino Devconnect' LIMIT 5`)
    const query = encodeURIComponent(
      `SELECT Name, Id, LastModifiedDate, Sponsorship_Link__c, Target_Audience__c, Sponsorship_Details__c, Twitter_Handle__c, Type_of_Event__c, Sponsorship_Date__c, Event_Location__c 
   FROM Opportunity 
   WHERE (Proactive_Community_Grants_Round__c = 'Destino Devconnect' AND StageName = 'Awarded') 
      OR (Proactive_Community_Grants_Round__c = '10 Years of Ethereum Meet Ups' AND Region__c = 'Central & South America')`
    )

    const response = await fetch(`${instance_url}/services/data/v59.0/query?q=${query}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    const responseJson = await response.json()

    const { records } = responseJson

    // console.log(records, 'RECORDS')

    // Format to match your events data structure
    return records.map((record: any) => ({
      Id: record.Id,
      Name: record.Name,
      LastModifiedDate: record.LastModifiedDate,
      TargetAudience: record.Target_Audience__c,
      Date: {
        startDate: record.Sponsorship_Date__c,
        endDate: record.Sponsorship_Date__c,
      },
      Location: record.Event_Location__c,
      ['Type of Event']: record.Type_of_Event__c,
      Link: record.Sponsorship_Link__c,
      Twitter: record.Twitter_Handle__c,
      Details: record.Sponsorship_Details__c,
    }))
  }

  let events

  try {
    events = await fetchSalesforceData()
  } catch (error) {
    console.error('Error fetching Salesforce data:', error)
    // Fall back to mock data if API call fails
    throw error
  }

  return events
}
