import dayjs from 'dayjs'
import { Request, Response, Router } from 'express'
import Handlebars from 'handlebars'
import puppeteer from 'puppeteer'
import { ogImageTemplate } from 'templates/og'
import { templateStyles } from 'templates/styles'
import { GetEventDay, GetTrackId, GetTrackImage } from 'utils/templates'
import { PrismaClient } from '@prisma/client'
import { API_DEFAULTS } from 'utils/config'

const client = new PrismaClient()

export const sessionsRouter = Router()
sessionsRouter.get(`/sessions`, GetSessions)
sessionsRouter.get(`/sessions/:id`, GetSession)
sessionsRouter.get(`/sessions/:id/image`, GetSessionImage)
sessionsRouter.get(`/sessions/:id/related`, GetSessionRelated)

export async function GetSessions(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']

  const currentPage = req.query.from && req.query.size ? Math.ceil((Number(req.query.from) + 1) / Number(req.query.size)) : 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: any = {
    skip: 0,
    take: API_DEFAULTS.SIZE,
    where: {},
    include: {
      speakers: true,
    },
  }
  if (req.query.from) args.skip = parseInt(req.query.from as string)
  if (req.query.size) args.take = parseInt(req.query.size as string)
  if (req.query.sort) args.orderBy = { [req.query.sort as string]: req.query.order || API_DEFAULTS.ORDER }

  // Note: filters are case sensitive
  if (req.query.q) {
    const query = req.query.q as string
    args.where.OR = [
      {
        title: {
          contains: query,
        },
      },
      {
        description: {
          contains: query,
        },
      },
      {
        speakers: {
          some: {
            name: {
              contains: query,
            },
          },
        },
      },
    ]
  }
  if (req.query.event) {
    args.where.eventId = {
      in: [req.query.event].flat() as string[],
    }
  }
  if (req.query.expertise) {
    args.where.expertise = {
      in: [req.query.expertise].flat() as string[],
    }
  }
  if (req.query.type) {
    args.where.type = {
      in: [req.query.type].flat() as string[],
    }
  }
  if (req.query.tags) {
    args.where.track = {
      in: [req.query.tags].flat() as string[],
    }
  }

  const data = await client.$transaction([client.session.count({ where: args.where }), client.session.findMany(args)])
  res.status(200).send({
    status: 200,
    message: '',
    data: {
      total: data[0],
      currentPage: currentPage,
      items: data[1],
    },
  })
}

export async function GetSession(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = await client.session.findFirst({
    where: {
      OR: [{ id: req.params.id }, { sourceId: req.params.id }],
    },
  })

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data })
}

export async function GetSessionRelated(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = await client.relatedSession.findMany({
    where: { sessionId: req.params.id },
    orderBy: { similarity: 'desc' },
    include: { related: true },
    take: 10,
  })

  if (!data) return res.status(404).send({ status: 404, message: 'Not Found' })

  res.status(200).send({ status: 200, message: '', data: data.map((i) => i.related) })
}

export async function GetSessionImage(req: Request, res: Response) {
  // #swagger.tags = ['Sessions']
  const data = await client.session.findFirst({
    where: {
      OR: [{ id: req.params.id }, { sourceId: req.params.id }],
    },
    include: {
      speakers: true,
    },
  })

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
          // Image has already finished loading, let’s see if it worked
          if (img.complete) {
            // Image loaded and has presence
            if (img.naturalHeight !== 0) return
            // Image failed, so it has no height
            throw new Error('Image failed to load')
          }
          // Image hasn’t loaded yet, added an event listener to know when it does
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
