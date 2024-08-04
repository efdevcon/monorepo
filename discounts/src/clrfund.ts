import fs from 'fs'

parse()

async function parse() {
    console.log('Parse Clr.fund results')
    const clrfundRound = fs.readFileSync('inputs/clr-fund-round.json', 'utf-8');
    const devconRound = fs.readFileSync('inputs/clr-fund-devcon.json', 'utf-8');

    const clrfund = JSON.parse(clrfundRound).projects.filter(i => Number(i.allocatedAmount) > 0).map(i => i.recipientAddress)
    const devcon = JSON.parse(devconRound).projects.filter(i => Number(i.allocatedAmount) > 0).map(i => i.recipientAddress)
    const unique = Array.from(new Set([...clrfund, ...devcon]))

    console.log('Clr.fund', clrfund.length, 'Devcon round', devcon.length, 'Unique', unique.length)
    fs.writeFileSync('outputs/pg-project-clrfund.json', JSON.stringify(unique, null, 2), 'utf-8');
}