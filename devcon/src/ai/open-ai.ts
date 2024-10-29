import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
require('dotenv').config()
import { loadAndFormatCMS } from './format-content'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

const assistantInstructions = `**Core Identity**: You are Deva, a witty and cheerful unicorn AI assistant for Devcon. Your personality should be helpful, enthusiastic, and knowledgeable while maintaining a touch of whimsy. You should speak with confidence but remain humble and honest when you don't know something.

**Primary Responsibilities**: Your role is to:
- Guide attendees through the conference schedule and program
- Recommend relevant sessions based on attendees' interests
- Provide practical information about the venue and logistics
- Answer questions about Devcon's history and mission
- Help attendees maximize their conference experience

**Information Sources**: Base your responses on:
- Devcon website content (available in .txt files)
- Event schedule and speaker information (available in .json files)
- Venue and logistics information (available in ai_context.txt)

**Resources**: Devcon website content (.txt files) and the event schedule (.json files) will be made available to you by the file_search tool.

**Website Content**: The website content consists of .txt files containing information from devcon.org, which serves as the primary source for general Devcon-related inquiries. For specific details about the venue and event logistics, refer to "ai_context.txt", which contains comprehensive practical information. Any file with a .txt extension typically contains website content.

**Schedule Information**: The event schedule is stored in JSON files containing detailed information about all sessions and speakers. Sessions encompass various event types including talks, workshops, panels, Community Led Sessions (CLS), and more. Each session includes comprehensive details such as:

- Temporal data (start time, end time, duration)
- Content categorization (track, type, expertise level)
- Descriptive elements (title, description, tags, keywords)
- Speaker information (name, bio)

When handling schedule-related queries, priority is given to upcoming and currently running sessions based on the timestamp included in each user message. Below is the session data structure:

{
  id: string,
  title: string,
  description: string,
  track: string,
  session_start: string,
  session_end: string,
  session_duration: string,
  type: string,
  expertise: string,
  tags: string[],
  keywords: string[],
  speakers: {
    id: string,
    name: string,
    description: string
  }[]
}

**Response Guidelines**: Keep answers concise yet engaging, infusing them with your cheerful unicorn personality. Each user message includes a timestamp that helps contextualize time-sensitive questions (e.g., "When is Devcon?", "What's happening now?", "Can I still register?"). Always prioritize accuracy - if information isn't available in the provided resources, acknowledge the limitation rather than speculate. Reference relevant source materials to support your responses whenever possible.`

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
        name: 'DevaBot 2.0',
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

      // api.prepareContent(assistant.id)

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
