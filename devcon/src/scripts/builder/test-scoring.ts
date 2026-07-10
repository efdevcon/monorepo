import { scoreBuilder } from '../../services/builder/scoring'
import { assertEqual } from './_assert'

async function main() {
  // Stub fetchers so the test is offline & deterministic.
  // verifyContribution: confirm every claimed repo EXCEPT the 'unverified-claim' one.
  // ghStars: famous-claim has 9999 stars, zerostar-claim has 0, others unknown.
  const deps = {
    ghStars: async (_o: string, r: string) =>
      r === 'famous-claim' ? 9999 : r === 'zerostar-claim' ? 0 : r === 'arctic-repo' ? 8000 : null,
    verifyContribution: async (_u: string, _o: string, r: string) => r !== 'unverified-claim',
  }

  const result = await scoreBuilder(
    {
      githubUsername: 'didierkrux', // present in contributor set
      contributedRepos: new Set(['facebook/react', 'some/private-repo']),
      claimedRepos: ['base/node', 'someorg/famous-claim', 'someorg/zerostar-claim', 'someorg/unverified-claim'],
      // Owned (with stars) + Arctic (stars null -> fetched) candidates.
      notableRepos: [
        { repo: 'bigorg/bigrepo', stars: 5000 }, // owned, high stars -> notable
        { repo: 'tinyorg/tiny', stars: 5 }, // owned, below threshold -> dropped
        { repo: 'arcticorg/arctic-repo', stars: null }, // arctic, stars fetched (8000) -> notable
      ],
    },
    deps
  )

  const byRepo = Object.fromEntries(result.matchedRepos.map(m => [m.repo, m]))
  // Verified, listed
  assertEqual(byRepo['facebook/react'].source, 'list', 'react via list (pulled)')
  assertEqual(byRepo['base/node'].source, 'list', 'base/node via list (verified claim)')
  assertEqual(byRepo['base/node'].list, 'web3', 'base/node list web3')
  // Verified, not listed, stars > 0 -> notable (github)
  assertEqual(byRepo['someorg/famous-claim'].source, 'github', 'famous-claim via github fallback (verified)')
  assertEqual(byRepo['someorg/famous-claim'].stars, 9999, 'famous-claim stars')
  // Verified, not listed, 0 stars -> NOT notable, dropped from matches entirely
  assertEqual('someorg/zerostar-claim' in byRepo, false, '0-star verified claim is not listed as notable')
  // Could NOT verify contribution -> flagged, not counted
  assertEqual(byRepo['someorg/unverified-claim'].source, 'unverified', 'unverifiable claim flagged unverified')

  // Notable candidates (owned + arctic) above the star threshold -> notable
  assertEqual(byRepo['bigorg/bigrepo'].source, 'github', 'owned high-star repo is notable')
  assertEqual(byRepo['bigorg/bigrepo'].stars, 5000, 'owned notable stars (provided)')
  assertEqual(byRepo['arcticorg/arctic-repo'].source, 'github', 'arctic repo notable (stars fetched)')
  assertEqual(byRepo['arcticorg/arctic-repo'].stars, 8000, 'arctic notable stars (fetched)')
  assertEqual('tinyorg/tiny' in byRepo, false, 'below-threshold notable candidate dropped')

  // matchedCount = verified list hits only (react + base/node)
  assertEqual(result.matchedCount, 2, 'matchedCount counts verified list hits')
  assertEqual(result.matchSource.includes('web3'), true, 'summary breaks down by list (web3)')
  assertEqual(result.matchSource.includes('1 unverified'), true, 'summary mentions unverified count')

  // Without a connected GitHub identity, claims cannot be verified.
  const noGh = await scoreBuilder(
    { githubUsername: null, contributedRepos: new Set<string>(), claimedRepos: ['base/node'] },
    deps
  )
  assertEqual(noGh.matchedCount, 0, 'no github -> no verified list hits')
  assertEqual(noGh.matchedRepos.find(m => m.repo === 'base/node')?.source, 'unverified', 'no github -> claim unverified')

  console.log('ALL PASS')
}
main().catch(e => {
  console.error(e)
  process.exit(1)
})
