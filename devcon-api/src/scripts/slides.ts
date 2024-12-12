import { GetData } from '@/clients/filesystem'
import { GetSubmissions } from '@/clients/pretalx'
import { CreatePresentationFromTemplate, GetSlides, UploadSlides } from '@/clients/slides'
import { readFileSync, statSync, unlinkSync, writeFileSync } from 'fs'
import path from 'path'

async function main() {
  // await exportSlides()
  await migrateSlides()
}

async function migrateSlides() {
  const sessions = GetData('sessions/devcon-7').filter((i: any) => i.resources_slides?.startsWith('https://api.devcon.org/'))

  for (const session of sessions) {
    const filePath = path.join(__dirname, '../../data/slides/devcon-7', `${session.id}.pdf`)
    const buffer = readFileSync(filePath)
    const id = await UploadSlides(session.id, buffer)

    if (id) {
      writeFileSync(
        `./data/sessions/devcon-7/${session.id}.json`,
        JSON.stringify({ ...session, resources_slides: `https://drive.google.com/file/d/${id}/view` }, null, 2)
      )
      unlinkSync(filePath)
    }
  }
}

async function cleanupSlides() {
  const sessions = GetData('sessions/devcon-7').filter((i: any) => i.resources_slides)

  for (const session of sessions) {
    const sessionPath = path.join(__dirname, '../../data/sessions/devcon-7', `${session.id}.json`)
    const filePath = path.join(__dirname, '../../data/slides/devcon-7', `${session.id}.pdf`)
    const stats = statSync(filePath)

    if (stats.size === 0 || stats.size <= 10000 || (stats.size >= 5302563 && stats.size <= 5302735)) {
      console.log('Delete slides', session.id, stats.size)
      console.log(filePath)
      console.log('')

      unlinkSync(filePath)
      writeFileSync(sessionPath, JSON.stringify({ ...session, resources_slides: '' }, null, 2))
    }
  }
}

async function exportSlides() {
  console.log('Export slides...')
  const sessions = GetData('sessions/devcon-7').filter((i: any) => !i.resources_slides)

  for (const session of sessions) {
    const slides = session.resources_presentation

    if (slides) {
      console.log('Export slides', session.sourceId, slides)
      const buffer = await GetSlides(slides.split('/d/')[1])
      if (buffer && buffer.length > 10000 && (buffer.length <= 5302550 || buffer.length >= 5302750)) {
        console.log('Save slides', buffer.length)
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
      } else {
        console.log('Skip slides', session.id, buffer?.length)
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
