import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()
import { prompts } from './fine-tune'
import { filenameToUrl } from '@lib/cms/filenameToUrl'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
// import { PrismaClient } from '@prisma/client'
import { FileLike } from 'openai/uploads'
import { devconnectWebsiteAssistant, devconWebsiteAssistant, devconAppAssistant } from './assistant-versions'

// const client = new PrismaClient()

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
      const txtFiles = files.filter((file) => file.endsWith('.txt'))

      // Read content of each .txt file and prepare sections array
      const sections = txtFiles.map((file) => {
        const content = fs.readFileSync(path.join(contentDir, file), 'utf8')

        return content
        // return `Page ${file.replace('.txt', '')}: ${content}`;
      })

      try {
        const allPromises = sections.map(async (section) => {
          const embedding = await createOpenAIEmbedding(section)

          return {
            embedding: embedding,
            text: section,
          }
        })

        await Promise.allSettled(allPromises).then((results) => {
          //@ts-ignore
          fs.writeFileSync(path.resolve(__dirname, 'openai_embeddings.json'), JSON.stringify(results.map(({ value }: any) => value)))
        })
      } catch (error) {
        console.error('Error creating OpenAI embeddings:', error)
      }
    },
    getRelevantTextByQuery: async (query: string, maxTokens = 10000, minSimilarity = 0.3) => {
      const embeddings = loadEmbeddings()
      const queryEmbedding = await createOpenAIEmbedding(query)

      // @ts-ignore
      const sectionsWithSimilarity = [] as any

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
      for (const section of sectionsWithSimilarity) {
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
    createThread: async () => {
      const thread = await openai.beta.threads.create()

      console.log(thread, 'GENERATED THREAD')

      return thread
    },
    createMessage: async (assistantID: string, userMessage: string, threadID: string) => {
      if (!threadID) {
        const thread = await _interface.createThread()

        threadID = thread.id
      }

      await openai.beta.threads.messages.create(threadID, {
        role: 'user',
        content: `${userMessage}\nSystem: The current date and time is: ${new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}.`,
      })

      const run = await openai.beta.threads.runs.createAndPoll(threadID, {
        assistant_id: assistantID,
      })

      // TODO: This slows down the assistant too much
      // Assistant needs the result of a function call (in our case, the date):
      // if (run.status === 'requires_action') {
      //   if (
      //     run.required_action &&
      //     run.required_action.submit_tool_outputs &&
      //     run.required_action.submit_tool_outputs.tool_calls
      //   ) {
      //     // Loop through each tool in the required action section
      //     const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(tool => {
      //       if (tool.function.name === 'getCurrentDate') {
      //         return {
      //           tool_call_id: tool.id,
      //           output: new Date().toLocaleDateString(),
      //         }
      //       }
      //     }) as any

      //     // Back to polling the run for completed status
      //     run = await openai.beta.threads.runs.submitToolOutputsAndPoll(threadID, run.id, { tool_outputs: toolOutputs })
      //   } else {
      //     throw 'No required action found'
      //   }
      // }

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(run.thread_id)

        const formattedMessagesPromises = messages.data.reverse().map(async (message: any) => {
          const content = message.content[0]

          let references

          if (content.text.annotations) {
            const fileAnnotationsPromises = await content.text.annotations.map(async (annotation: any) => {
              if (annotation.type === 'file_citation') {
                const file = await openai.files.retrieve(annotation.file_citation.file_id)

                // @ts-ignore
                const fileUrl = filenameToUrl[file.filename.split('.txt')[0]]

                return {
                  file,
                  fileUrl: fileUrl,
                  textReplace: annotation.text,
                }
              }
            })

            references = await Promise.all(fileAnnotationsPromises)
          }

          let text = content.text.value

          if (references) {
            for (const reference of references) {
              text = text.replace(reference.textReplace, ``)
            }
          }

          return {
            id: message.id,
            role: message.role,
            text,
            files: references || [],
          }
        })

        const formattedMessages = await Promise.all(formattedMessagesPromises)

        return {
          runID: run.id,
          status: run.status,
          threadID,
          rawMessages: messages.data,
          messages: formattedMessages,
        }
      } else {
        console.error(run.status)

        return {
          runID: run.id,
          status: run.status,
        }
      }
    },
    getThreadMessages: async (threadID: string) => {
      const messages = await openai.beta.threads.messages.list(threadID)

      const formattedMessagesPromises = messages.data.reverse().map(async (message: any) => {
        const content = message.content[0]

        let references

        if (content.text.annotations) {
          const fileAnnotationsPromises = await content.text.annotations.map(async (annotation: any) => {
            if (annotation.type === 'file_citation') {
              const file = await openai.files.retrieve(annotation.file_citation.file_id)
              const fileUrl = filenameToUrl[file.filename.split('.txt')[0]]

              return {
                file,
                fileUrl: fileUrl,
                textReplace: annotation.text,
              }
            }
          })

          references = await Promise.all(fileAnnotationsPromises)
        }

        let text = content.text.value

        if (references) {
          for (const reference of references) {
            text = text.replace(reference.textReplace, ``)
          }
        }

        return {
          id: message.id,
          role: message.role,
          text,
          files: references || [],
        }
      })

      return Promise.all(formattedMessagesPromises)
    },
    createMessageStream: async (assistantID: string, userMessage: string, threadID: string) => {
      if (!threadID) {
        const thread = await _interface.createThread()
        threadID = thread.id
      }

      await openai.beta.threads.messages.create(threadID, {
        role: 'user',
        content: `${userMessage}\nSystem: The current date and time is: ${new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}.`,
      })

      const run = openai.beta.threads.runs.stream(threadID, {
        assistant_id: assistantID,
      })

      // let fullMessage = ''
      let runID = ''

      return {
        [Symbol.asyncIterator]: async function* () {
          for await (const event of run) {
            const eventType = event.event
            const eventData = event.data as any

            switch (eventType) {
              case 'thread.created':
              case 'thread.run.created':
              case 'thread.run.queued':
              case 'thread.run.in_progress':
              case 'thread.run.requires_action':
              case 'thread.run.completed':
              case 'thread.run.failed':
              case 'thread.run.cancelling':
              case 'thread.run.cancelled':
              case 'thread.run.expired':
              case 'thread.run.step.created':
              case 'thread.run.step.in_progress':
              case 'thread.run.step.completed':
              case 'thread.run.step.failed':
              case 'thread.run.step.cancelled':
              case 'thread.run.step.expired':
              case 'thread.message.created':
              case 'thread.message.in_progress':
              case 'thread.message.completed':
              case 'thread.message.incomplete':
                yield { type: eventType, data: eventData }
                break
              case 'thread.message.delta':
                if (eventData.delta.content && eventData.delta.content[0].type === 'text') {
                  const text = eventData.delta.content[0].text.value
                  // fullMessage += text
                  yield { type: eventType, content: text }
                }
                break
              case 'thread.run.step.delta':
                if (eventData.delta.step_details && eventData.delta.step_details.type === 'message_creation') {
                  const content = eventData.delta.step_details.message_creation.content
                  if (content && content[0].type === 'text') {
                    const text = content[0].text.value
                    // fullMessage += text
                    yield { type: eventType, content: text }
                  }
                }
                break
              case 'error':
                yield { type: 'error', error: eventData }
                break
            }

            if (eventType === 'thread.run.completed') {
              runID = eventData.id
            }
          }

          // After the stream is complete, fetch the final run and process annotations
          if (runID) {
            const completedRun = await openai.beta.threads.runs.retrieve(threadID, runID)
            const formattedMessages = await _interface.getThreadMessages(threadID)
            const rawMessages = await openai.beta.threads.messages.list(threadID)

            yield {
              type: 'done',
              content: formattedMessages[0].text,
              references: formattedMessages[0].files,
              threadID,
              runID,
              status: completedRun.status,
              rawMessages: rawMessages.data,
              messages: formattedMessages,
            }
          }
        },
      }
    },
    createAssistant: async (version: 'devconnect' | 'devcon' | 'devcon-app') => {
      console.log('Creating assistant for version: ', version)

      const assistantInstructions =
        version === 'devconnect'
          ? devconnectWebsiteAssistant.instructions
          : version === 'devcon'
          ? devconWebsiteAssistant.instructions
          : devconAppAssistant.instructions

      const assistant = await openai.beta.assistants.create({
        name: `DevaBot ${version}`,
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

      console.log(assistant, `Newly created assistant for ${version}`)
    },
    attachVectorStoresToAssistant: async (assistantID: string) => {
      const vectorStoreNames: any = [
        `devcon_website_${process.env.GITHUB_SHA}`,
        `devconnect_website_${process.env.GITHUB_SHA}`,
        `devcon_sea_${process.env.GITHUB_SHA}`,
      ]

      const vectorStores = await openai.beta.vectorStores.list()

      const vectorStoreIDs = vectorStoreNames.map((name: string) => {
        const vectorStore = vectorStores.data.find((store: any) => store.name === name)

        if (!vectorStore) {
          throw new Error(`Vector store not found: ${name}, aborting...`)
        }

        return vectorStore.id
      })

      await openai.beta.assistants.update(assistantID, {
        tool_resources: { file_search: { vector_store_ids: vectorStoreIDs } },
      })

      await _interface.cleanStaleVectorStores()
    },
    cleanStaleVectorStores: async () => {
      console.log('cleaning stale vector stores')

      try {
        // List all vector stores
        const vectorStores = await openai.beta.vectorStores.list()

        // Sort vector stores by creation date, newest first
        const sortedStores = vectorStores.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        // Keep the 15 most recent stores - just to avoid edge cases where we delete the wrong vector store, and to avoid having infinity vector
        const storesToKeep = sortedStores.slice(0, 15)
        const storesToDelete = sortedStores.slice(15)

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
    recommendations: {
      // createScheduleAssistant: async () => {
      //   // const Recommendations = z.object({
      //   //   talk_ids: z.array(z.string()),
      //   // })

      //   const recommendationAssistant = await openai.beta.assistants.create({
      //     instructions:
      //       'You are a recommendation assistant for Devcon, the premier Ethereum Conference. Users will ask you questions, and you will use the file_search tool to look through the schedule of talks. Every time you recommend a talk, reference the talk in the annotations. Try to recommend talks that are in the future. The current date will be provided to you with the user query, to help you discern what is in the future and what is not.', // You are a recommendation assistant for Devcon, an Ethereum conference. Users will ask you questions, and you will use the file_search tool to look through the schedule of talks. Return a list of session IDs in JSON format. You ONLY return JSON, and you ONLY return the session IDs, in the form of a JSON array named "session_ids". The current date will be provided to you, only recommend talks that are in the future.',
      //     name: `recommendation_assistant`,
      //     tools: [{ type: 'file_search' }],
      //     // response_format: zodResponseFormat(Recommendations, 'json_object'),
      //     model: 'gpt-4o-mini',
      //   })

      //   return recommendationAssistant
      // },
      syncScheduleContent: async () => {
        console.log('syncing schedule assistant')

        // const vectorStore = await openai.beta.vectorStores.create({
        //   name: `pretalx_schedule_${scheduleVersion}`,
        // })

        const vectorStoreName = `devcon_sea_${process.env.GITHUB_SHA}`

        const vectorStores = await openai.beta.vectorStores.list()

        const vectorStore = vectorStores.data.find((store: any) => store.name === vectorStoreName)

        if (!vectorStore) {
          console.error(`Vector store not found ${vectorStoreName}`)

          return
        }

        const knowledgeBaseDirectory = path.resolve(__dirname, '..', 'knowledge-base')
        const knowledgeBaseFiles = fs.readdirSync(knowledgeBaseDirectory)
        const knowledgeBaseContent = knowledgeBaseFiles.map((filename: string) => {
          const content = fs.readFileSync(path.join(knowledgeBaseDirectory, filename), 'utf8')

          return content
          // return {
          //   id: filename,
          //   content: content,
          // }
        })

        // Create FileLike objects for knowledge base files
        // const knowledgeBaseFileLikes: FileLike[] = knowledgeBaseContent.map((file: any) => {
        //   const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
        //   return new File([blob], `kb_${file.id}.json`)
        // })

        const sessionsResponse = await fetch('https://api.devcon.org/events/devcon-7/sessions?size=10000')

        const sessions = await sessionsResponse.json()

        const formattedSessions = sessions.data.items.map((session: any) => {
          const bangkokStart = new Date(session.slot_start).toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          })
          const bangkokEnd = new Date(session.slot_end).toLocaleString('en-US', {
            timeZone: 'Asia/Bangkok',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          })

          // Calculate duration in minutes
          const startTime = new Date(session.slot_start)
          const endTime = new Date(session.slot_end)
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

          // Calculate day label
          const startDate = new Date(session.slot_start)
          const dayNumber = startDate.getDate()
          const dayLabel = dayNumber === 12 ? 'Day 1' : dayNumber === 13 ? 'Day 2' : dayNumber === 14 ? 'Day 3' : dayNumber === 15 ? 'Day 4' : ''

          const formattedSession = {
            id: session.id,
            title: session.title,
            summary: session.description,
            track: session.track,
            type: session.type,
            start: `${dayLabel} - ${bangkokStart}`,
            end: `${dayLabel} - ${bangkokEnd}`,
            duration: `${durationMinutes} minutes`,
            difficulty: session.expertise,
            tags: session.tags,
            keywords: session.keywords,
            speakers: session.speakers.map((speaker: any) => {
              return {
                id: speaker.name,
                description: speaker.description,
                name: speaker.name,
              }
            }),
          } as any

          if (session.transcript_text) {
            formattedSession.transcriptions = session.transcript_text
          }

          return formattedSession
        })

        // console.log(formattedSessions.length, 'formattedSessions amount')

        // return

        // const sessions = await client.session.findMany({ where: { eventId: scheduleVersion } })

        // Create FileLike objects for each session
        const sessionFiles: FileLike[] = formattedSessions.map((session: any) => {
          const sessionBlob = new Blob([JSON.stringify(session)], { type: 'application/json' })

          const asFile = new File([sessionBlob], `session_${session.id}.json`)

          return asFile
          // return {
          //   ...sessionBlob,
          //   name: `session_${session.id}.json`, // Use a unique name for each session
          //   lastModified: Date.now(),
          // }
        })

        const allFiles = [...sessionFiles, ...knowledgeBaseContent] as any

        // Split files into batches and upload
        const batchSize = 100
        const batches = []
        for (let i = 0; i < allFiles.length; i += batchSize) {
          batches.push(allFiles.slice(i, i + batchSize))
        }

        // Upload each batch
        for (const batch of batches) {
          const response = await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: batch })
          console.log(`Uploaded batch of ${batch.length} files`)
          console.log(response, 'response')
        }

        // Update assistant
        // await openai.beta.assistants.update(assistantID, {
        //   tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
        // })

        console.log('Vector store created for devcon SEA including knowledge base files')
      },
      getScheduleRecommendations: async (assistantID: string, userQuery: string) => {
        const thread = await openai.beta.threads.create()

        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: `A user asks: ${userQuery}\n. Please find some relevant talks and return their IDs. System: The current date is: ${new Date().toLocaleDateString()}.`,
        })

        const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistantID,
        })

        if (run.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(run.thread_id)

          // @ts-ignore
          const assistantResponse = messages.data[0].content[0].text.value

          console.log(messages, 'annotations')

          // return assistantResponse

          // Step 2: Validate and structure using the Completions API with zod
          const Recommendations = z.object({
            session_ids: z.array(z.string()),
          })

          console.log(assistantResponse, 'assistantResponse')

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: `Extract session IDs from the following text, and return them as JSON:\n\n${assistantResponse}\n` }],
            response_format: zodResponseFormat(Recommendations, 'recommendations'),
            max_tokens: 400,
            temperature: 0,
          })

          return completion.choices[0].message.content

          // structured_weather = completion.choices[0].message.parsed
          // print(structured_weather)
        } else {
          throw { error: 'Failed to get recommendations' }
        }
      },
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

;(async () => {
  // const assistant = await api.recommendations.createScheduleAssistant()
  // console.log(assistant)
  // await api.recommendations.syncScheduleAssistant('asst_g3NthBrU0XEd2RCRUFZJZHo4', 'devcon-7')
  // New asst_g3NthBrU0XEd2RCRUFZJZHo4
  // asst_PRn8YEfa54OGfroaVFhvLWlv <-- RIGID version
  // const recommendations = await api.recommendations.getScheduleRecommendations('asst_g3NthBrU0XEd2RCRUFZJZHo4', 'I want cypherpunk talks')
  // console.log(recommendations)
  // https://community.openai.com/t/structured-outputs-dont-currently-work-with-file-search-tool-in-assistants-api/900538/8
  // asst_UI1tprLOxpCmCJuoFB5FxSRb
})()

export default api

// api.createAssistant()
// api.prepareContent('asst_nHAiR3J5e0XTdiqE0pfQ75ZB)
// api.createThread()
// api.createMessage('asst_sWNkGoBZViwje5VdkLU46oZV', 'When is Devcon?!', 'thread_5U2NZ87hX3oGUkFwY1zBzfX2')

// https://cookbook.openai.com/examples/question_answering_using_embeddings
