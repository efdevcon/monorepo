import fs from 'fs'

parse()

async function parse() {
    const tally = JSON.parse(fs.readFileSync('outputs/dao-participants.json', 'utf-8'))

    const uniques = Array.from(new Set([...tally]))

    console.log('Tally', tally.length, 'Unique', uniques.length)
    fs.writeFileSync('outputs/dao-participants.json', JSON.stringify(uniques, null, 2), 'utf-8');
}