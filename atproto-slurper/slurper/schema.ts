export const schema = {
  lexicon: 1,
  $type: "com.atproto.lexicon.schema",
  id: "org.devcon.event",
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
          "main_url",
          "location",
          "event_type",
          "expertise",
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
            enum: [
              "all welcome",
              "beginner",
              "intermediate",
              "expert",
              "other",
            ],
            description: "Expertise level of the event",
          },
          event_type: {
            type: "string",
            enum: [
              "talks",
              "discussion",
              "presentation",
              "hackathon",
              "workshop",
              "panel",
              "mixed format",
              "social",
              "other",
            ],
            description: "Type of event",
          },
          categories: {
            type: "array",
            description:
              "Categories of the event (e.g. defi, privacy, security, etc.)",
            items: {
              type: "string",
              enum: [
                "real world ethereum",
                "defi",
                "cypherpunk & privacy",
                "security",
                "ai",
                "protocol",
                "devex",
                "usability",
                "applied cryptography",
                "coordination",
                "scalability",
                "other",
              ],
            },
          },
          search_tags: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Searching tags for the event",
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
          image_url: {
            type: "string",
            description:
              "Url referencing an image for this event. Image should be .png, squared, and we suggest at least 1024x1024px.",
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
    main_url: {
      type: "string",
      description:
        "Main web property of the event (e.g. website or twitter profile)",
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
  $type: "org.devcon.event",
  start_utc: "2024-03-21T10:00:00Z",
  end_utc: "2024-03-21T12:00:00Z",
  title: "My Event",
  description: "Event description",
  expertise: "intermediate",
  event_type: "talks",
  organizer: {
    name: "John Doe",
    contact: "john@example.com",
  },
  location: {
    name: "Conference Room A",
    address: "123 Main St",
  },
  // timeslots: [
  //   {
  //     start_utc: "2024-03-20T10:00:00Z",
  //     end_utc: "2024-03-20T11:00:00Z",
  //     title: "First Session",
  //     description: "Session description",
  //     event_uri: "at://did:plc:example/org.devcon.event/123",
  //   },
  // ],
};
