import { useEffect, useState } from 'react';
import moment from 'moment'
import { Session as SessionType } from 'types/Session'
import { Speaker } from 'types/Speaker';
import { Room } from 'types/Room'
import { defaultSlugify } from 'utils/formatting'
import Fuse from 'fuse.js'
import { APP_CONFIG } from 'utils/config'

const cache = new Map()
const baseUrl = APP_CONFIG.API_BASE_URL
const eventName = 'devcon-6' // 'devcon-vi-2022' // 'devcon-vi-2022' // 'pwa-data'
const websiteQuestionId = 29
const twitterQuestionId = 44
const githubQuestionId = 43
const organizationQuestionId = 23 // not used
const roleQuestionId = 24 // not used

export const fuseOptions = {
  includeScore: true,
  useExtendedSearch: true,
  shouldSort: true,
  ignoreLocation: true,
  keys: [
    {
      name: 'speakers.name',
      weight: 1,
    },
    {
      name: 'track',
      weight: 0.5,
    },
    {
      name: 'tags',
      weight: 0.2,
    },
  ],
}

export const useSessionData = (): SessionType[] | null => {
    const [sessions, setSessions] = useState<SessionType[] | null>(null)
    const version = useEventVersion();
  
    useEffect(() => {
      if (version) {
        fetchSessions(version).then(setSessions)
      }
    }, [version])
  
    return sessions;
}

export const useSpeakerData = (): Speaker[] | null => {
    const [speakers, setSpeakers] = useState<Speaker[] | null>(null)
    const version = useEventVersion();
  
    useEffect(() => {
      if (version) {
        fetchSpeakers(version).then(setSpeakers)
      }
    }, [version])

    return speakers;
} 
  
export const useEventVersion = () => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // Whenever version changes or the service worker installs for the first time, we want to repopulate the cache immediately
    const fillEventCache = () => {
      fetchEventVersion().then(setVersion)

      if (version) {
        // This will use the http cache if multiple requests are sent in close succession, so it's not wasteful
        fetchSessions(version);
        fetchSpeakers(version);
      }
    };

    fillEventCache();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', fillEventCache);
    }

    return () => {
        // Remove the service worker update listener if it was added
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('controllerchange', fillEventCache);
        }
    };
  }, [version])

  useEffect(() => {
    fetchEventVersion().then(setVersion)

    const onWindowFocus = () => {
      fetchEventVersion().then(setVersion)
    }

    window.addEventListener("focus", onWindowFocus);

    return () => {
        window.removeEventListener("focus", onWindowFocus);
    };
  }, [])

  return version;
}

export const useSpeakersWithSessions = () => {
  const [speakersWithSessions, setSpeakersWithSessions] = useState<any>(null);
  const sessions = useSessionData();
  const speakers = useSpeakerData();

  useEffect(() => {
    if (sessions && speakers) {
      const sessionsBySpeakerId: any = {}

      sessions.forEach(session => {
        session.speakers.forEach(speaker => {
          if (sessionsBySpeakerId[speaker.id]) {
            sessionsBySpeakerId[speaker.id].push(session)
          } else {
            sessionsBySpeakerId[speaker.id] = [session]
          }
        })
      })
    
      const speakersWithSessions = speakers.map(speaker => {
        return {
          ...speaker,
          sessions: sessionsBySpeakerId[speaker.id],
        }
      })

      setSpeakersWithSessions(speakersWithSessions);
    }
  }, [sessions, speakers]);

  return speakersWithSessions;
}

// Ssimple endpoint we can ping to see if event data updated - we append this to requests to speakers and sessions to break their caches
export const fetchEventVersion = async (): Promise<string> => {
  const version = await get(`/events/${eventName}/version`);

  return version;
}

export const fetchSessions = async (version?: string): Promise<SessionType[]> => {
    const sessions = await get(`/events/${eventName}/sessions?size=1000&version=${version}`)

    return sessions.map((session: SessionType) => {
        const startTS = moment.utc(session.slot_start).subtract(5, 'hours')
        const endTS = moment.utc(session.slot_end).subtract(5, 'hours')

        return {
            ...session,
            start: startTS.valueOf(),
            end: endTS.valueOf(),
            duration: startTS.diff(endTS, 'minutes')
        }
    })
}

