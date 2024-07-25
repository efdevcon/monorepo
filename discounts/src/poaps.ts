import fs from 'fs'

parse()

async function parse() {
    const ams = JSON.parse(fs.readFileSync('outputs/poap-devconnect-ams.json', 'utf-8'))
    const bogota = JSON.parse(fs.readFileSync('outputs/poap-devcon-bogota.json', 'utf-8'))
    const ist = JSON.parse(fs.readFileSync('outputs/poap-devconnect-ist.json', 'utf-8'))

    const uniques = Array.from(new Set([...ams, ...bogota, ...ist]))

    console.log('AMS', ams.length, 'Bogota', bogota.length, 'IST', ist.length, 'Unique', uniques.length)
    fs.writeFileSync('outputs/poap-past-attendees.json', JSON.stringify(uniques, null, 2), 'utf-8');
}