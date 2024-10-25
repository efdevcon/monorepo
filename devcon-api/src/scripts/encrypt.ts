import { decryptFile, encryptFile } from '@/utils/encrypt'

async function main() {
  const filepath = 'data/accounts/pretix.csv'
  await encryptFile(filepath)

  const data = await decryptFile('data/accounts/pretix.csv.encrypted')
  console.log(data)
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
