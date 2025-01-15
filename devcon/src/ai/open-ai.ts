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
    prepareContent: async (assistantID: string) => {
      console.log('preparing content')

      await loadAndFormatCMS()

      // Create vector store for website content
      const vectorStore = await openai.beta.vectorStores.create({
        // name: 'Website Content: ' + new Date().toISOString(),
        name: `devcon_${process.env.GITHUB_SHA}`,
      })

      const contentDir = path.resolve(__dirname, 'formatted-content')

      const files = fs.readdirSync(contentDir)

      const fileStreams = files.map((file: string) => {
        const filePath = path.join(contentDir, file)
        return fs.createReadStream(filePath)
      })

      // Upload files to vector store
      await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: fileStreams })
    },
  }

  return _interface
})()

export default api
