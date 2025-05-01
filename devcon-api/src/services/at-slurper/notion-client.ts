import { Client } from '@notionhq/client'
// import { NotionEvent } from './converter'

const notionDatabaseId = '1e6638cdc415802fb81cd03321880cfd'

const notion = new Client({
  auth: process.env.NOTION_SECRET,
})

export const fetchFromNotion = async () => {
  try {
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
    })

    console.log(`Successfully fetched ${response.results.length} events from Notion`)
    return response.results
  } catch (error) {
    console.error('Error fetching events from Notion:', error)
    throw error
  }
}

export const upsertEventToNotion = async (event: any) => {
  try {
    // Search for existing event using title as the unique identifier
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      filter: {
        property: 'Name',
        title: {
          equals: event.title,
        },
      },
    })

    if (response.results.length > 0) {
      console.log(`Event already exists in Notion: ${event.title}`)
      // Update existing page
      const pageId = response.results[0].id
      await notion.pages.update({
        page_id: pageId,
        properties: {
          Description: {
            rich_text: [
              {
                text: {
                  content: event.description,
                },
              },
            ],
          },
          'Start Date': {
            date: {
              start: event.startDate,
            },
          },
          'End Date': {
            date: {
              start: event.endDate,
            },
          },
          Location: {
            rich_text: [
              {
                text: {
                  content: event.location,
                },
              },
            ],
          },
          URL: {
            url: event.url,
          },
          Source: {
            rich_text: [
              {
                text: {
                  content: event.source,
                },
              },
            ],
          },
          Status: {
            select: {
              name: event.status,
            },
          },
        },
      })
      console.log(`Updated existing event: ${event.title}`)
    } else {
      console.log(`Event does not exist in Notion: ${event.title}`)
      // Create new page
      await notion.pages.create({
        parent: {
          database_id: notionDatabaseId,
        },
        properties: {
          Title: {
            title: [
              {
                text: {
                  content: event.title,
                },
              },
            ],
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: event.description,
                },
              },
            ],
          },
          'Start Date': {
            date: {
              start: event.startDate,
            },
          },
          'End Date': {
            date: {
              start: event.endDate,
            },
          },
          Location: {
            rich_text: [
              {
                text: {
                  content: event.location,
                },
              },
            ],
          },
          URL: {
            url: event.url,
          },
          Source: {
            rich_text: [
              {
                text: {
                  content: event.source,
                },
              },
            ],
          },
          Status: {
            select: {
              name: event.status,
            },
          },
        },
      })
      console.log(`Created new event: ${event.title}`)
    }
  } catch (error) {
    console.error('Error upserting event to Notion:', error)
    throw error
  }
}

export const saveToNotion = async (events: any): Promise<void> => {
  try {
    for (const event of events) {
      await notion.pages.create({
        parent: {
          database_id: notionDatabaseId,
        },
        properties: {
          Title: {
            title: [
              {
                text: {
                  content: event.title,
                },
              },
            ],
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: event.description,
                },
              },
            ],
          },
          'Start Date': {
            date: {
              start: event.startDate,
            },
          },
          'End Date': {
            date: {
              start: event.endDate,
            },
          },
          Location: {
            rich_text: [
              {
                text: {
                  content: event.location,
                },
              },
            ],
          },
          URL: {
            url: event.url,
          },
          Source: {
            rich_text: [
              {
                text: {
                  content: event.source,
                },
              },
            ],
          },
          Status: {
            select: {
              name: event.status,
            },
          },
        },
      })
    }
    console.log(`Successfully saved ${events.length} events to Notion`)
  } catch (error) {
    console.error('Error saving events to Notion:', error)
    throw error
  }
}
