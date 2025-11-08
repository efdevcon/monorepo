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

export async function getStageEvents(): Promise<any[]> {
  const response = await fetch('https://devconnect.pblvrt.com/events', {
    next: { revalidate: 300 }, // 5 minutes
  });
  return response.json();
}

export async function getProgramming(): Promise<DaySchedule[]> {
  const response = await fetch('https://devconnect.pblvrt.com/schedules', {
    next: { revalidate: 300 }, // 5 minutes
  });

  if (!response.ok) {
    throw new Error('Failed to fetch programming');
  }

  return response.json();
}
