export const schema = {
  $type: 'com.atproto.lexicon.schema',
  lexicon: 1,
  id: 'org.devcon.event.test',
  defs: {
    main: {
      type: 'record',
      key: 'tid',
      record: {
        type: 'object',
        required: ['title', 'start', 'end'],
        properties: {
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
          title: {
            type: 'string',
            description: 'Title of the event',
          },
          description: {
            type: 'string',
            description: 'Description of the event',
          },
          location: {
            type: 'string',
            description: 'Location of the event',
          },
          url: {
            type: 'string',
            description: 'URL of the event',
          },
          start: {
            type: 'string',
            format: 'datetime',
            description: 'Start time of the event',
          },
          end: {
            type: 'string',
            format: 'datetime',
            description: 'End time of the event',
          },
        },
      },
    },
  },
}

export const managedNotionKeys = {
  title: 'Name',
  start: 'Start',
  end: 'End',
  location: 'Location',
  url: 'URL',
  description: 'Description',
}

// {
//   title,
//   '[INT] Tix Method': [Object],
//   Guidelines: [Object],
//   '[HOST] Event Hours': [Object],
//   '[INT] Support Level': [Object],
//   '[HOST] Twitter URL': [Object],
//   Ticketing: [Object],
//   '[HOST] Category': [Object],
//   '[INT] Stage': [Object],
//   '[INT] Volunteer Needs': [Object],
//   '[INT] Scheduling Sheet': [Object],
//   '[HOST] Event Date': [Object],
//   '[HOST] Event Website URL': [Object],
//   'Describe the type of demographic you would like to see at your event:': [Object],
//   'PCD Pass (ZuConnect)': [Object],
//   '[INT] Telegram Group Chat Link': [Object],
//   LIVESTREAM: [Object],
//   '[HOST] Length': [Object],
//   '[INT] Date Confirmed': [Object],
//   'How will you manage access to the event?': [Object],
//   '[HOST] Difficulty': [Object],
//   '[WEB] IPFS': [Object],
//   '[HOST] Organizer': [Object],
//   'What topics/themes would you like to cover at the event?': [Object],
//   'Provide the best contact email for our team to inquire more about this event if necessary:': [Object],
//   '[HOST] Num. of Attendees': [Object],
//   'Explain how this event is relevant to and/or focused on Ethereum and its ecosystem.': [Object],
//   '[INT] Domain': [Object],
//   '[HOST] Status': [Object],
//   '[HOST] Description (280 chars, tweet size)': [Object],
//   '[HOST] Location': [Object],
//   '[WEB] Stream URL': [Object],
//   '[WEB] Live': [Object],
//   'Devconnect 2025 Survey': [Object],
//   '[WEB] Stable ID': [Object],
//   'Pretix Usage Agreement': [Object],
//   '[INT] Tix Status': [Object],
//   '[WEB] Priority (sort)': [Object],
//   Name: [Object],
// }
