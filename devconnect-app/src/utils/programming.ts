import moment from 'moment';

interface Session {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  event?: string;
  [key: string]: any;
}

interface DaySchedule {
  day: string;
  sessions: Session[];
}

export async function getProgramming(): Promise<DaySchedule[]> {
  const response = await fetch('https://devconnect.pblvrt.com/schedules', {
    next: { revalidate: 300 }, // 5 minutes
  });

  if (!response.ok) {
    throw new Error('Failed to fetch programming');
  }

  const sessions: Session[] = await response.json();

  // console.log(sessions, 'sessions ay');

  // Group sessions by day
  const sessionsByDay = sessions.reduce(
    (acc, session) => {
      // Check if session has a day field in DD/MM/YYYY format
      let day: string;
      if (session.day && /^\d{2}\/\d{2}\/\d{4}$/.test(session.day)) {
        // Parse DD/MM/YYYY format
        day = moment.utc(session.day, 'DD/MM/YYYY').format('YYYY-MM-DD');
      } else {
        // Assume start is in HH:mm format, use today as fallback
        day = moment.utc().format('YYYY-MM-DD');
      }

      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(session);
      return acc;
    },
    {} as Record<string, Session[]>
  );

  // Convert to array and sort by day
  const daySchedules: DaySchedule[] = Object.entries(sessionsByDay)
    .map(([day, sessions]) => ({
      day,
      sessions: sessions.sort((a, b) => {
        // Parse HH:mm format for sorting
        const timeA = moment.utc(a.start, 'HH:mm');
        const timeB = moment.utc(b.start, 'HH:mm');
        return timeA.diff(timeB);
      }),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return daySchedules;
}
