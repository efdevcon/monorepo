import moment from "moment";

/**
 * Normalizes timestamp strings to ensure consistent formatting
 * Handles both .000Z (milliseconds) and .00Z (centiseconds) formats
 */
const normalizeTimestamp = (timestamp: string): string => {
  if (!timestamp) return timestamp;

  // If timestamp ends with .00Z, convert to .000Z for consistency
  if (timestamp.match(/\.\d{2}Z$/)) {
    return timestamp.replace(/(\.\d{2})Z$/, "$10Z");
  }

  // If timestamp has no fractional seconds, add .000Z
  if (timestamp.match(/\d{2}:\d{2}:\d{2}Z$/)) {
    return timestamp.replace(/Z$/, ".000Z");
  }

  return timestamp;
};

/**
 * Safely parses and formats timestamps using moment.js with normalization
 */
const parseAndFormatTimestamp = (
  timestamp: string,
  subtractHours: number = 0
): string => {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const momentDate = moment.utc(normalizedTimestamp);

  if (subtractHours > 0) {
    momentDate.subtract(subtractHours, "hours");
  }

  return momentDate.format("YYYY-MM-DDTHH:mm:ss[Z]");
};

export const atprotoToCalendarFormat = (event: any) => {
  const timeblocks = [];
  const hasSlotsByUser = event.timeslots && event.timeslots.length > 0;

  // Normalize start and end date + timeslots into the format expected by the calendar
  if (hasSlotsByUser) {
    event.timeslots.forEach((slot: any) => {
      timeblocks.push({
        start: parseAndFormatTimestamp(slot.start_utc, 3), // To argentina time
        end: parseAndFormatTimestamp(slot.end_utc, 3), // To argentina time
      });
    });
  } else {
    timeblocks.push({
      start: parseAndFormatTimestamp(event.start_utc, 3), // To argentina time
      end: parseAndFormatTimestamp(event.end_utc, 3), // To argentina time
    });
  }

  const manualOverrides = {} as any;

  if (event.id === 84) {
    // 29 = ETH DAY
    // 23 = COWORKING
    // manualOverrides.spanRows = 5;
    console.log(event, "event");
    console.log("manual override for coworking");
    manualOverrides.spanRows = 2;
  }

  const socials = event.socials || {};

  return {
    id: event.id,
    rkey: event.rkey,
    name: event.title,
    description: event.description,
    location: event.location.name,
    difficulty: event.expertise,
    organizer: event.organizer.name,
    timeblocks: timeblocks,
    eventType: event.event_type,
    eventLink: event.main_url,
    isCoreEvent: event.isCoreEvent,
    imageUrl: event.image_url || "",
    amountPeople: event.capacity || "",
    showTimeOfDay: event.show_time_of_day ? true : false, // in case its undefined (added field later)
    ticketsAvailable: event.requires_ticket || false,
    ticketsUrl: event.tickets_url || "",
    xHandle: socials.x_url || "",
    instagramHandle: socials.instagram_url || "",
    farcasterHandle: socials.farcaster_url || "",
    soldOut: event.sold_out || false,
    ...manualOverrides,
  };
};

export const apiResultToCalendarFormat = (atprotoEventsData: any) => {
  const formattedAtprotoEvents = atprotoEventsData.map((event: any) => {
    const record = event.record_passed_review;

    const updatedAt = event.updated_at;
    // Need people to update their timeslots after the changes made on this date, so we will not show it until they have edited their event
    const updatedAfterSep3 = moment
      .utc(updatedAt)
      .isAfter(moment.utc("2025-09-03T17:30:00.000Z"));

    return atprotoToCalendarFormat({
      ...record,
      id: event.id,
      rkey: event.rkey,
      isCoreEvent: event.is_core_event,
      // showTimeOfDay: updatedAfterSep3,
    });
  });

  return formattedAtprotoEvents;
};
