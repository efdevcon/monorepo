import fs from 'fs'

parse()

async function parse() {
    const merge = JSON.parse(fs.readFileSync('inputs/the-merge-contributors.json', 'utf-8'))
    const pg = JSON.parse(fs.readFileSync('inputs/protocol-guild.json', 'utf-8'))
    const pg2 = JSON.parse(fs.readFileSync('inputs/pg2.json', 'utf-8'))
    
    const uniques = Array.from(new Set([...merge, ...pg, ...pg2]))

    console.log('Merge Pass', merge.length, 'Protocol Guild', pg.length, 'Protocol Guild #2', pg2.length, 'Unique', uniques.length)
    fs.writeFileSync('outputs/core-devs.json', JSON.stringify(uniques, null, 2), 'utf-8');
}