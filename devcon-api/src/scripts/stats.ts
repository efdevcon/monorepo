import { Account, PrismaClient } from '@/db/clients/account'
import { PrismaClient as ScheduleClient } from '@prisma/client'

const LIMIT = 15

async function main() {
  const client = new PrismaClient()
  const scheduleClient = new ScheduleClient()

  const totalAccounts = await client.account.count()
  console.log('Total nr. of accounts', totalAccounts)

  const accounts = await client.$queryRaw<Account[]>`
    SELECT DISTINCT a.*
    FROM "Account" a
    INNER JOIN "VerificationToken" vt
    ON vt.identifier = a.email
      OR vt.identifier = ANY(a.addresses)
  `

  console.log('Total nr. of active accounts (DC7)', accounts.length)
  const newAccounts = accounts.filter((i) => !i.appState_bogota)
  console.log('- New DC7 registrations', newAccounts.length)
  const returningAccounts = accounts.filter((i) => i.appState_bogota)
  console.log('- Returning DC6 accounts', returningAccounts.length)

  // Auth
  const walletAccounts = accounts.filter((i) => i.addresses?.length > 0)
  console.log('- Registered with a wallet', walletAccounts.length)
  const emailAccounts = accounts.filter((i) => i.email)
  console.log('- Registered with email', emailAccounts.length)
  const haveBoth = accounts.filter((i) => i.addresses?.length > 0 && i.email)
  console.log('- Registered with both', haveBoth.length)
  console.log()

  // Onboarding
  const onboardedAccounts = accounts.filter((i) => i.onboarded)
  console.log('Accounts that completed onboarding', onboardedAccounts.length)
  const skippedAccounts = accounts.filter((i) => !i.onboarded)
  console.log('Accounts that skipped onboarding', skippedAccounts.length)
  console.log('Onboarding completion %', Math.round((onboardedAccounts.length / accounts.length) * 100))
  console.log()

  const profile = accounts.filter((i) => i.roles && i.since && i.tracks)
  console.log('Accounts with a profile (role, experience, tracks)', profile.length)
  console.log('Profile completion %', Math.round((profile.length / accounts.length) * 100))
  console.log()

  // Schedule
  const publicSchedules = accounts.filter((i) => i.publicSchedule)
  console.log('Accounts with public schedule', publicSchedules.length)
  console.log('Public schedule %', Math.round((publicSchedules.length / accounts.length) * 100))

  // Bookmarking
  const bookmarkedSpeakers = accounts.filter((i) => i.favorite_speakers?.length > 0)
  console.log('Accounts with bookmarked speakers', bookmarkedSpeakers.length)
  const attendingSessionsCount = accounts.filter((i) => i.attending_sessions?.length > 0)
  console.log('Accounts with attending sessions', attendingSessionsCount.length)
  const interestedSessionsCount = accounts.filter((i) => i.interested_sessions?.length > 0)
  console.log('Accounts with interested sessions', interestedSessionsCount.length)
  console.log()

  const subscriptions = await client.pushSubscription.findMany()
  console.log('Accounts that subscribed to notifications', subscriptions.length)
  const uniqueSubscribers = subscriptions.map((i) => i.userId)
  console.log('Unique subscribers', new Set(uniqueSubscribers).size)
  console.log('Subscriptions %', Math.round((uniqueSubscribers.length / accounts.length) * 100))

  // Schedule
  const favoriteSpeakers = await client.$queryRaw<{ speaker: string; count: bigint }[]>`
    SELECT unnest(favorite_speakers) as speaker, 
           COUNT(*) as count 
    FROM "Account" 
    WHERE favorite_speakers IS NOT NULL 
    AND array_length(favorite_speakers, 1) > 0
    GROUP BY unnest(favorite_speakers) 
    ORDER BY count DESC 
    LIMIT ${LIMIT * 2}
  `
  const dbSpeakers = await scheduleClient.speaker.findMany({
    where: {
      OR: [
        {
          id: {
            in: favoriteSpeakers.map((i) => i.speaker),
          },
        },
        {
          sourceId: {
            in: favoriteSpeakers.map((i) => i.speaker),
          },
        },
      ],
    },
    include: {
      sessions: true,
    },
  })
  const dc7Speakers = dbSpeakers.filter((i) => i.sessions.some((s) => s.eventId === 'devcon-7'))
  console.log(`\nTop ${LIMIT} Favorite Speakers:`)
  for (const data of favoriteSpeakers.filter((i) => dc7Speakers.find((j) => j.id === i.speaker)).slice(0, LIMIT)) {
    console.log(Number(data.count), data.speaker)
  }

  const attendingSessions = await client.$queryRaw<{ session: string; count: bigint }[]>`
    SELECT unnest(attending_sessions) as session, 
           COUNT(*) as count 
    FROM "Account" 
    WHERE attending_sessions IS NOT NULL 
    AND array_length(attending_sessions, 1) > 0
    GROUP BY unnest(attending_sessions) 
    ORDER BY count DESC 
    LIMIT ${LIMIT}
  `
  console.log(`\nTop ${LIMIT} Attending Sessions:`)
  for (const data of attendingSessions) {
    const session = await scheduleClient.session.findFirst({
      where: {
        sourceId: data.session,
      },
    })

    console.log(Number(data.count), session?.title, `[${data.session}]`)
  }

  const interestedSessions = await client.$queryRaw<{ session: string; count: bigint }[]>`
    SELECT unnest(interested_sessions) as session, 
           COUNT(*) as count 
    FROM "Account" 
    WHERE interested_sessions IS NOT NULL 
    AND array_length(interested_sessions, 1) > 0
    GROUP BY unnest(interested_sessions) 
    ORDER BY count DESC 
    LIMIT ${LIMIT}
  `
  console.log(`\nTop ${LIMIT} Interested Sessions:`)
  for (const data of interestedSessions) {
    const session = await scheduleClient.session.findFirst({
      where: {
        sourceId: data.session,
      },
    })

    console.log(Number(data.count), session?.title, `[${data.session}]`)
  }
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
