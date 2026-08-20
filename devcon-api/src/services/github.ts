import { SERVER_CONFIG } from '@/utils/config'
import dayjs from 'dayjs'

export async function CommitSession(session: any, commitMessage: string = '') {
  try {
    const content = Buffer.from(SessionToJson(session)).toString('base64')
    const filePath = `devcon-api/data/sessions/${session.eventId}/${session.id}.json`
    const message = commitMessage || `Update session ${session.id}`

    // Two successive writes to the same session within seconds (operator
    // fixes a typo, the smoke test's set→revert) can race the contents API:
    // the sha read below may return the pre-previous-commit value and the
    // PUT then 409s. Re-read the sha and retry once before giving up.
    for (let attempt = 0; ; attempt++) {
      const fileRes = await fetch(`https://api.github.com/repos/efdevcon/monorepo/contents/${filePath}`, {
        headers: {
          Authorization: `token ${SERVER_CONFIG.GITHUB_TOKEN}`,
          // The contents GET is cached aggressively; ask for a fresh read so
          // the sha reflects the commit we may have made moments ago.
          'Cache-Control': 'no-cache',
        },
      })

      let sha = ''
      if (fileRes.ok) {
        const fileData = await fileRes.json()
        sha = fileData.sha
      }

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

      if (response.ok) return
      // Retry transient failures: 409 = stale-sha race between two quick
      // writes to the same session; 5xx/429 = GitHub having a moment (a 503
      // during the 2026-08-17 GitHub incident lost an AV write's persistence
      // while memory updated — the worst kind of drift to have mid-event).
      const transient = response.status === 409 || response.status === 429 || response.status >= 500
      if (transient && attempt < 3) {
        console.warn(`CommitSession got ${response.status} for ${filePath} (attempt ${attempt + 1}), retrying`)
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
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

  // Log both outcomes: "Triggering X..." followed by silence used to be the
  // only success signal, which made "did the dispatch reach GitHub?" a guess
  // when reading Render logs.
  if (!response.ok) {
    console.error('Error triggering workflow:', workflowId, response.status, response.statusText)
  } else {
    console.log(`Triggered Github action ${workflowId} (${response.status})`)
  }

  return response.ok
}

/** `keywords`/`tags` come in two shapes: comma-separated strings (legacy
 *  DB-era rows, Pretalx sync intermediates) and plain arrays (the file-backed
 *  store — which is what enrichment writes pass since the DB removal; calling
 *  .split on those 500'd every PUT /sessions/sources/:id before the commit). */
function toStringList(value: any): string[] {
  if (Array.isArray(value)) return value.map((i: any) => String(i).trim()).filter(Boolean)
  if (typeof value === 'string')
    return value
      .split(',')
      .map((i: string) => i.trim())
      .filter(Boolean)
  return []
}

export function SessionToJson(session: any) {
  // Strip fields the store hydrates at load time — they must never be
  // serialized back into the data files (`slot_room` is derived from
  // `slot_roomId` + the rooms data; embedding the whole room object bloated
  // committed session files and duplicated room data per session).
  const { slot_room, ...persistable } = session
  const filesystemSession = {
    ...persistable,
    keywords: toStringList(session.keywords),
    tags: toStringList(session.tags),
    // Files store speaker IDs; the in-memory store may hold resolved speaker
    // objects. Serialize both back to IDs.
    speakers: session.speakers?.map((i: any) => (typeof i === 'string' ? i : i?.id)).filter(Boolean) || [],
    slot_start: session.slot_start ? dayjs(session.slot_start).valueOf() : null,
    slot_end: session.slot_end ? dayjs(session.slot_end).valueOf() : null,
  }

  return JSON.stringify(filesystemSession, null, 2)
}
