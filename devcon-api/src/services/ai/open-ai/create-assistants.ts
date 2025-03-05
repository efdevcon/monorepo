import api from './open-ai'

async function main() {
  await api.createAssistant('devconnect-website')
  await api.createAssistant('devcon-website')
  await api.createAssistant('devcon-app')
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
  })

// api.recommendations.syncScheduleAssistant(process.env.OPEN_AI_ASSISTANT_ID as string, 'devcon-7')
