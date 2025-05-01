import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()
import { filenameToUrl } from '@lib/cms/filenameToUrl'
import { FileLike } from 'openai/uploads'
import { devconnectWebsiteAssistant, devconWebsiteAssistant, devconAppAssistant } from './assistant-versions'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
})

export const api = (() => {
  const _interface = {
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
    createAssistant: async (version: 'devconnect-website' | 'devcon-website' | 'devcon-app') => {
      console.log('Creating assistant for version: ', version)

      const assistantInstructions =
        version === 'devconnect-website'
          ? devconnectWebsiteAssistant.instructions
          : version === 'devcon-website'
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
    createAllVectorStores: async () => {
      const vectorStoreNames = [
        `${devconWebsiteAssistant.vector_store_prefix}_${process.env.GITHUB_SHA}`,
        `${devconnectWebsiteAssistant.vector_store_prefix}_${process.env.GITHUB_SHA}`,
        `${devconAppAssistant.vector_store_prefix}_${process.env.GITHUB_SHA}`,
      ]

      for (const vectorStoreName of vectorStoreNames) {
        const vectorStore = await openai.vectorStores.create({
          name: vectorStoreName,
        })

        if (!vectorStore) {
          throw new Error(`Failed to create vector store: ${vectorStoreName}`)
        }

        console.log(`Created vector store: ${vectorStore.id}`)
      }
    },
    attachVectorStoresToAssistant: async (assistantID: string, vectorStorePrefix: string) => {
      const vectorStoreName = `${vectorStorePrefix}_${process.env.GITHUB_SHA}`

      const vectorStores = await openai.vectorStores.list()

      // const vectorStoreIDs = vectorStoreNames.map((name: string) => {
      const vectorStore = vectorStores.data.find((store: any) => store.name === vectorStoreName)

      if (!vectorStore) {
        throw new Error(`Vector store not found: ${vectorStoreName}, aborting...`)
      }

      await openai.beta.assistants.update(assistantID, {
        tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      })
    },
    cleanStaleVectorStores: async () => {
      console.log('cleaning stale vector stores')

      try {
        // List all vector stores
        const vectorStores = await openai.vectorStores.list()

        // Sort vector stores by creation date, newest first
        const sortedStores = vectorStores.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        // Keep the 15 most recent stores - just to avoid edge cases where we delete the wrong vector store, and to avoid having infinity vector
        const storesToKeep = sortedStores.slice(0, 15)
        const storesToDelete = sortedStores.slice(15)

        // Delete old stores
        for (const store of storesToDelete) {
          await openai.vectorStores.del(store.id)
          console.log(`Deleted vector store: ${store.id}`)
        }

        console.log(`Cleaned up ${storesToDelete.length} old vector stores. Kept ${storesToKeep.length} most recent.`)
      } catch (error) {
        console.error('Error cleaning up vector stores:', error)
      }
    },
    recommendations: {
      syncScheduleContent: async () => {
        console.log('syncing schedule to vector store')

        const vectorStoreName = `${devconAppAssistant.vector_store_prefix}_${process.env.GITHUB_SHA}`
        const vectorStores = await openai.vectorStores.list()

        const vectorStore = vectorStores.data.find((store: any) => store.name === vectorStoreName)

        if (!vectorStore) {
          console.error(`Vector store not found ${vectorStoreName}`)

          return
        }

        // const knowledgeBaseDirectory = path.resolve(__dirname, '..', 'knowledge-base')
        // const knowledgeBaseFiles = fs.readdirSync(knowledgeBaseDirectory)
        // const knowledgeBaseContent = knowledgeBaseFiles.map((filename: string) => {
        //   const content = fs.readFileSync(path.join(knowledgeBaseDirectory, filename), 'utf8')

        //   return content
        // })

        const knowledgeBaseDirectory = path.resolve(__dirname, '..', 'knowledge-base')
        const knowledgeBaseFiles = fs.readdirSync(knowledgeBaseDirectory)
        const knowledgeBaseStreams = knowledgeBaseFiles
          .map((filename: string) => {
            const filePath = path.join(knowledgeBaseDirectory, filename)
            // Skip directories, only process files
            if (fs.statSync(filePath).isDirectory()) {
              return null
            }
            // Create a stream with a custom filename prefix
            const stream = fs.createReadStream(filePath)
            return stream
          })
          .filter(Boolean) as any // Filter out null values (directories)

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

        // Create FileLike objects for each session
        const sessionFiles: FileLike[] = formattedSessions.map((session: any) => {
          const sessionBlob = new Blob([JSON.stringify(session)], { type: 'application/json' })

          const asFile = new File([sessionBlob], `session_${session.id}.json`)

          return asFile
        })

        const allFiles = [...sessionFiles, ...knowledgeBaseStreams] as any

        // Split files into batches and upload
        const batchSize = 100
        const batches = []
        for (let i = 0; i < allFiles.length; i += batchSize) {
          batches.push(allFiles.slice(i, i + batchSize))
        }

        // Upload each batch
        for (const batch of batches) {
          const response = await openai.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files: batch })
          console.log(`Uploaded batch of ${batch.length} files`)
          console.log(response, 'response')
        }

        console.log('Vector store created for devcon SEA including knowledge base files')
      },
    },
  }

  return _interface
})()

export default api
