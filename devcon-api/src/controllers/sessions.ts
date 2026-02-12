import dayjs from 'dayjs'
import { Request, Response, Router } from 'express'
import Handlebars from 'handlebars'
import puppeteer from 'puppeteer'
import { ogImageTemplate } from '@/templates/og'
import { templateStyles } from '@/templates/styles'
import { GetEventDay, GetTrackId, GetTrackImage } from '@/utils/templates'
import { API_DEFAULTS } from '@/utils/config'
import { CommitSession } from '@/services/github'
import { apikeyHandler } from '@/middleware/apikey'
import * as store from '@/data/store'

export const sessionsRouter = Router()
sessionsRouter.get(`/sessions`, GetSessions)
sessionsRouter.get(`/sessions/:id/related`, GetSessionRelated)
sessionsRouter.get(`/sessions/:id`, GetSession)
sessionsRouter.put(`/sessions/:id`, apikeyHandler, UpdateSession)
sessionsRouter.put(`/sessions/sources/:id`, apikeyHandler, UpdateSessionSources)
sessionsRouter.get(`/sessions/:id/image`, GetSessionImage)

export async function GetSessions(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']

  const currentPage = req.query.from && req.query.size ? Math.ceil((Number(req.query.from) + 1) / Number(req.query.size)) : 1
  const skip = req.query.from ? parseInt(req.query.from as string) : 0
  const take = req.query.size ? parseInt(req.query.size as string) : API_DEFAULTS.SIZE

  const data = store.getSessions({
    q: req.query.q as string | undefined,
    event: req.query.event as string | string[] | undefined,
    expertise: req.query.expertise as string | string[] | undefined,
    type: req.query.type as string | string[] | undefined,
    tags: req.query.tags as string | string[] | undefined,
    room: req.query.room as string | undefined,
    sort: req.query.sort as string | undefined,
    order: (req.query.order as string) || API_DEFAULTS.ORDER,
    skip,
    take,
  })

  res.status(200).send({
    status: 200,
    message: '',
    data: {
      total: data.total,
      currentPage: currentPage,
      items: data.items,
    },
  })
}

export async function GetSession(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = store.getSession(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data })
}

export async function GetSessionRelated(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = store.getRelatedSessions(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data })
}

export async function UpdateSession(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  // #swagger.parameters['apiKey'] = { in: 'query', required: true, type: 'string', description: 'API key for authentication' }
  // #swagger.parameters['body'] = { in: 'body', schema: { id: 'new-title', sourceId: 'PRE123', eventId: 'devcon-6', title: 'New Title', description: 'New Description', track: 'Devcon', type: 'Talk', expertise: 'Intermediate', speakers: ['123', '456'], tags: ['tag1', 'tag2'], keywords: ['keyword1', 'keyword2'], resources_slides: 'https://devcon.org/resources/new-title.pdf', slot_start: 1665495000000, slot_end: 1665498600000, slot_roomId: 'workshop-3', sources_ipfsHash: 'QmTwmiv4u44XLBhbm5BmowKv91HfivDLvpSYaXUt1vmRRG', sources_youtubeId: 'TRoO5fD7TI4', sources_swarmHash: 'e8caa4dd5a1d7a7c8edb7e71933031f29f7feadcea2d2ce017d30c0dceb97850', duration: 3065, language: 'en' } }

  const body = req.body
  if (!body) return res.status(400).send({ status: 400, message: 'No Body' })
  if (req.params.id !== body.id && req.params.id !== body.sourceId) {
    return res.status(400).send({ status: 400, message: 'Invalid Id' })
  }

  const data = store.getSession(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })
  if (Object.keys(body).some((key) => !(key in data))) {
    return res.status(400).send({ status: 400, message: 'Invalid fields' })
  }

  try {
    const updatedData = store.updateSession(data.id, body)

    await CommitSession(updatedData, `[skip deploy] PUT /sessions/${updatedData.id}`)

    res.status(204).send()
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).send({ status: 500, message: 'Internal Server Error' })
  }
}