export const fetchSpeakers = async (version?: string): Promise<Speaker[]> => {
    const sessions = await fetchSessions(version)
    const speakersData = await get(`/speakers?size=1100&version=${version}`); // await get(`/events/${eventName}/speakers`) // TODO: This needs to be filtered down to match the speakers at Devcon 7
    const speakers = speakersData.map((i: any) => {
      const speakerSessions = sessions.filter((session: SessionType) => session.speakers.some((speaker) => i.id === speaker.id))
      const organization = i.answers?.filter((i: any) => i.question.id === organizationQuestionId).reverse()[0]?.answer
      const role = i.answers?.filter((i: any) => i.question.id === roleQuestionId).reverse()[0]?.answer
      const website = i.answers?.filter((i: any) => i.question.id === websiteQuestionId).reverse()[0]?.answer
      const twitter = i.answers?.filter((i: any) => i.question.id === twitterQuestionId).reverse()[0]?.answer
      const github = i.answers?.filter((i: any) => i.question.id === githubQuestionId).reverse()[0]?.answer

      const speaker: any = {
        ...i,
        tracks: [...new Set(speakerSessions.map(i => i.track))],
        eventDays: [...new Set(speakerSessions.map(i => moment.utc(i.start).startOf('day').valueOf()))],
        sessions: speakerSessions
      }
  
      if (role) speaker.role = role
      if (organization) speaker.company = organization
      if (website) speaker.website = website
      if (twitter) speaker.twitter = twitter
      if (github) speaker.github = github
  
      return speaker
    })
  
    return speakers
}

export const fetchEvent = async (): Promise<any>  =>  {
  const event = await get(`/events/${eventName}`)

  return event
}

export const fetchSessionsBySpeaker = async (id: string): Promise<Array<SessionType>> => {
  // no endpoint exists, so fetches and filters all sessions recursively
  return (await fetchSessions()).filter(i => i.speakers.some(x => x.id === id));
};

export const fetchSessionsByRoom = async (id: string): Promise<Array<SessionType>> => {
  // no endpoint exists, so fetches and filters all sessions recursively
  return (await fetchSessions()).filter(i => i.room?.id === id);
};

export const getRelatedSessions = async (id: string, sessions: Array<SessionType>): Promise<Array<SessionType>> => {
  const data = sessions.length > 0 ? sessions : await fetchSessions();
  const session = data.find(i => i.id === id);
  if (!session) return [];

  const query = `${session.speakers.map(i => `"${i.name}"`).join(' | ')} | "${session.track}" | ${session.tags
    ?.split(',')
    ?.map(i => `"${i}"`)
    .join(' | ')}`;

  const fuse = new Fuse(data, fuseOptions);
  const result = fuse.search(query);

  return result
    .map(i => i.item)
    .filter(i => i.id !== id)
    .slice(0, 5);
};

export const fetchExpertiseLevels = async (): Promise<Array<string>> => {
  return Array.from(
    (await fetchSessions()).reduce((acc: Set<string>, session: SessionType) => {
      if (session.expertise) {
        acc.add(session.expertise);
      }

      return acc;
    }, new Set<string>())
  );
};

export const fetchSessionTypes = async (): Promise<Array<string>> => {
  return Array.from(
    (await fetchSessions()).reduce((acc: Set<string>, session: SessionType) => {
      if (session.type) {
        acc.add(session.type);
      }

      return acc;
    }, new Set<string>())
  );
};

export const fetchTracks = async (): Promise<Array<string>> => {
  // no endpoint exists, so fetches and filters all sessions recursively
  const tracks = (await fetchSessions()).map(i => i.track);
  return [...new Set(tracks)].sort();
};

export const fetchEventDays = async (): Promise<Array<number>> => {
  // no endpoint exists, so fetches and filters all sessions recursively
  const days = (await fetchSessions()).map(i => moment.utc(i.start).startOf('day').valueOf());
  return [...new Set(days)].sort();
};

export const fetchRooms = async (): Promise<Array<Room>> => {
  const rooms = await get(`/events/${eventName}/rooms`);

  return rooms.map((room: Room) => {
    return {
      ...room,
      id: room.name ? defaultSlugify(room.name) : String(room.id)
    }
  });
};

export const fetchFloors = async (): Promise<Array<string>> => {
  const rooms = await fetchRooms();
  return [...new Set(rooms.map(i => i.info).filter(Boolean))];
};

export const fetchSpeaker = async (id: string): Promise<Speaker | undefined> => {
  const speaker = await get(`/speakers/${id}`);

  if (!speaker || speaker.detail === 'Not found.') return undefined;

  return speaker;
};

async function get(slug: string) {
    // Never cache version
    if (cache.has(slug) && !slug.endsWith('/version'))  {
      return cache.get(slug)
    }
  
    const response = await fetch(`${baseUrl}${slug}`).then(resp => resp.json())
  
    let data = response
  
    // Extract nested items when using api.devcon.org
    if (response.data) data = response.data
    if (response.data.items) data = response.data.items
  
    cache.set(slug, data)

    return data
  }