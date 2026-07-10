import fs from 'fs'

const SOURCES = {
    Gitcoin: 'outputs/pg-projects-gitcoin.json',
    Giveth: 'outputs/pg-projects-giveth.json',
    Octant: 'outputs/pg-projects-octant.json',
    Optimism: 'outputs/pg-projects-optimism.json',
}

parse()

// Merge the public-goods project sources into a single de-duplicated address list.
async function parse() {
    const lists: Record<string, string[]> = {}
    for (const [name, file] of Object.entries(SOURCES)) {
        lists[name] = (JSON.parse(fs.readFileSync(file, 'utf-8')) as string[]).map(a => a.toLowerCase())
    }

    const uniques = Array.from(new Set(Object.values(lists).flat()))

    const counts = Object.entries(lists).map(([name, list]) => `${name} ${list.length}`).join(', ')
    console.log(`${counts}, Unique ${uniques.length}`)

    fs.writeFileSync('outputs/pg-projects.json', JSON.stringify(uniques, null, 2), 'utf-8')
}
