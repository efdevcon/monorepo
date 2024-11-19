import { Client } from '@notionhq/client'

type FormattedNotionEvent = {
  ID: any
  'Stable ID'?: any
  Name?: any
  Organizer?: any[]
  URL?: any
  'Stream URL'?: any
  Date?: any
  Location?: any
  Live?: any
  Attend?: any
  'Brief Description'?: any
  'Time of Day'?: any
  Category?: any
  'General Size'?: any
  Difficulty?: any
  Domain: any
  Priority: any
  'Block Schedule': any
}

/*
  Notion data normalization stuff below...
*/
const createKeyResolver =
  (eventData: any) =>
  (...candidateKeys: string[]) => {
    const keyMatch = candidateKeys.find(key => {
      return typeof eventData[key] !== 'undefined'
    })

    return keyMatch ? eventData[keyMatch] : undefined
  }

// The notion tables for each edition (istanbul, amsterdam, etc.) aren't the same - this normalizes the different column names by looking at multiple keys for each expected value
const normalizeEvent = (eventData: any): FormattedNotionEvent => {
  const keyResolver = createKeyResolver(eventData)

  return {
    ID: keyResolver('ID', 'id'),
    'Stable ID': keyResolver('Stable ID', '[WEB] Stable ID'),
    Name: keyResolver('Name'),
    Organizer: keyResolver('Organizer', '[HOST] Organizer'),
    URL: keyResolver('URL', '[HOST] Event Website URL'),
    'Stream URL': keyResolver('Stream URL', '[WEB] Stream URL'),
    Date: keyResolver('Date', '[HOST] Event Date'),
    Live: keyResolver('Live', '[WEB] Live'),
    Attend: keyResolver('Attend', '[HOST] Status'),
    'Brief Description': keyResolver('Description', 'Brief Description', '[HOST] Description (280 chars, tweet size)'),
    'Time of Day': keyResolver('Time of Day', '[HOST] Event Hours'),
    Category: keyResolver('Category', '[HOST] Category'),
    'General Size': keyResolver('Num. of Attendees', '[HOST] Num. of Attendees'),
    Difficulty: keyResolver('Difficulty', '[HOST] Difficulty'),
    Location: keyResolver('Location', '[HOST] Location'),
    Domain: keyResolver('[INT] Domain'),
    Priority: keyResolver('[WEB] Priority (sort)', 'Priority (sort)'),
    'Block Schedule': keyResolver('Block Schedule'),
  }
}

// Notion fetch/format below
const notionDatabasePropertyResolver = (property: any, key: any) => {
  switch (property.type) {
    case 'text':
    case 'rich_text':
    case 'title':
      // Extract url and url text from the Location column
      if (key === 'Location' && property[property.type]) {
        let locationInfo = {} as any

        property[property.type].forEach((chunk: any) => {
          if (chunk.href) {
            locationInfo.url = chunk.href
            locationInfo.text = chunk.plain_text
          }
        })

        if (locationInfo.url) {
          return locationInfo
        }
      }

      const dechunked = property[property.type]
        ? property[property.type].reduce((acc: string, chunk: any) => {
            let textToAppend

            if (chunk.href && property.type === 'rich_text' && key !== 'URL' && key !== 'Stream URL') {
              textToAppend = `<a href=${chunk.href} target="_blank" class="generic" rel="noopener noreferrer">${chunk.plain_text}</a>`
            } else {
              textToAppend = chunk.plain_text
            }

            if (chunk.annotations) {
              let annotations = 'placeholder'

              if (chunk.annotations.bold) annotations = `<b>${annotations}</b>`
              if (chunk.annotations.italic) annotations = `<i>${annotations}</i>`
              if (chunk.annotations.strikethrough) annotations = `<s>${annotations}</s>`
              if (chunk.annotations.underline) annotations = `<u>${annotations}</u>`

              textToAppend = annotations.replace('placeholder', textToAppend)
            }

            return acc + textToAppend
          }, '')
        : null

      return `${dechunked}`

    case 'date':
      if (property.date) {
        return {
          startDate: property.date.start,
          endDate: property.date.end || property.date.start,
        }
      }

      return null

    case 'multi_select':
      if (property.multi_select) {
        return property.multi_select.map((value: any) => value.name)
      }

      return null
    case 'select':
      return property.select && property.select.name

    case 'number':
      return property.number

    case 'checkbox':
      return property.checkbox

    case 'files':
      return property.files

    case 'url':
      return property.url

    default:
      return 'default value no handler for: ' + property.type
  }
}

const formatResult =
  (language: 'en' | 'es', shouldNormalize = false) =>
  (result: any) => {
    const properties = {} as { [key: string]: any }

    // Our schedules follow multiple formats, so we have to normalize before processing:
    const normalizedNotionEventData = shouldNormalize ? normalizeEvent(result.properties) : result.properties

    Object.entries(normalizedNotionEventData).forEach(([key, value]) => {
      if (typeof value === 'undefined') return

      const val = notionDatabasePropertyResolver(value, key)

      if (Array.isArray(val)) {
        properties[key] = val
      } else if (typeof val === 'object' && val !== null) {
        properties[key] = {
          ...val,
        }
      } else {
        properties[key] = val
      }
    })

    // Insert a default value for time of day when unspecified
    if (!properties['Time of Day']) properties['Time of Day'] = 'FULL DAY'

    return {
      ...properties,
      ID: result.id,
      ShortID: result.id.slice(0, 5) /* raw: result*/,
    }
  }

const getNotionDatabase = async (
  locale: 'en' | 'es',
  databaseID = '517164deb17b42c8a00a62e775ce24af',
  shouldNormalize = false
) => {
  const notion = new Client({
    auth: process.env.NOTION_SECRET,
  })

  // const databaseID = '8b177855e75b4964bb9f3622437f04f5' // Devconnect
  // const databaseID = '517164deb17b42c8a00a62e775ce24af' // Devcon week

  const isDevconWeek = databaseID === '1c8de49be9594869a2e72406fde2af68'
  const isColombiaBlockhainWeek = databaseID === 'cc11ba1c0daa40359710c0958da7739c'

  let data: any[] = []

  try {
    const sorts: any = [
      {
        property: 'Date',
        direction: 'ascending',
      },
    ]

    const filter: any = {
      and: [
        {
          property: 'Date',
          date: {
            is_not_empty: true,
          },
        },
      ],
    }

    if (isColombiaBlockhainWeek) {
      filter.and.push({
        property: 'Approved?',
        checkbox: {
          equals: true,
        },
      })
    }

    if (isDevconWeek) {
      sorts.push({
        property: 'Priority (0=high,10=low)',
        direction: 'descending',
      })

      filter.and.push({
        property: 'Live',
        checkbox: {
          equals: true,
        },
      })
    }

    let hasMore = true
    let startCursor: string | undefined = undefined

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseID,
        sorts,
        filter,
        start_cursor: startCursor,
        page_size: 50, // Maximum allowed by Notion API
      })

      data = [...data, ...response.results.map(formatResult(locale, shouldNormalize))]
      hasMore = response.has_more
      startCursor = response.next_cursor ?? undefined
    }
  } catch (error) {
    if (false) {
      // Handle error codes here if necessary
    } else {
      // Other error handling code
      console.error(error)
    }
  }

  return data
}

export default getNotionDatabase
