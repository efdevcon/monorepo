import fs from 'fs'

parse()

async function parse() {
    const clr = JSON.parse(fs.readFileSync('outputs/pg-projects-clrfund.json', 'utf-8'))
    const gitcoin = JSON.parse(fs.readFileSync('outputs/pg-projects-gitcoin.json', 'utf-8'))
    const giveth = JSON.parse(fs.readFileSync('outputs/pg-projects-giveth.json', 'utf-8'))
    const octant = JSON.parse(fs.readFileSync('outputs/pg-projects-octant.json', 'utf-8'))

    const uniques = Array.from(new Set([...clr, ...gitcoin, ...giveth, ...octant]))

    console.log('Clr.fund', clr.length, 'Gitcoin', gitcoin.length, 'Giveth', giveth.length, 'Octant', octant.length, 'Unique', uniques.length)
    fs.writeFileSync('outputs/pg-projects.json', JSON.stringify(uniques, null, 2), 'utf-8');
}