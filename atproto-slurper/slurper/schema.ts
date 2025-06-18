import { LexiconDoc } from "@atproto/lexicon";

export const schema = {
  lexicon: 1,
  $type: "com.atproto.lexicon.schema",
  id: "org.devcon.event.v1",
  defs: {
    main: {
      type: "record",
      key: "tid",
      record: {
        type: "object",
        required: [
          "start_utc",
          "end_utc",
          "title",
          "description",
          "organizer",
          "location",
        ],
        properties: {
          start_utc: {
            type: "string",
            format: "datetime",
            description:
              "Start time of the entire event (use the 'timeslots' field for granular scheduling)",
          },
          end_utc: {
            type: "string",
            format: "datetime",
            description:
              "End time of the entire event (use the 'timeslots' field for granular scheduling)",
          },
          title: {
            type: "string",
            description: "Title of the event",
          },
          description: {
            type: "string",
            description: "Description of the event",
          },
          organizer: {
            type: "ref",
            ref: "#organizer",
          },
          location: {
            type: "ref",
            ref: "#location",
          },
          timeslots: {
            type: "array",
            description:
              "Optional event timeslots - this may be useful for events that span multiple days, need to specify timeslots for each day, or otherwise need more granular scheduling.",
            items: {
              type: "ref",
              ref: "#timeslot",
            },
          },
          metadata: {
            type: "ref",
            ref: "#metadata",
          },
        },
      },
    },
    organizer: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Name of the organizer",
        },
        contact: {
          type: "string",
          description: "Contact of the organizer (email, twitter, etc.)",
        },
      },
    },
    location: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Name of the location",
        },
        address: {
          type: "string",
          description: "Address of the location",
        },
      },
    },
    timeslot: {
      type: "object",
      required: ["start_utc", "end_utc", "title"],
      properties: {
        start_utc: {
          type: "string",
          format: "datetime",
          description: "Start of the timeslot",
        },
        end_utc: {
          type: "string",
          format: "datetime",
          description: "End of the timeslot",
        },
        title: {
          type: "string",
          description: "Title of the timeslot",
        },
        description: {
          type: "string",
          description: "Description of the timeslot",
        },
        event_uri: {
          type: "string",
          description:
            "If the timeslot is a more intricate/detailed event that needs more than the basic title and description, this would refer to the atproto record key of that event. The referenced event should follow the same parent schema (org.devcon.event.v1)",
        },
      },
    },
    metadata: {
      type: "object",
      description:
        "Optional fields that can be used to provide less pertinent information about the event",
      properties: {
        image_url: {
          type: "string",
          description:
            "Url referencing an image for this event. Image should be .png, squared, and we suggest at least 1024x1024px.",
        },
        requires_ticket: {
          type: "boolean",
          description: "Whether the event requires tickets",
        },
        sold_out: {
          type: "boolean",
          description: "Whether the event is sold out",
        },
        capacity: {
          type: "integer",
          description: "How many people can attend the event",
        },
        expertise_level: {
          type: "string",
          enum: ["all welcome", "beginner", "intermediate", "expert", "other"],
          description: "Expertise level of the event",
        },
        type: {
          type: "string",
          description: "Type of event, e.g. conference, talks, hackathon, etc.",
        },
        categories: {
          type: "array",
          description:
            "Categories of the event (e.g. defi, privacy, security, etc.)",
          items: {
            type: "string",
          },
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Useful when other options dont apply or for searching",
        },
        website: {
          type: "string",
          description: "Website/URL of the event",
        },
        socials: {
          type: "array",
          items: {
            type: "ref",
            ref: "#social_platform",
          },
          description:
            "Array of social media platforms with platform name and URL.",
        },
      },
    },
    social_platform: {
      type: "object",
      required: ["platform", "url"],
      properties: {
        platform: {
          type: "string",
        },
        url: {
          type: "string",
        },
      },
    },
  },
};

export const dummyEvent = {
  $type: "org.devcon.event.v1",
  start_utc: "2024-03-20T10:00:00Z",
  end_utc: "2024-03-20T12:00:00Z",
  title: "My Event",
  description: "Event description",
  organizer: {
    name: "John Doe",
    contact: "john@example.com",
  },
  location: {
    name: "Conference Room A",
    address: "123 Main St",
  },
  timeslots: [
    {
      start_utc: "2024-03-20T10:00:00Z",
      end_utc: "2024-03-20T11:00:00Z",
      title: "First Session",
      description: "Session description",
      event_uri: "at://did:plc:example/org.devcon.event.v1/123",
    },
  ],
};

// export const testSchema = {
//   $type: "com.atproto.lexicon.schema",
//   lexicon: 1,
//   id: "org.devcon.event.test",
//   defs: {
//     main: {
//       type: "record",
//       key: "tid",
//       record: {
//         type: "object",
//         required: ["title", "start", "end"],
//         properties: {
//           createdAt: {
//             type: "string",
//             format: "datetime",
//           },
//           title: {
//             type: "string",
//             description: "Title of the event",
//           },
//           description: {
//             type: "string",
//             description: "Description of the event",
//           },
//           location: {
//             type: "string",
//             description: "Location of the event",
//           },
//           url: {
//             type: "string",
//             description: "URL of the event",
//           },
//           start: {
//             type: "string",
//             format: "datetime",
//             description: "Start time of the event",
//           },
//           end: {
//             type: "string",
//             format: "datetime",
//             description: "End time of the event",
//           },
//         },
//       },
//     },
//   },
// };

// export const testRecord = {
//   $type: "org.devcon.event.test",
//   createdAt: "2024-03-20T10:00:00Z",
//   title: "My Event",
//   description: "Event description",
//   location: "Conference Room A",
//   url: "https://example.com",
//   start: "2024-03-20T10:00:00Z",
//   end: "2024-03-20T12:00:00Z",
// };
