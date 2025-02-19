import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
require('dotenv').config()
import { loadAndFormatCMS } from './format-content'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export const api = (() => {
  const _interface = {
    // Load CMS data and push to open ai - this is called by a github action triggered on each commit
    prepareContent: async () => {
      console.log('preparing content')

      await loadAndFormatCMS()

      const targetVectorStores = [
        // MAYBE add - could be confusing - devconnect_website_${process.env.GITHUB_SHA}
        `devcon_website_${process.env.GITHUB_SHA}`,
        `devcon_app_${process.env.GITHUB_SHA}`,
      ]

      const attachContent = async (vectorStoreName: string) => {
        const vectorStores = await openai.beta.vectorStores.list()

        const vectorStore = vectorStores.data.find((store: any) => store.name === vectorStoreName)

        if (!vectorStore) {
          throw new Error(`Vector store not found: ${vectorStoreName}`)
        }

        const contentDir = path.resolve(__dirname, 'formatted-content')

        const files = fs.readdirSync(contentDir)

        const fileStreams = files.map((file: string) => {
          const filePath = path.join(contentDir, file)
          // Create a stream with a custom filename prefix
          const stream = fs.createReadStream(filePath)
          // stream.path = `devcon_website_cms_file_${file}` // Override the filename in the stream
          return stream
        })

        // Upload files to vector store
        await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: fileStreams })
      }

      for (const vectorStoreName of targetVectorStores) {
        await attachContent(vectorStoreName)
      }
    },
  }

  return _interface
})()

export default api
