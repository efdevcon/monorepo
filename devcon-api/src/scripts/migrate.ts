import { GetData } from '@/clients/filesystem'
import { PrismaClient } from '@/db/clients/account'
import { PrismaClient as ScheduleClient } from '@prisma/client'

async function main() {
  console.log('Migrate user profile data...')

  const speakers = GetData('speakers')
  const client = new PrismaClient()
  const users = await client.account.findMany({
    where: {
      favorite_speakers: {
        isEmpty: false,
      },
    },
  })

  for (const user of users) {
    const favoriteSpeakers = speakers.filter((s) => user.favorite_speakers.includes(s.sourceId)).map((s) => s.id)
    await client.account.update({
      where: {
        id: user.id,
      },
      data: {
        favorite_speakers: favoriteSpeakers,
      },
    })
  }
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
