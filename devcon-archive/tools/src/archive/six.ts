import slugify from 'slugify'
import fs from 'fs'
import fetch from 'cross-fetch'
import matter from 'gray-matter'
import { join } from 'path'
import { google, youtube_v3 } from 'googleapis'
import { authenticate } from '@google-cloud/local-auth'
import { ArchiveVideo } from '../../../src/types/ArchiveVideo'
import { getVideoDuration, writeToFile } from './import'
import { writeProfileToFile } from './profiles'
import path from 'path'

require('dotenv').config()

const apiKey = process.env.GOOGLE_API_KEY
const sheetId = '1S4F3t1JFBRMecND9xoD3JbuHZqEy3BJ8ooTdbnMv-bE'
const sheetIndex = 4
const writeToArchive = false
const writeToYoutube = true
const baseArchiveFolder = '../src/content/archive'

const scopes = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload'
]

ImportRos()

const tracks = ['Cryptoeconomics', 'Developer Infrastructure', 'Governance & Coordination',
    'Layer 1 Protocol', 'Layer 2s', 'Opportunity & Global Impact', 'Security', 'Staking & Validator Experience',
    'UX & Design', 'ZKPs: Privacy, Identity, Infrastructure, & More']

const streamRooms = ['talk-1', 'talk-2', 'talk-3', 'talk-4', 'talk-5', 'talk-5-opening-ceremonies',
    'workshop-1', 'workshop-2', 'workshop-3', 'workshop-4']

async function InitialRun() {
    // 1. Initial run to Create session pages 
    console.log('Pretalx Archive import..')

    const response = await fetch(`https://app.devcon.org/api/schedule`)
    const body = await response.json()
    console.log(body.data.length, 'sessions')

    for (let i = 0; i < body.data.length; i++) {
        const session = body.data[i]
        if (!streamRooms.some(i => session.room?.id === i)) {
            return
        }

        writeToFile(mapArchiveVideo(session))
    }

    // -> Generate speaker profiles
    // TODO

    // -> Generate Devcon 6 playlist
    GeneratePlaylist(body.data, '6')

    // -> Generate Track playlists
    tracks.forEach(i => {
        GeneratePlaylist(body.data.filter((x: any) => x.track === i), slugify(i.toLowerCase(), { strict: true }))
    })

    console.log('Done')
}

function GeneratePlaylist(sessions: any[], type: string) {
    // Writing playlist file to edition directory. Still need to process (copy/paste) to any playlists
    const videoPaths = sessions.map(i => `6/${slugify(i.title.toLowerCase(), { strict: true })}/index`)
    const dirName = `../src/content/archive/generation`
    fs.mkdir(dirName, { recursive: true }, () => '')
    fs.writeFileSync(`${dirName}/${type}.md`, '- ' + videoPaths.join('\n- '))
}

async function ImportSpeakers() {
    console.log('Fetch schedule info')
    const res = await fetch(`https://app.devcon.org/api/schedule`)
    const body = await res.json()
    const sessions = body.data
    console.log(sessions.length, 'sessions')

    const speakers = Array.from(new Set(sessions.map((i: any) => i.speakers).flat()))
    console.log(speakers.length)
    speakers.forEach(i => {
        writeProfileToFile(i)
    })
}


