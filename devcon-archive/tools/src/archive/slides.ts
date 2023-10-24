import fs from 'fs'
import fetch from 'cross-fetch'
import matter from 'gray-matter'
import { join } from 'path'
import { google } from 'googleapis'
import { writeToFile } from './import'
import { ArchiveVideo } from '../../../src/types/ArchiveVideo'
import slugify from 'slugify'

require('dotenv').config()

const apiKey = process.env.GOOGLE_API_KEY
const sheetId = '1c8xBJ2wfRMlnwc1XGgC9xvoB6KgWOAuiN7md6NQFt_0'
const baseArchiveFolder = '../src/content/archive'

DownloadSlides()

async function DownloadSlides() {
  const markdownVideos = getMarkdownVideos()
  console.log('Amount of markdown videos', markdownVideos.length)

  const sheets = google.sheets({
    version: 'v4',
    auth: apiKey,
  })
  const sheetsResponse = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  })
  const sheetNames = sheetsResponse.data?.sheets?.map((i: any) => i.properties.title)
  const sheet = sheetNames ? sheetNames[0] : ''
  if (!sheet) return console.log('No sheet')

  console.log('Processing Sheet', sheet)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheet}!A1:1000`,
  })

  const data = response.data?.values
  if (!data) {
    console.log('No Data')
    return
  }

  for (let i = 0; i < data.length; i++) {
    const info = data[i]
    if (!info || !info[0] || !info[1]) {
      continue // skip
    }
    if (info[1] === 'No slides' || info[1] === 'No slide' || info[1] === 'Link') {
      continue // skip
    }

    const sessionId = info[0]
    let session: any = markdownVideos.find(i => i.sourceId === sessionId)
    if (!session) {
      console.log('SESSION NOT FOUND', sessionId)
      continue // skip
    }

    const id = getSlidesId(info[1])
    const path = `/resources/6/${slugify(session.title.toLowerCase(), { strict: true })}.pdf`

    if (fs.existsSync(`../static${path}`) || session.slidesUrl) {
      console.log(sessionId, 'already exists. Skip')
      continue
    }

    console.log('PROCESS', sessionId, id)
    const res = await fetch(`https://docs.google.com/presentation/d/${id}/export/pdf?opts=shs%3D0`)
    const arr = await res.arrayBuffer()
    const buffer = Buffer.from(arr)

    if (buffer.length > 3125) {
      fs.writeFileSync(`../static${path}`, buffer)

      // Write to file
      session.slidesUrl = path
      writeToFile(session)
    } else {
      console.log('Invalid slides.', path)
    }
  }
}

function getSlidesId(url: string): string {
  let id = url
  id = id.replace('https://docs.google.com/presentation/d/', '')
  id = id.replace('/edit?usp=sharing', '')
  id = id.replace('/edit#slide=id.p', '')
  id = id.replace('/edit#slide=id.g13737362dea_0_1', '')
  id = id.replace('/edit?usp=drive_web&ouid=114193972392563644912', '')
  id = id.replace('/edit#slide=id.g14286fcf6b3_0_92', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit#slide=id.g1433c566fdb_1_78', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit#slide=id.p1', '')
  id = id.replace('/edit', '')

  return id
}

function getMarkdownVideos() {
  const dir = join(process.cwd(), baseArchiveFolder, 'videos', '6')
  const dirs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      i =>
        i.isDirectory() &&
        fs.readdirSync(join(dir, i.name), { withFileTypes: true }).some(i => i.isFile() && i.name.endsWith('.md'))
    )

  return dirs.map(i => {
    const fullPath = join(dir, i.name, 'index.md')
    const content = fs.readFileSync(fullPath, 'utf8')
    const doc = matter(content)
    return doc.data as ArchiveVideo
  })
}
