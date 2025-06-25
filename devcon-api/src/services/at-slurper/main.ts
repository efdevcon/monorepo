// import { experimentation } from './atproto'
import { getTable, upsertEventToNotion } from './notion'
import { managedNotionKeys } from './event-schema'

/*
  1) Fetch events from external sources (MOCKED FOR NOW, DO NOT IMPLEMENT YET)
  2) Fetch events from our Notion database
  3) Override "managedNotionKeys" with the data from the external sources
  4) Save the events to the Notion database (only changing the fields that are present in the external sources, while keeping the rest as is), create a new row if the event doesn't exist yet
*/
const main = async () => {
  // Step 1: Fetch events from external sources (mocked)
  const atEvents = [
    {
      id: 'atproto_did_1',
      title: 'Test Event',
      start: '2024-01-01',
      end: '2024-01-02',
      location: 'Test Location',
      url: 'https://test.com',
      description: 'Test Description',
    },
  ]

  const pretixEvents = [
    {
      id: 'pretix_1',
      title: 'Test Event 2',
      start: '2024-02-01',
      end: '2024-02-02',
      location: 'Another Location',
      url: 'https://example.com',
      description: 'Another Test Description',
    },
  ]

  // Step 2: Fetch events from our Notion database
  const notionResults = await getTable('1e6638cdc415802fb81cd03321880cfd')

  // Create a map of external events by ID for easy lookup
  const externalEvents = [...atEvents, ...pretixEvents]
  const externalEventsMap = new Map()

  externalEvents.forEach((event) => {
    externalEventsMap.set(event.id, event)
  })

  // Step 3 & 4: Process each Notion page
  for (const result of notionResults) {
    // Extract the formatted data and original page
    const { formatted, original } = result

    // Check if this event has a matching external event
    if (!formatted.externalSourceId || !externalEventsMap.has(formatted.externalSourceId)) continue

    // Get the corresponding external event
    const externalEvent = externalEventsMap.get(formatted.externalSourceId)

    // Create an updated event object for Notion
    // Map the external event keys to our schema
    const mappedEvent = {
      id: formatted.id,
      title: externalEvent.title,
      startDate: externalEvent.start,
      endDate: externalEvent.end,
      location: externalEvent.location,
      url: externalEvent.url,
      description: externalEvent.description,
      source: formatted.externalSourceId.startsWith('atproto') ? 'AT Protocol' : 'Pretix',
      status: 'Published', // Default status
      externalSourceId: formatted.externalSourceId, // Keep the external ID for reference
    }

    // Update in Notion
    await upsertEventToNotion(mappedEvent)
    console.log(`Updated event: ${mappedEvent.title}`)

    // Remove from map to track which ones need to be created
    externalEventsMap.delete(formatted.externalSourceId)
  }

  console.log(`Found ${externalEventsMap.size} new events to create`)

  // Create new events for any remaining external events
  for (const [id, event] of externalEventsMap.entries()) {
    const newEvent = {
      title: event.title,
      startDate: event.start,
      endDate: event.end,
      location: event.location,
      url: event.url,
      description: event.description,
      source: id.startsWith('atproto') ? 'AT Protocol' : 'Pretix',
      status: 'Published', // Default status
      externalSourceId: id, // Add the external ID for future reference
    }

    await upsertEventToNotion(newEvent)
    console.log(`Created new event: ${newEvent.title}`)
  }

  console.log('Event synchronization completed')
}

// main()
