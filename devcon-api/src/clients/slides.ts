import { AuthenticateServiceAccount } from '@/clients/google'
import { CONFIG } from '@/utils/config'
import fs from 'fs'
import { GoogleApis } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive']
const DRIVE_ID = '0AJsI-Zeg-2IbUk9PVA'
const FOLDER_ID = '1IXkffNcDyycQe5Cxrc9Dtirgw1WitV1j'
const TEMPLATE_ID = '1pDxePJwWHpzIxIjl3OZVnkS9N_tBQKRfg57PeEkTqeU'
const sendEmail = false
const emailMessage = ''

let client: GoogleApis | null = null

export async function CreateFolders(folders: string[]) {
  console.log('Create folders', folders)
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  for (const folder of folders) {
    const exists = await drive.files.list({
      q: `name='${folder}' and trashed=false and mimeType='application/vnd.google-apps.folder' and '${FOLDER_ID}' in parents`,
      corpora: 'drive',
      spaces: 'drive',
      driveId: DRIVE_ID,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    if (exists.data.files && exists.data.files.length > 0) {
      console.log('Folder already exists', folder)
      continue
    }

    const file = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: folder,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FOLDER_ID],
      },
    })

    console.log('Folder created', file.data.id)
  }
}

export async function CreatePresentationFromTemplate(title: string, id: string, emails: string[]) {
  if (!client) {
    client = await AuthenticateServiceAccount(SCOPES)
  }
  const drive = client.drive('v3')

  try {
    const exists = await drive.files.list({
      q: `name contains '[${id}]' and trashed=false and mimeType='application/vnd.google-apps.presentation' and '${FOLDER_ID}' in parents`,
      corpora: 'drive',
      spaces: 'drive',
      driveId: DRIVE_ID,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    if (exists.data.files && exists.data.files.length > 0) {
      console.log('Presentation already exists', id, title)
      return exists.data.files[0].id
    }

    console.log('Creating new presentation', `[${id}]`, title)
    const presentation = await drive.files.copy({
      fileId: TEMPLATE_ID,
      supportsAllDrives: true,
      requestBody: {
        name: `${title} [${id}]`,
        parents: [FOLDER_ID],
      },
    })

    const presentationId = presentation.data.id
    if (!presentationId) {
      console.error('Error create presentation from template', TEMPLATE_ID, id, title)
      return
    }

    console.log('Setting permissions...')
    for (const email of emails) {
      await drive.permissions.create({
        fileId: presentationId,
        supportsAllDrives: true,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email,
        },
        sendNotificationEmail: sendEmail,
        emailMessage: sendEmail && emailMessage ? emailMessage : undefined,
      })
    }

    console.log('Presentation created', `https://docs.google.com/presentation/d/${presentationId}`)
    return presentationId
  } catch (e) {
    console.log('Error create presentation from template', TEMPLATE_ID, id, title)
    console.error(e)
  }
}

export async function DownloadSlides(id: string) {
  const res = await fetch(`https://docs.google.com/presentation/d/${id}/export/pdf?opts=shs%3D0`)
  const arr = await res.arrayBuffer()
  const buffer = Buffer.from(arr)

  if (buffer.length > 3125) {
    fs.writeFileSync(`${CONFIG.DATA_FOLDER}/slides/${id}.pdf`, buffer)
  } else {
    console.log('Invalid slides', id)
  }
}

export function getSlidesId(url: string): string {
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
