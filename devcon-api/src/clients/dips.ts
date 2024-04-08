import { Octokit } from '@octokit/rest'
import { OctokitResponse } from '@octokit/types'
import matter from 'gray-matter'
import { Contributor, DIP } from 'types/dips'
import { CreateBlockie } from 'utils/account'
import { SERVER_CONFIG } from 'utils/config'
import { toHtml } from 'utils/content'

const owner = 'efdevcon'
const repo = 'DIPs'
const path = 'DIPs'

export async function GetContributors(): Promise<Array<Contributor>> {
  const client = initClient()

  try {
    const files = await getGithubFile(owner, repo, path)
    if (!Array.isArray(files.data)) return []

    const allContributors = Array.from(files.data)
      .map(async (i: any) => {
        const commits = await client.repos.listCommits({ owner, repo, path: i.path })

        if (Array.isArray(commits.data)) {
          const arr = Array.from(commits.data)
          return arr.map((c: any) => {
            const username = c.author ? c.author.login : c.commit.author?.name
            const avatar = c.author?.avatar_url ?? CreateBlockie(username)

            return {
              name: username,
              url: c.author && c.author.url,
              avatarUrl: avatar,
            } as Contributor
          })
        }

        return []
      })
      .filter((i) => !!i)

    const result = (await Promise.all(allContributors)).flat()
    return [...new Set(result.map((i) => i.name))]
      .map((i) => {
        return result.find((x) => x.name === i)
      })
      .filter((i) => i !== undefined) as Array<Contributor>
  } catch (e) {
    console.log('Unable to fetch contributors from Github')
    console.error(e)

    return []
  }
}

export async function GetDIPs(): Promise<Array<DIP>> {
  try {
    const files = await getGithubFile(owner, repo, path)
    if (!Array.isArray(files.data)) return []

    const dipNumbers = Array.from(files.data)
      .filter((i: any) => i.name.endsWith('.md'))
      .map((i: any) => Number(i.name.replace('.md', '').replace('DIP-', '')))
      .sort((a, b) => a - b)

    const dips = Array.from(files.data).map(async (i: any) => {
      const file: any = await getGithubFile(owner, repo, i.path)
      if (file.data.type !== 'file') return

      const buffer = Buffer.from(file.data.content, 'base64')
      let formattedMarkdown = buffer.toString('utf-8')
      formattedMarkdown = formattedMarkdown.replace('---', `---\nGithub URL: ${file.data._links.html}`)

      // Finds the first section of the markdown body and extracts the text from it
      // Look for first occurence of ## (markdown header), keep going until a newline is found, collect all text until the next header, then sanitize and trim
      const matchSummary = formattedMarkdown.match(/##[^\n]*([^##]*)/)
      if (matchSummary && matchSummary[1])
        formattedMarkdown = formattedMarkdown.replace('---', `---\nSummary: '${matchSummary[1].replace(/'/g, '"').trim()}'`)

      const currentIndex = dipNumbers.indexOf(Number(i.name.replace('.md', '').replace('DIP-', '')))
      const prevDip = currentIndex > 0 ? `/dips/dip-${dipNumbers[currentIndex - 1]}` : `/dips/`
      const nextDip = currentIndex < dipNumbers.length ? `/dips/dip-${dipNumbers[currentIndex + 1]}` : `/dips/`

      const doc = matter(formattedMarkdown)
      return {
        number: doc.data.DIP,
        title: doc.data.Title,
        summary: doc.data.Summary ? toHtml(doc.data.Summary) : '',
        status: doc.data.Status,
        github: doc.data['Github URL'],
        themes: doc.data.Themes ? doc.data.Themes.split(',') : [],
        tags: doc.data.Tags ? doc.data.Tags.split(',') : [],
        authors: doc.data.Authors ? doc.data.Authors.split(',') : [],
        resources: doc.data['Resources Required'] ?? '',
        discussion: doc.data.Discussion,
        created: doc.data.Created ? new Date(doc.data.Created).getTime() : 0,
        body: toHtml(doc.content),
        slug: i.name.replace('.md', '').toLowerCase(),
        next_dip: nextDip,
        prev_dip: prevDip,
      } as DIP
    })

    const all = await Promise.all(dips)
    return all.filter((i) => i !== undefined) as Array<DIP>
  } catch (e) {
    console.log('Unable to fetch DIPs from Github')
    console.error(e)

    return []
  }
}

function initClient() {
  if (!SERVER_CONFIG.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not defined')
  }

  return new Octokit({
    auth: SERVER_CONFIG.GITHUB_TOKEN,
  })
}

async function getGithubFile(owner: string, repo: string, path: string): Promise<OctokitResponse<any>> {
  const client = initClient()

  return await client.repos.getContent({ owner, repo, path })
}
