import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
// import LoadContent from './load-content';
require('dotenv').config()
import { prompts, assistantInstructions } from './fine-tune'

// LoadContent();

// import sections from './sections.json';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

// Function to load embeddings from file
function loadEmbeddings() {
  const filePath = path.resolve(__dirname, 'openai_embeddings.json')
  const data = fs.readFileSync(filePath, 'utf8')
  const parsedData = JSON.parse(data)
  return parsedData
}

/**
 * Calculate the cosine similarity between two vectors.
 *
 * @param vecA The first vector of type number[].
 * @param vecB The second vector of type number[].
 * @returns The cosine similarity as a number between 0 and 1.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc: number, curr: number, idx: number) => acc + curr * vecB[idx], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((acc: number, val: number) => acc + val * val, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((acc: number, val: number) => acc + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// Function to create a single OpenAI embedding
async function createOpenAIEmbedding(text: any) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

export const api = (() => {
  const _interface = {
    createEmbeddingsFromContent: async () => {
      const contentDir = path.resolve(__dirname, 'content')
      const files = fs.readdirSync(contentDir)

      // Filter only .txt files
      const txtFiles = files.filter(file => file.endsWith('.txt'))

      // Read content of each .txt file and prepare sections array
      const sections = txtFiles.map(file => {
        const content = fs.readFileSync(path.join(contentDir, file), 'utf8')

        return content
        // return `Page ${file.replace('.txt', '')}: ${content}`;
      })

      try {
        const allPromises = sections.map(async section => {
          const embedding = await createOpenAIEmbedding(section)

          return {
            embedding: embedding,
            text: section,
          }
        })

        await Promise.allSettled(allPromises).then(results => {
          //@ts-ignore
          fs.writeFileSync(
            path.resolve(__dirname, 'openai_embeddings.json'),
            JSON.stringify(results.map(({ value }: any) => value))
          )
        })
      } catch (error) {
        console.error('Error creating OpenAI embeddings:', error)
      }
    },
    getRelevantTextByQuery: async (query: string, maxTokens: number = 10000, minSimilarity: number = 0.3) => {
      const embeddings = loadEmbeddings()
      const queryEmbedding = await createOpenAIEmbedding(query)

      let sectionsWithSimilarity = [] as any

      // Calculate similarity for each section
      embeddings.forEach((section: any) => {
        const similarity = cosineSimilarity(queryEmbedding, section.embedding)
        if (similarity > minSimilarity) {
          // Only include sections above the similarity threshold
          sectionsWithSimilarity.push({
            text: section.text,
            similarity: similarity,
          })
        }
      })

      // Sort sections by similarity in descending order
      sectionsWithSimilarity.sort((a: any, b: any) => b.similarity - a.similarity)

      // Select top sections within the token limit
      let tokenCount = 0
      let selectedText = ''
      for (let section of sectionsWithSimilarity) {
        const sectionTokenCount = section.text.split(/\s+/).length // Estimate token count as number of words
        if (tokenCount + sectionTokenCount > maxTokens) {
          break // Stop adding sections if max token count is reached
        }
        selectedText += section.text + '\n\n' // Add two new lines for clear separation
        tokenCount += sectionTokenCount
      }

      return selectedText.trim() || 'No sufficiently relevant section found.'
    },
    generateResponseUsingCompletionsAPI: async (relevantText: string, query: string) => {
      console.log(relevantText, 'relevant text')
      const prompt = `You are tasked to help users answer questions about Devcon and its history. When possible, try to refer the user to the relevant category by linking to the content. The current date is ${new Date().toLocaleDateString()}. Based on the following content from our website: "${relevantText}", how would you answer the question: "${query}"? The user does not know which content you are provided, so be sensitive to how they perceive your answer.`
      // const clarifications = `If the content is irrelevant, say "I don't know". The current date is ${new Date().toLocaleDateString()}.`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [{ role: 'system', content: prompt }],
      })

      return completion.choices[0]
    },
    basicCompletionsAPI: async () => {
      console.log(prompts[6].messages.slice(0, 2))

      const completion = await openai.chat.completions.create({
        // model: 'gpt-3.5-turbo-0125',
        model: 'ft:gpt-3.5-turbo-0125:personal::9MaoeoMc',
        messages: prompts[6].messages.slice(0, 2),
      })

      // await openai.chat.completions.create({
      //   // model: 'gpt-3.5-turbo-0125',
      //   model: 'ft:gpt-3.5-turbo-0125:personal::9MaoeoMc',
      //   messages: prompts[0].messages,
      // })

      console.log(completion.choices)
    },

    // ASSISTANT API
    createAssistant: async () => {
      console.log('creating assistant')
      // create assistant
      const assistant = await openai.beta.assistants.create({
        name: 'DevaBot',
        instructions: assistantInstructions,
        tools: [{ type: 'file_search' }],
        // model: 'ft:gpt-3.5-turbo-0125:personal::9MaoeoMc',
        model: 'gpt-4o',
      })

      // Create vector store for website content
      const vectorStore = await openai.beta.vectorStores.create({
        name: 'Website Content',
      })

      const contentDir = path.join(__dirname, 'content')
      const files = fs.readdirSync(contentDir)

      const fileStreams = files.map((file: string) => {
        const filePath = path.join(contentDir, file)
        return fs.createReadStream(filePath)
      })

      // Upload files to vector store
      await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: fileStreams })

      // Update assistant to use our vector store
      await openai.beta.assistants.update(assistant.id, {
        tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      })

      console.log(assistant, 'CREATED ASSISTANT AND UPLOADED WEBSITE CONTENT')
    },
    createThread: async () => {
      const thread = await openai.beta.threads.create()

      console.log(thread, 'GENERATED THREAD')

      return thread
    },
    createMessage: async (assistantID: string, userMessage: string, threadID?: string) => {
      if (!threadID) {
        const thread = await _interface.createThread()

        threadID = thread.id
      }

      await openai.beta.threads.messages.create(threadID, {
        role: 'user',
        content: userMessage,
      })

      const run = await openai.beta.threads.runs.createAndPoll(threadID, {
        assistant_id: assistantID,
      })

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(run.thread_id)

        let formattedMessages = messages.data.reverse().map((message: any) => {
          return {
            id: message.id,
            text: `${message.role} > ${message.content[0].text.value}`,
          }
        })
        // for (const message of messages.data.reverse()) {
        //   // @ts-ignore
        //   console.log(`${message.role} > ${message.content[0].text.value}`)
        // }

        return {
          runID: run.id,
          status: run.status,
          threadID,
          messages: formattedMessages,
        }
      } else {
        console.log(run.status)

        return {
          runID: run.id,
          status: run.status,
        }
      }
    },
  }

  return _interface
})()

// api.createEmbeddingsFromContent();

// const queries = [
//   'How many weeks until Devcon?',
//   'What is Devcon?',
//   'How many days until Devcon?',
//   'What is the difference between Devcon and Devconnect?',
//   'When is Devcon?',
//   'What is the Ethereum Foundation?',
//   'What is Ethereum?',
//   'How many Devcon attendees are there?',
//   'When is Devconnect?',
// ]

const main = async (query: string) => {
  // Compare embedding of query with each section, return most similar

  const mostRelevantSection = await api.getRelevantTextByQuery(query)
  // Take result of most relevant section and generate response
  const relevantText = await api.generateResponseUsingCompletionsAPI(mostRelevantSection, query)

  console.log('The query was: ', query)
  console.log('The answer was: ', relevantText)
}

// queries.forEach(query => {
//     main(query);
// })

// main('Where were the past Devcons held?')

const run = async () => {
  // await api.basicCompletionsAPI()
}

// run()

api.createAssistant()
// api.createThread()
// api.createMessage('asst_sWNkGoBZViwje5VdkLU46oZV', 'When is Devcon?!', 'thread_5U2NZ87hX3oGUkFwY1zBzfX2')

// https://cookbook.openai.com/examples/question_answering_using_embeddings
