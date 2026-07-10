import 'dotenv/config'
import { getContributedRepos, getRepoStarsFromGitHub } from '../../services/builder/github-contributions'
import { assertEqual } from './_assert'

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    console.log('SKIP: no GITHUB_TOKEN in env')
    return
  }
  const repos = await getContributedRepos('torvalds')
  console.log('torvalds contributed-repo count =', repos.size)
  assertEqual(repos.has('torvalds/linux'), true, 'torvalds owns torvalds/linux')

  const stars = await getRepoStarsFromGitHub('facebook', 'react')
  console.log('facebook/react stars =', stars)
  assertEqual(typeof stars === 'number' && stars > 1000, true, 'react has stars')

  console.log('ALL PASS')
}
main().catch(e => { console.error(e); process.exit(1) })
