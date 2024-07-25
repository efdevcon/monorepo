import path from 'path'
import './format-content'
import { HuggingFaceEmbedding, MistralAI, Settings, VectorStoreIndex, SimpleDirectoryReader, QueryEngine, VectorIndexRetriever } from 'llamaindex'
let retriever: VectorIndexRetriever | undefined

Settings.embedModel = new HuggingFaceEmbedding({
  modelType: 'Xenova/all-MiniLM-L6-v2',
  quantized: false,
})

// Settings.llm = new MistralAI({
//   model: 'mistral-tiny',
//   apiKey: '<YOUR_API_KEY>',
// })

const setupVectorStore = async () => {
  const reader = new SimpleDirectoryReader()
  const documents = await reader.loadData(path.resolve(__dirname, 'formatted-content'))

  const index = await VectorStoreIndex.fromDocuments(documents)

  retriever = index.asRetriever()

  retriever.similarityTopK = 2

  // queryEngine = index.asQueryEngine()
}

setupVectorStore()

export const getWebsiteContentForQuery = async (query: string) => {
  if (!retriever) return 'No context yet'

  const nodes = await retriever.retrieve({ query })

  const rawText = nodes.reduce((acc, { node }: any) => {
    if (!node || !node.text) return acc

    return `${acc}\n\n${node.text}`
  }, '')

  return rawText

  // return JSON.stringify(response)
}
