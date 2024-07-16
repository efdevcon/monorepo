import fs from 'fs'

const organizations = ['efdevcon', 'ethereum']
const executionClients = [
    'NethermindEth/nethermind',
    'paradigmxyz/reth',
    'hyperledger/besu',
    'ledgerwatch/erigon'
]
const consensusClients = [
    'sigp/lighthouse',
    'ChainSafe/lodestar',
    'prysmaticlabs/prysm',
    'Consensys/teku',
    'status-im/nimbus-eth2',
    'grandinetech/grandine'
]

const sinceDate = '2022-10-11T00:00:00Z'
const excludedBots = ['dependabot[bot]', 'github-actions[bot]', 'tina-cloud-app[bot]', 'allcontributors[bot]', 'actions-user', 'core-repository-dispatch-app[bot]']
const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` }

fetchContributors().then(contributors => {
    console.log('Total OSS Contributors:', contributors.length)

    fs.writeFileSync('outputs/oss-contributors.json', JSON.stringify(contributors, null, 2))
})

async function fetchContributors() {
    console.log('Fetch OSS Contributors')
    let contributorCommits = new Map()

    // Fetch and count commits for organization repositories
    for (const organization of organizations) {
        let repos = await fetchOrganizationRepos(organization)
        console.log('Fetch contributors for', organization, repos.length, 'repos')
        await countCommitsForRepos(repos, contributorCommits)
    }

    // Fetch and count commits for client repositories
    await countCommitsForRepos(executionClients, contributorCommits)
    await countCommitsForRepos(consensusClients, contributorCommits)

    // Filter contributors with more than 2 commits
    let filteredContributors = Array.from(contributorCommits.entries())
        .filter(([_, count]) => count >= 2)
        .map(([login, _]) => login)

    return Array.from(new Set(filteredContributors))
}

async function fetchOrganizationRepos(org: string) {
    let repos = []
    let page = 1

    while (true) {
        await new Promise((r) => setTimeout(r, 250))
        const response = await fetch(`https://api.github.com/orgs/${org}/repos?page=${page}&type=public&per_page=100`, { headers })
        const data = await response.json()
        if (data.length === 0) break

        repos = repos.concat(data.map(repo => `${org}/${repo.name}`))
        page++
    }

    return repos
}

async function countCommitsForRepos(repos, contributorCommits) {
    for (const repo of repos) {
        console.log('Get commits for', repo)
        let page = 1

        while (true) {
            await new Promise((r) => setTimeout(r, 250))
            const response = await fetch(`https://api.github.com/repos/${repo}/commits?since=${sinceDate}&page=${page}&per_page=100`, { headers })
            if (response.status !== 200) {
                console.log('Unable to fetch commits for', repo, response.status, response.statusText)
                break
            }

            const commits = await response.json()
            if (commits.length === 0) break

            commits.forEach(c => {
                if (c.author && !excludedBots.includes(c.author.login)) {
                    const login = c.author.login
                    const currentCount = contributorCommits.get(login) || 0
                    contributorCommits.set(login, currentCount + 1)
                }
            })

            page++
        }
    }
}