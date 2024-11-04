import { Account, PrismaClient } from '@/db/clients/account'
import { GenerateRandomUsername, GetEnsName } from '@/utils/account'

async function main() {
  const client = new PrismaClient()
  const accounts = await client.account.findMany({
    where: {
      OR: [
        {
          username: null,
        },
        {
          username: '',
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('Updating accounts with default usernames', accounts.length)
  for (const account of accounts.slice(0, 100)) {
    let username
    if (account.addresses.length > 0) {
      username = (await GetEnsName(account.addresses[0] as `0x${string}`)) ?? GenerateRandomUsername(account.addresses[0] as `0x${string}`)
    }
    if (!username) {
      username = GenerateRandomUsername(account.email ?? account.id)
    }

    console.log(account.id, 'SET username', username, 'SEED', account.addresses[0] ?? account.email ?? account.id)

    await client.account.update({
      where: { id: account.id },
      data: { username },
    })
  }
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