export async function UpdateSessionSources(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  // #swagger.parameters['apiKey'] = { in: 'query', required: true, type: 'string', description: 'API key for authentication' }
  // #swagger.parameters['body'] = { in: 'body', schema: { sources_ipfsHash: 'QmTwmiv4u44XLBhbm5BmowKv91HfivDLvpSYaXUt1vmRRG', sources_youtubeId: 'TRoO5fD7TI4', sources_swarmHash: 'e8caa4dd5a1d7a7c8edb7e71933031f29f7feadcea2d2ce017d30c0dceb97850', sources_livepeerId: 'LPO5ID', duration: 3065 } }

  const body = req.body
  if (!body) return res.status(400).send({ status: 400, message: 'No Body' })

  const data = store.getSession(req.params.id)
  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  try {
    const updatedData = store.updateSession(data.id, {
      sources_ipfsHash: body.sources_ipfsHash ?? '',
      sources_youtubeId: body.sources_youtubeId ?? '',
      sources_swarmHash: body.sources_swarmHash ?? '',
      sources_livepeerId: body.sources_livepeerId ?? '',
      sources_streamethId: body.sources_streamethId ?? '',
      transcript_vtt: body.transcript_vtt ?? '',
      transcript_text: body.transcript_text ?? '',
      duration: body.duration ?? 0,
    })
    console.log('Updated session', updatedData.id)

    const version = Date.now().toString()
    console.log('Updating event version...', version)
    store.updateEventVersion('devcon-7', version)

    // TODO: update AI transcripts

    await CommitSession(updatedData, `[skip deploy] PUT /sessions/${updatedData.id}`)

    res.status(204).send()
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).send({ status: 500, message: 'Internal Server Error' })
  }
}

export async function GetSessionImage(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = store.getSession(req.params.id)

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  const imageType: string = 'og' // og | video
  const styles = Handlebars.compile(templateStyles)({
    fontSize: imageType === 'video' ? '1.8rem' : '1.4rem',
    scaledFontSize: data.title.length > 100 ? 'smaller' : data.title.length < 50 ? 'larger' : 'inherit',
  })

  let eventDay = ''
  if (data.slot_start) {
    eventDay = `${GetEventDay(data.eventId, data.slot_start)} — ${dayjs(data.slot_start).format('MMM DD, YYYY')}`
  }
  const baseUri = `${req.protocol}://${req.headers.host}`
  const html = Handlebars.compile(ogImageTemplate)({
    cssStyle: styles,
    logoUrl: `${baseUri}/static/images/editions/${data.eventId}.svg`,
    imageType: imageType,
    track: GetTrackId(data.track),
    trackImage: GetTrackImage(baseUri, data.track),
    type: data.type,
    title: data.title,
    eventDay: eventDay,
    speaker: data.speakers.length === 1 ? data.speakers[0] : null,
    speakers: data.speakers.length > 1 ? data.speakers : [],
  })

  try {
    const browser = await puppeteer.launch({
      headless: true, // (default) switch to false to debug
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
      ],
    })
    const page = await browser.newPage()

    if (imageType === 'video') {
      await page.setViewport({ width: 1920, height: 1080 })
    } else {
      await page.setViewport({ width: 1200, height: 630 })
    }

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Wait until all images and fonts have loaded
    await page.evaluate(async () => {
      const selectors = Array.from(document.querySelectorAll('img'))
      await Promise.all([
        document.fonts.ready,
        ...selectors.map((img) => {
          // Image has already finished loading, let's see if it worked
          if (img.complete) {
            // Image loaded and has presence
            if (img.naturalHeight !== 0) return
            // Image failed, so it has no height
            throw new Error('Image failed to load')
          }
          // Image hasn't loaded yet, added an event listener to know when it does
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', reject)
          })
        }),
      ])
    })

    const image = await page.screenshot({ type: 'png', omitBackground: true })

    await page.close()
    await browser.close()

    res.statusCode = 200
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', `immutable, no-transform, s-max-age=2592000, max-age=2592000`)
    res.end(image)
  } catch (error) {
    console.error(error)
    res.status(500).send({ status: 500, message: 'Internal Server Error' })
  }
}
