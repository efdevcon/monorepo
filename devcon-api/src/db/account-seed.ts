import { PrismaClient } from './clients/account'
import { FileHandle, open } from 'node:fs/promises'
import path from 'path'

const client = new PrismaClient()
const testLimit = 0

async function main() {
  let file: FileHandle | undefined
  try {
    console.log('Trying to import db.json (MongoDb export)..')
    file = await open(path.join(__dirname, '../../', 'db.json'))
  } catch (e) {
    console.log('Error opening file')
    console.error(e)
  }
  if (!file) return

  let connected = false
  while (!connected) {
    console.log('Connecting to db..')
    try {
      await client.$connect()
      connected = true
    } catch (e) {
      console.log('Error connecting to db. Retrying in 5 secs..')
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  let i = 0
  let accounts = []
  console.log('Importing accounts from db.json file..')
  for await (const line of file.readLines()) {
    i++
    const accountImport = JSON.parse(line)
    const interested = accountImport.appState.sessions.filter((s: any) => s.level === 'interested').map((i: any) => i.id)
    const attending = accountImport.appState.sessions.filter((s: any) => s.level === 'attending').map((i: any) => i.id)

    accounts.push({
      username: accountImport.username,
      email: accountImport.email,
      addresses: accountImport.addresses ?? [],
      disabled: accountImport.disabled ?? false,

      favorite_speakers: accountImport.appState.speakers,
      interested_sessions: [],
      attending_sessions: [],
      publicSchedule: accountImport.appState.publicSchedule,
      notifications: false,
      appState_bogota: JSON.stringify({ interested, attending }),

      createdAt: new Date(accountImport.createdAt['$date']),
      updatedAt: accountImport.updatedAt ? new Date(accountImport.updatedAt['$date']) : new Date(),
    })

    if (testLimit > 0 && i >= testLimit) break
  }

  console.log(`Importing ${i} accounts..`)
  const result = await client.account.createMany({
    data: accounts,
  })
  console.log(`Imported ${result.count} accounts.`)
  console.log('Done!')
}

main()
  .then(async () => {
    await client.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await client.$disconnect()
    process.exit(1)
  })
