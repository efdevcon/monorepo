import { SERVER_CONFIG } from '@/utils/config'
import dayjs from 'dayjs'

export async function CommitSession(session: any, commitMessage: string = '') {
  try {
    const content = Buffer.from(SessionToJson(session)).toString('base64')
    const filePath = `devcon-api/data/sessions/${session.eventId}/${session.id}.json`

    const fileRes = await fetch(`https://api.github.com/repos/efdevcon/monorepo/contents/${filePath}`, {
      headers: {
        Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}`,
      },
    })

    let sha = ''
    if (fileRes.ok) {
      const fileData = await fileRes.json()
      sha = fileData.sha
    }

    const message = commitMessage || `Update session ${session.id}`
    const response = await fetch(`https://api.github.com/repos/efdevcon/monorepo/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        content: content,
        sha: sha,
        author: {
          name: 'github-actions[bot]',
          email: '41898282+github-actions[bot]@users.noreply.github.com',
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`)
    }
  } catch (error) {
    console.error('Error updating file in GitHub:', error)
    throw error
  }
}

export async function CommitContentFile(filePath: string, content: string, commitMessage: string) {
  const encoded = Buffer.from(content).toString('base64')

  const fileRes = await fetch(`https://api.github.com/repos/efdevcon/monorepo/contents/${filePath}`, {
    headers: { Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}` },
  })

  let sha: string | undefined
  let existing: string | undefined
  if (fileRes.ok) {
    const data = await fileRes.json()
    sha = data.sha
    existing = Buffer.from(data.content, 'base64').toString('utf-8')
  }

  if (existing === content) {
    return { changed: false as const }
  }

  const response = await fetch(`https://api.github.com/repos/efdevcon/monorepo/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encoded,
      sha,
      author: {
        name: 'github-actions[bot]',
        email: '41898282+github-actions[bot]@users.noreply.github.com',
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API responded with status ${response.status}`)
  }

  return { changed: true as const }
}

export async function TriggerWorkflow(workflowId: string, ref: string = 'main') {
  const response = await fetch(`https://api.github.com/repos/efdevcon/monorepo/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: ref,
    }),
  })

  if (!response.ok) {
    console.error('Error triggering workflow:', response.status, response.statusText)
  }

  return response.ok
}

function SessionToJson(session: any) {
  const filesystemSession = {
    ...session,
    keywords:
      session.keywords
        ?.split(',')
        .map((i: string) => i.trim())
        .filter(Boolean) || [],
    tags:
      session.tags
        ?.split(',')
        .map((i: string) => i.trim())
        .filter(Boolean) || [],
    speakers: session.speakers?.map((i: any) => i.id) || [],
    slot_start: session.slot_start ? dayjs(session.slot_start).valueOf() : null,
    slot_end: session.slot_end ? dayjs(session.slot_end).valueOf() : null,
  }

  return JSON.stringify(filesystemSession, null, 2)
}
