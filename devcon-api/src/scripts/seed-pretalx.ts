import { seedPretalx } from '@/db/pretalx'

async function main() {
  await seedPretalx()
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
