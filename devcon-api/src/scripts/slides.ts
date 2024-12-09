import { GetData } from '@/clients/filesystem'
import { GetSubmissions } from '@/clients/pretalx'
import { CreatePresentationFromTemplate, GetSlides } from '@/clients/slides'
import { writeFileSync } from 'fs'
import path from 'path'

async function main() {
  await exportSlides()
}

async function exportSlides() {
  console.log('Export slides...')
  const sessions = GetData('sessions/devcon-7')
    .filter((i: any) => !i.resources_slides)
    .slice(0, 10)

  for (const session of sessions) {
    const slides = session.resources_presentation

    if (slides) {
      console.log('Export slides', session.sourceId, slides)
      const buffer = await GetSlides(slides.split('/d/')[1])
      if (buffer) {
        const filePath = path.join(__dirname, '../../data/slides/devcon-7', `${session.id}.pdf`)
        writeFileSync(filePath, buffer)
        writeFileSync(
          `./data/sessions/devcon-7/${session.id}.json`,
          JSON.stringify(
            {
              ...session,
              resources_slides: `https://api.devcon.org/data/slides/${session.eventId}/${session.id}.pdf`,
            },
            null,
            2
          )
        )
      }
    }
  }
}

async function generateSlides() {
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
