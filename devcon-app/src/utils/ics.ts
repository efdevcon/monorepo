import moment from "moment";
import { Session } from "types/Session";

export function GenerateIcs(session: Session) {
    const ics = [`BEGIN:VCALENDAR`,
        `PRODID:devconnect.org`,
        `METHOD:PUBLISH`,
        `VERSION:2.0`,
        `CALSCALE:GREGORIAN`,
        `BEGIN:VEVENT`,
        `UID:${session.title}`,
        `DTSTAMP:${moment.utc().format('YYYYMMDDTHHmmss')}`,
        `DTSTART;TZID=America/Bogota:${moment.utc(session.start).format('YYYYMMDDTHHmmss')}`,
        `DTEND;TZID=America/Bogota:${moment.utc(session.end).format('YYYYMMDDTHHmmss')}`,
        `SUMMARY:${session.title}`,
        `DESCRIPTION:${session.description}`,
        session.room && `URL;VALUE=URI:${`https://app.devcon.org/venue/${session.room.id}`}`,
        session.room && `LOCATION:${session.room.name}${session.room.info ? ` - ${session.room.info}` : ''}`,
        `END:VEVENT`,
        `END:VCALENDAR`]

    return new Blob([ics.filter((row: string | undefined) => !!row).join('\n')], { type: 'text/calendar' })
}