import api from './open-ai'
// import { seedPretalx } from '@/db/pretalx'

async function main() {
  //   await seedPretalx()
  // await api.recommendations.syncScheduleAssistant(process.env.OPEN_AI_ASSISTANT_ID as string, 'devcon-7')
  await api.attachVectorStoresToAssistant('devconnect')
  await api.attachVectorStoresToAssistant('devcon')
  await api.attachVectorStoresToAssistant('devcon-app')
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
  })

// api.recommendations.syncScheduleAssistant(process.env.OPEN_AI_ASSISTANT_ID as string, 'devcon-7')
