import api from './open-ai'
// import { seedPretalx } from '@/db/pretalx'
import { devconWebsiteAssistant, devconnectWebsiteAssistant, devconAppAssistant } from './assistant-versions'

async function main() {
  //   await seedPretalx()
  await api.recommendations.syncScheduleContent()

  await api.attachVectorStoresToAssistant(devconnectWebsiteAssistant.assistant_id, devconnectWebsiteAssistant.vector_store_prefix)
  await api.attachVectorStoresToAssistant(devconWebsiteAssistant.assistant_id, devconWebsiteAssistant.vector_store_prefix)
  await api.attachVectorStoresToAssistant(devconAppAssistant.assistant_id, devconAppAssistant.vector_store_prefix)
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
  })

// api.recommendations.syncScheduleAssistant(process.env.OPEN_AI_ASSISTANT_ID as string, 'devcon-7')
