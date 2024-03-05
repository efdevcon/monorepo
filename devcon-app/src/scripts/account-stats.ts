import dbConnect from "../utils/dbConnect"
import { UserAccountRepository } from "server/repositories/UserAccountRepository"
// import sessionData from 'content/session-data.json'
// import speakerData from 'content/speakers-data.json'

// Run()

// const defaultCount = 25

// async function Run() {
//     console.log('Get account stats..')
//     await dbConnect()
//     const repo = new UserAccountRepository()
//     const all = await repo.findAll()

//     const withEmail = all.filter(i => !!i.email)
//     const withAddress = all.filter(i => i.addresses.length > 0)
//     const withAddresses = all.filter(i => i.addresses.length > 1)

//     console.log('Accounts', all.length)
//     console.log('Logins with Email', withEmail.length)
//     console.log('Logins with Web3', withAddress.length)
//     console.log('Multiple Web3 addresses', withAddresses.length)

//     const hasPublicSchedule = all.filter(i => !!i.appState.publicSchedule)
//     console.log('Public schedules', hasPublicSchedule.length)
//     console.log()

//     const favoritedSpeakers = all.map(i => i.appState.speakers).flat().reduce((accumulator: any, current: string) => {
//         if (accumulator[current]) {
//             accumulator[current].count += 1
//         } else {
//             const speaker = speakerData.find(i => i.id === current)
//             accumulator[current] = {
//                 speaker: speaker?.name || current,
//                 count: 1
//             }
//         }
//         return accumulator
//     }, {})

//     const sorted = Object.keys(favoritedSpeakers).map(i => favoritedSpeakers[i]).sort((a: any, b: any) => {
//         return b.count - a.count
//     }).slice(0, defaultCount)
//     console.log('Popular Speakers')
//     sorted.forEach(i => console.log(`- ${i.speaker} (count: ${i.count})`))
//     console.log()

//     sessionInfo('attending', all.map(i => i.appState.sessions.filter(x => x.level === 'attending').map(x => x.id)).flat())
//     // sessionInfo('interested', all.map(i => i.appState.sessions.filter(x => x.level === 'interested').map(x => x.id)).flat())

//     console.log()

//     const tracks = all.map(i => i.appState.sessions.map(x => x.id)).flat().reduce((accumulator: any, current: string) => {
//         const session = sessionData.find(i => i.id === current)
//         if (!session) return accumulator
//         const track = session.track

//         if (accumulator[track]) {
//             accumulator[track].count += 1
//         } else {
//             accumulator[track] = {
//                 track,
//                 count: 1
//             }
//         }
//         return accumulator
//     }, {})
//     const sortTracks = Object.keys(tracks).map(i => tracks[i]).sort((a: any, b: any) => {
//         return b.count - a.count
//     }).slice(0, defaultCount)

//     console.log('Most popular tracks')
//     sortTracks.forEach(i => console.log(`- ${i.track} (count: ${i.count})`))
//     console.log()
// }

// function sessionInfo(type: string, sessions: string[]) {
//     const grouped = sessions.reduce((accumulator: any, current: string) => {
//         if (accumulator[current]) {
//             accumulator[current].count += 1
//         } else {
//             const session = sessionData.find(i => i.id === current)
//             accumulator[current] = {
//                 session: session?.title || current,
//                 count: 1
//             }
//         }
//         return accumulator
//     }, {})

//     const sorted = Object.keys(grouped).map(i => grouped[i]).sort((a: any, b: any) => {
//         return b.count - a.count
//     }).slice(0, defaultCount)

//     console.log('Popular sessions', type, Object.keys(grouped).length)
//     console.log('Total # sessions', type, sessions.length)
//     sorted.forEach(i => console.log(`- ${i.session} (count: ${i.count})`))
//     console.log()

//     // const desc = Object.keys(grouped).map(i => grouped[i]).sort((a: any, b: any) => {
//     //     return a.count - b.count
//     // }).slice(0, defaultCount)
//     // desc.forEach(i => console.log(`- ${i.session} (count: ${i.count})`))
// }