async function ImportRos() {
    console.log('Fetch schedule info')
    const res = await fetch(`https://app.devcon.org/api/schedule`)
    const body = await res.json()
    const sessions = body.data
    console.log(sessions.length, 'sessions')

    const sheets = google.sheets({
        version: 'v4',
        auth: apiKey
    })
    const sheetsResponse = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
    })
    const sheetNames = sheetsResponse.data?.sheets?.map((i: any) => i.properties.title)
    const sheet = sheetNames ? sheetNames[sheetIndex] : ''
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

    let youtube: youtube_v3.Youtube
    if (writeToYoutube) {
        const auth = await authenticate({
            keyfilePath: path.join(__dirname, '../../credentials/devtest.json'),
            scopes
        })
        google.options({ auth })
    }

    const markdownVideos = getMarkdownVideos()
    console.log('Amount of markdown videos', markdownVideos.length)
    console.log('Including YT urls', markdownVideos.filter(i => !!i.youtubeUrl).length)

    for (let i = 0; i < sessions.length; i++) {
        const info = data[i]
        if (!info || !info[0] || !info[7]) {
            console.log(i, 'No sessionId/YouTube', info)
            continue // skip
        }

        const sessionId = info[0] // sessionId column (A)
        console.log(i, 'Processing session', sessionId)
        const session = sessions.find((i: any) => sessionId === i.id)
        if (!session) {
            console.log('Session not found', sessionId, session)
            continue // skip
        }

        if (!session.speakers || session.speakers.length === 0) {
            console.log('Skip no speakers', session.speakers)
            continue // multiple speakers, skip 
        }

        const youtubeUrl = info[7] // youtubeUrl column (H)
        const youtubeProcessed = info[10] // YT Update column (K)
        const youtubeId = getVideoId(youtubeUrl)
        const existing = markdownVideos.find(i => i.sourceId === sessionId)

        if (writeToArchive && existing?.youtubeUrl !== youtubeUrl) {
            const duration = await getVideoDuration(youtubeId)
            let video = mapArchiveVideo(session)
            video.duration = duration ?? 0
            video.youtubeUrl = youtubeUrl

            writeToFile(video)
        }

        if (writeToYoutube) { // && youtubeProcessed != 'Y'
            console.log('Update YouTube', sessionId, youtubeUrl)
            let title = session.title
            if (session.speakers.length === 1)
                title += ` by ${session.speakers[0].name}`
            if (title.length < 81) 
                title += ' | Devcon Bogotá'

            // if (title === session.title) continue // no need to update
            try {
                youtube = google.youtube('v3')
                const res1 = await youtube.videos.update({
                    part: [
                        "id", "snippet"
                    ],
                    requestBody: {
                        id: youtubeId,
                        snippet: {
                            title: title,
                            description: getSessionDescription(session),
                            categoryId: '28'
                        },
                    }
                })
                if (res1.status !== 200) {
                    console.log(res1.statusText)
                }

                const fileName = path.join(__dirname, `../../data/${session.id}_1080.png`)
                if (!fs.existsSync(fileName)) {
                    console.log('File does NOT exists', fileName)
                }
                else {
                    console.log('Adding thumbnail..')
                    const res2 = await youtube.thumbnails.set({
                        videoId: youtubeId,
                        media: {
                            body: fs.createReadStream(fileName),
                        }
                    })
                    if (res2.status !== 200) {
                        console.log(res.statusText)
                    }
                }
            }
            catch (e: any) {
                console.error('ERROR', e.code, e.errors)
            }
        }
    }
}

function getMarkdownVideos() {
    const dir = join(process.cwd(), baseArchiveFolder, 'videos', '6')
    const dirs = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((i) => i.isDirectory() && fs.readdirSync(join(dir, i.name), { withFileTypes: true }).some((i) => i.isFile() && i.name.endsWith('.md')))

    return dirs.map(i => {
        const fullPath = join(dir, i.name, 'index.md')
        const content = fs.readFileSync(fullPath, 'utf8')
        const doc = matter(content)
        return doc.data
    })
}

function getVideoId(youtubeUrl: string): string {
    let videoId = youtubeUrl
    videoId = videoId.replace('https://youtu.be/', '')
    videoId = videoId.replace('https://www.youtube.com/embed/', '')
    videoId = videoId.replace('https://www.youtube.com/watch?v=', '')
    videoId = videoId.replace('https://studio.youtube.com/video/', '')
    videoId = videoId.replace('&feature=youtu.be', '')
    videoId = videoId.replace('/edit', '')

    return videoId
}

function mapArchiveVideo(session: any): ArchiveVideo {
    return {
        edition: 6,
        sourceId: session.id,
        title: session.title,
        description: session.description,
        youtubeUrl: '',
        ipfsHash: '',
        ethernaIndex: '',
        ethernaPermalink: '',
        duration: 0,
        expertise: session.expertise,
        type: session.type?.includes('Workshop') ? 'Workshop' : session.type,
        track: session.track,
        tags: [session.track],
        keywords: session.tags,
        speakers: session.speakers.map((i: any) => i.name)
    } as ArchiveVideo
}

function getSessionDescription(session: any) {
    return `Visit the https://archive.devcon.org/ to gain access to the entire library of Devcon talks with the ease of filtering, playlists, personalized suggestions, decentralized access on Swarm, IPFS and more.
https://archive.devcon.org/archive/watch/6/${slugify(session.title.toLowerCase(), { strict: true })}/

${session.description}

Speaker(s): ${session.speakers.map((i: any) => i.name).join(', ')}
${session.expertise ? `Skill level: ${session.expertise}\n` : ''}Track: ${session.track}
Keywords: ${session.tags}

Follow us: https://twitter.com/efdevcon, https://twitter.com/ethereum
Learn more about devcon: https://www.devcon.org/
Learn more about ethereum: https://ethereum.org/ 

Devcon is the Ethereum conference for developers, researchers, thinkers, and makers. 
Devcon 6 was held in Bogotá, Colombia on Oct 11 - 14, 2022.
Devcon is organized and presented by the Ethereum Foundation, with the support of our sponsors. To find out more, please visit https://ethereum.foundation/`
}
