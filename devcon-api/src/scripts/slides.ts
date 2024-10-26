import { GetSubmissions } from '@/clients/pretalx'
import { CreatePresentationFromTemplate } from '@/clients/slides'

async function main() {
  console.log('Generate Speaker slides...')

  const sessions = await GetSubmissions({ inclContacts: true })
  console.log('# of Submissions', sessions.length)

  for (const session of sessions) {
    await CreatePresentationFromTemplate(
      session.title,
      session.sourceId,
      session?.speakers.map((i: any) => i.email)
    )
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
