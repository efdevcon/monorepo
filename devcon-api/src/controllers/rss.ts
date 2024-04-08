import { PrismaClient } from '@prisma/client'
import { GetAudioData } from 'clients/filesystem'
import { Request, Response, Router } from 'express'
import { API_DEFAULTS, API_INFO, DEVCON_INFO } from 'utils/config'

const client = new PrismaClient()

export const rssRouter = Router()
rssRouter.get(`/rss/podcast`, GetPodcasts)

async function GetPodcasts(req: Request, res: Response) {
  // #swagger.tags = ['RSS']

  const audioTracks = GetAudioData()
  const sessions = await client.session.findMany()

  const feed = `<?xml version="1.0"?>
  <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${DEVCON_INFO.title}</title>
    <description>${DEVCON_INFO.description}</description>
    <language>en-us</language>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Technology" />
    <itunes:image href="${API_INFO.website}/static/images/podcast/default.png" />
    <link>${DEVCON_INFO.website}</link>
    <itunes:author>${DEVCON_INFO.title}</itunes:author>
    <itunes:owner>
      <itunes:name>${DEVCON_INFO.title}</itunes:name>
      <itunes:email>${API_INFO.email}</itunes:email>
    </itunes:owner>
  </channel>
  ${audioTracks.map((i) => {
    const session = sessions.find((s) => s.id === i.id)
    if (!session) return ''

    // Other recommended, but not required fields/metadata
    // <guid>${i.id}</guid> // unique identifier that should always remain the same. Otherwise, enclosure url is used. Could result in duplicate uploads
    // <pubDate>${session.pubDate}</pubDate>
    const edition = session.eventId.replace('devcon-', '')
    let showImage = ''
    if (edition === '6') {
      showImage = `<itunes:image href="${API_INFO.website}/static/images/podcast/devcon-6.png" />`
    }
    return `<item>
        <title>${session.title}</title>
        <enclosure url="${API_DEFAULTS.githubDataUrl}/audio/${session.eventId}/${i.id}.mp3" length="${i.fileSize}" type="audio/mpeg" />
        <itunes:duration>${session.duration}</itunes:duration>
        <itunes:description><![CDATA[${session.description}]]></itunes:description>
        ${showImage}
        <link>https://archive.devcon.org/archive/watch/${edition}/${i.id}/</link>
      </item>`
  })}
  </rss>`

  res.status(200).type('text/xml').send(feed)
}
