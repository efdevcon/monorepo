import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
require('dotenv').config()
import { loadAndFormatCMS } from './format-content'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

// const assistantInstructions = `You are 'Deva', a witty and cheerful unicorn representing Devcon. Users will ask you practical or historical questions about Devcon, and you will do your best to answer based on our website content (.txt files) and event schedule (.json files), which will be made available to you through the file_search tool. When using the file_search tool, reference the source files in the annotations. When the answer doesn't exist, it is better to say you don't know than to make up an answer. Be brief in your responses, but let your personality shine through. The current date will be appended to the user's messages, which may be useful when a user asks "when is Devcon", "what should I attend next?", "can I apply to speak", or similar temporal questions.`
const assistantInstructions = `You are 'Deva', a witty and cheerful unicorn representing Devcon. Users will ask you practical or historical questions about Devcon, and you will do your best to answer based on our website content (.txt files) and event schedule (.json files), which will be made available to you through the file_search tool. When using the file_search tool, reference the source files in the annotations. When the answer doesn't exist, it is better to say you don't know than to make up an answer. Be brief in your responses, but let your personality shine through. The current date will be appended to the user's messages, which may be useful when a user asks "when is Devcon", "what should I attend next?", "can I apply to speak", or similar temporal questions.`

export const api = (() => {
  const _interface = {
    // Load CMS data and push to open ai - this is called by a github action triggered on each commit
    prepareContent: async (assistantID: string) => {
      console.log('preparing content')

      await loadAndFormatCMS()

      // Create vector store for website content
      const vectorStore = await openai.beta.vectorStores.create({
        // name: 'Website Content: ' + new Date().toISOString(),
        name: `github_${process.env.GITHUB_SHA}`,
      })

      const contentDir = path.resolve(__dirname, 'formatted-content')

      const files = fs.readdirSync(contentDir)

      const fileStreams = files.map((file: string) => {
        const filePath = path.join(contentDir, file)
        return fs.createReadStream(filePath)
      })

      // Upload files to vector store
      await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: fileStreams })

      // Update assistant to use our new vector store
      // await openai.beta.assistants.update(assistantID, {
      //   tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      // })

      // Clean up old vector stores after creating a new one
      // await _interface.cleanStaleVectorStores()
    },
    // ASSISTANT API
    createAssistant: async () => {
      console.log('creating assistant')
      // create assistant
      const assistant = await openai.beta.assistants.create({
        name: 'DevaBot',
        instructions: assistantInstructions,
        tools: [
          { type: 'file_search' },
          // {
          //   type: 'function',
          //   function: {
          //     name: 'getCurrentDate',
          //     description:
          //       'Get the current date to give answers that make sense from a temporal perspective. E.g. "when is Devcon?" can yield a different answer if the event is in the future or in the past.',
          //   },
          // },
        ],
        // model: 'ft:gpt-3.5-turbo-0125:personal::9MaoeoMc',
        model: 'gpt-4o-mini',
      })

      api.prepareContent(assistant.id)

      // Create vector store for website content
      // const vectorStore = await openai.beta.vectorStores.create({
      //   name: 'Website Content',
      // })

      // const contentDir = path.join(__dirname, 'content')
      // const files = fs.readdirSync(contentDir)

      // const fileStreams = files.map((file: string) => {
      //   const filePath = path.join(contentDir, file)
      //   return fs.createReadStream(filePath)
      // })

      // Upload files to vector store
      // await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: fileStreams })

      // Update assistant to use our vector store
      // await openai.beta.assistants.update(assistant.id, {
      //   tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      // })

      console.log(assistant, 'CREATED ASSISTANT AND UPLOADED WEBSITE CONTENT')
    },
    cleanStaleVectorStores: async () => {
      console.log('cleaning stale vector stores')

      try {
        // List all vector stores
        const vectorStores = await openai.beta.vectorStores.list()

        // Sort vector stores by creation date, newest first
        const sortedStores = vectorStores.data.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        // Keep the 5 most recent stores
        const storesToKeep = sortedStores.slice(0, 5)
        const storesToDelete = sortedStores.slice(5)

        // Delete old stores
        for (const store of storesToDelete) {
          await openai.beta.vectorStores.del(store.id)
          console.log(`Deleted vector store: ${store.id}`)
        }

        console.log(`Cleaned up ${storesToDelete.length} old vector stores. Kept ${storesToKeep.length} most recent.`)
      } catch (error) {
        console.error('Error cleaning up vector stores:', error)
      }
    },
  }

  return _interface
})()

export default api
