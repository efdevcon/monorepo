import fs from 'fs'

parse()

async function parse() {
    console.log('Parse Gitcoin GG20 results')
    const gg20 = JSON.parse(fs.readFileSync('inputs/gg20_projects.json', 'utf-8'))
    const filtered = gg20.filter(i => i.round_id === '25' || i.round_id === '26' || i.round_id === '27')
    const unique = Array.from(new Set(filtered.map(i => i.payout_address)))

    console.log('GG20', gg20.length, 'Filtered', filtered.length, 'Unique', unique.length)
    fs.writeFileSync('outputs/pg-project-gitcoin.json', JSON.stringify(unique, null, 2))
}
