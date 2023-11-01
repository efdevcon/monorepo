import { Octokit } from '@octokit/rest'
import { OctokitResponse } from '@octokit/types'
import matter from 'gray-matter'
import { Contributor, DIP } from 'types/DIP'
import markdownUtils from 'utils/markdown'

const cache = new Map()
const owner = 'efdevcon'
const repo = 'DIPs'
const path = 'DIPs'

export async function GetContributors(): Promise<Array<Contributor>> {
  const cacheKey = `dips.GetContributors`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })
  try {
    const files = await getGithubFile(owner, repo, path)
    if (!Array.isArray(files.data)) return []

    const allContributors = Array.from(files.data)
      .map(async i => {
        const commits = await octokit.repos.listCommits({ owner, repo, path: i.path })

        if (Array.isArray(commits.data)) {
          const arr = Array.from(commits.data)
          return arr.map(c => {
            return {
              name: c.author ? c.author.login : c.commit.author?.name,
              url: c.author && c.author.url,
              avatarUrl: c.author
                ? c.author.avatar_url
                : 'https://camo.githubusercontent.com/6e2f6de0032f63dd90d46812bcc47c1519ee78c4e095733ec35a964901b1274d/68747470733a2f2f302e67726176617461722e636f6d2f6176617461722f35316334663761346261326430393962326261396630343830333264643734613f643d68747470732533412532462532466769746875622e6769746875626173736574732e636f6d253246696d6167657325324667726176617461727325324667726176617461722d757365722d3432302e706e6726723d6726733d3634',
            } as Contributor
          })
        }

        return []
      })
      .filter(i => !!i)

    const result = (await Promise.all(allContributors)).flat()
    const dips = [...new Set(result.map(i => i.name))]
      .map(i => {
        return result.find(x => x.name === i)
      })
      .filter(i => i !== undefined) as Array<Contributor>

    cache.set(cacheKey, dips)
    return dips
  } catch (e) {
    console.log('Error during contributor fetch')

    return []
  }
}

export async function GetDIPs(): Promise<Array<DIP>> {
  const cacheKey = `dips.GetDIPs`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  try {
    const files = await getGithubFile(owner, repo, path)
    if (!Array.isArray(files.data)) return []

    const dipNumbers = Array.from(files.data)
      .filter(i => i.name.endsWith('.md'))
      .map(i => Number(i.name.replace('.md', '').replace('DIP-', '')))
      .sort((a, b) => a - b)

    const dips = Array.from(files.data).map(async i => {
        const file: any = await getGithubFile(owner, repo, i.path)
        if (file.data.type !== 'file') return

        const buffer = Buffer.from(file.data.content, 'base64')
        let formattedMarkdown = buffer.toString('utf-8')
        formattedMarkdown = formattedMarkdown.replace('---', `---\nGithub URL: ${file.data._links.html}`);

        // Finds the first section of the markdown body and extracts the text from it
        // Look for first occurence of ## (markdown header), keep going until a newline is found, collect all text until the next header, then sanitize and trim
        const matchSummary = formattedMarkdown.match(/##[^\n]*([^##]*)/);
        if (matchSummary && matchSummary[1]) formattedMarkdown = formattedMarkdown.replace('---', `---\nSummary: '${matchSummary[1].replace(/'/g, '"').trim()}'`)

        const currentIndex = dipNumbers.indexOf(Number(i.name.replace('.md', '').replace('DIP-', '')))
        const prevDip = currentIndex > 0 ? `/dips/dip-${dipNumbers[currentIndex - 1]}` : `/dips/`
        const nextDip = currentIndex < dipNumbers.length ? `/dips/dip-${dipNumbers[currentIndex + 1]}` : `/dips/`

        const doc = matter(formattedMarkdown)
        return {
            number: doc.data.DIP,
            title: doc.data.Title,
            summary: doc.data.Summary ? await markdownUtils.toHtml(doc.data.Summary) : '',
            status: doc.data.Status,
            github: doc.data['Github URL'],
            themes: doc.data.Themes ? doc.data.Themes.split(',') : [],
            tags: doc.data.Tags ? doc.data.Tags.split(',') : [],
            authors: doc.data.Authors ? doc.data.Authors.split(',') : [],
            resources: doc.data['Resources Required'] ?? '',
            discussion: doc.data.Discussion,
            created: doc.data.Created ? new Date(doc.data.Created).getTime() : 0,
            body: await markdownUtils.toHtml(doc.content),
            slug: i.name.replace('.md', '').toLowerCase(),
            next_dip: nextDip,
            prev_dip: prevDip
        } as DIP
    })

    const all = await Promise.all(dips)
    const result = all.filter(i => i !== undefined) as Array<DIP>

    cache.set(cacheKey, result)
    return result
  } catch (e) {
    console.log('Error during dip fetch')

    return []
  }
}

async function getGithubFile(owner: string, repo: string, path: string): Promise<OctokitResponse<any>> {
  const cacheKey = `dips.getGithubFile.${owner}.${repo}.${path}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const result: any = await octokit.repos.getContent({ owner, repo, path })
  if (result) {
    cache.set(cacheKey, result)
  }

  return result
}
