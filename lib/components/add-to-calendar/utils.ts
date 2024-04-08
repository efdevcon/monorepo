import moment, { Moment } from "moment";

/*
  EXAMPLE SYNTAX FOR NOV 12 -> NOV 15: 

  const cal = generateCalendarExport({
    timezone: 'Asia/Bangkok',
    PRODID: 'devcon.org',
    icsFileName: 'Devcon 7',
    entries: [
      {
        start: moment.utc('2024-11-12T08:00:00'),
        end: moment.utc('2024-11-16T00:00:00'),
        description: 'Devcon - The Ethereum Developer Conference',
        title: 'Devcon 7',
        location: {
          url: 'https://devcon.org',
          text: 'QNSCC — Queen Sirikit National Convention Center',
        },
      },
    ],
  })

  Example syntax of "one day events" 
  TODO: Should remove need to adjust according to utc time - look out for "Temporal" api so we can ditch momentjs
  const cal = generateCalendarExport({
    timezone: 'Asia/Bangkok',
    PRODID: 'devcon.org',
    icsFileName: 'Devcon 7',
    entries: [
      {
        start: moment('2024-11-12T08:00:00').subtract('7', 'hours'),
        end: moment('2024-11-12T09:00:00').subtract('7', 'hours'),
        description: 'Devcon - The Ethereum Developer Conference',
        title: 'Devcon 7',
        location: {
          url: 'https://devcon.org',
          text: 'QNSCC — Queen Sirikit National Convention Center',
        },
      },
    ],
  })

*/

type AddToCalendarType = {
  timezone: string;
  entries: {
    start: Moment;
    end: Moment;
    title: string;
    description?: string;
    location?: {
      url: string;
      text: string;
    };
  }[];
  PRODID: string; // Entity that created the calendar
  icsFileName?: string;
};

export const generateCalendarExport = ({
  timezone,
  entries,
  icsFileName,
  PRODID,
}: AddToCalendarType) => {
  const ics = [
    `BEGIN:VCALENDAR`,
    `PRODID:${PRODID}`,
    `METHOD:PUBLISH`,
    `VERSION:2.0`,
    `CALSCALE:GREGORIAN`,
  ] as any[];
  let googleCalUrl: any;

  entries.forEach((entry) => {
    const {
      start,
      end,
      description: unformatedDescription,
      location,
      title,
    } = entry;
    const description = (() => {
      if (!unformatedDescription) {
        return title;
      }

      return unformatedDescription;
    })();

    googleCalUrl = (() => {
      const googleCalUrl = new URL(
        `https://www.google.com/calendar/render?action=TEMPLATE&ctz=${timezone}`
      );

      googleCalUrl.searchParams.append("text", `${title}`);
      googleCalUrl.searchParams.append("details", `${description}`);

      if (location?.url)
        googleCalUrl.searchParams.append("location", `${location.text}`);

      return googleCalUrl;
    })();

    const isMultiDayEvent = end.isAfter(start, "day");
    const isAllDayEvent =
      start.hour() === 0 &&
      start.minute() === 0 &&
      end.hour() === 0 &&
      end.minute() === 0;

    if (isMultiDayEvent || isAllDayEvent) {
      googleCalUrl.searchParams.append(
        "dates",
        `${start.format("YYYYMMDD")}/${end.format("YYYYMMDD")}`
      );

      ics.push(
        "BEGIN:VEVENT",
        `UID:${title}@${PRODID}`,
        `DTSTAMP:${moment.utc().format("YYYYMMDDTHHmmss")}`,
        `DTSTART;VALUE=DATE:${start.format("YYYYMMDD")}`,
        `DTEND;VALUE=DATE:${end.format("YYYYMMDD")}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        location?.url && `URL;VALUE=URI:${location.url}`,
        location?.url && `LOCATION:${location.text}`,
        "END:VEVENT"
      );
    } else {
      ics.push(
        "BEGIN:VEVENT",
        `UID:${title}@${PRODID}`,
        `DTSTAMP:${moment.utc().format("YYYYMMDDTHHmmss")}`,
        `DTSTART:${start.format("YYYYMMDDTHHmmss")}Z`,
        `DTEND:${end.format("YYYYMMDDTHHmmss")}Z`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        location?.url && `URL;VALUE=URI:${location.url}`,
        location?.url && `LOCATION:${location.text}`,
        "END:VEVENT"
      );

      googleCalUrl.searchParams.append(
        "dates",
        `${start.format("YYYYMMDDTHHmmss")}Z/${end.format("YYYYMMDDTHHmmss")}Z`
      );
    }
  });

  ics.push(`END:VCALENDAR`);

  const calendarName = entries.length === 1 ? entries[0].title : icsFileName;

  const file = new Blob([ics.filter((row: string) => !!row).join("\n")], {
    type: "text/calendar",
  });
  const icsAttributes = {
    href: URL.createObjectURL(file),
    download: `${calendarName}.ics`,
  };

  return { icsAttributes, googleCalUrl: googleCalUrl && googleCalUrl.href };
};
