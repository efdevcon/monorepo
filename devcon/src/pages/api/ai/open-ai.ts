import OpenAI from "openai";
import fs from 'fs';
import path from 'path'
// import LoadContent from './load-content';
require('dotenv').config()

// LoadContent();

import sections from './sections.json';

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
});

// Function to load embeddings from file
function loadEmbeddings() {
  const filePath = path.resolve(__dirname, 'openai_embeddings.json');
  const data = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(data);
  return parsedData;
}

/**
 * Calculate the cosine similarity between two vectors.
 * 
 * @param vecA The first vector of type number[].
 * @param vecB The second vector of type number[].
 * @returns The cosine similarity as a number between 0 and 1.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc: number, curr: number, idx: number) => acc + curr * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc: number, val: number) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc: number, val: number) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Function to create a single OpenAI embedding
async function createOpenAIEmbedding(text: any) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

const api = (() => {
  const _interface = {
    createEmbeddingsFromContent: async () => {
      const contentDir = path.resolve(__dirname, 'content');
      const files = fs.readdirSync(contentDir);
    
      // Filter only .txt files
      const txtFiles = files.filter(file => file.endsWith('.txt'));
    
      // Read content of each .txt file and prepare sections array
      const sections = txtFiles.map(file => {
        const content = fs.readFileSync(path.join(contentDir, file), 'utf8');

        return content;
        // return `Page ${file.replace('.txt', '')}: ${content}`;
      });
      
      try {
        const allPromises = sections.map(async (section) => {
          const embedding = await createOpenAIEmbedding(section);

          return {
            embedding: embedding,
            text: section
          }
        })

        await Promise.allSettled(allPromises).then((results) => {
          //@ts-ignore
          fs.writeFileSync(path.resolve(__dirname, 'openai_embeddings.json'), JSON.stringify(results.map(({ value }) => value))); 
        });
      } catch (error) {
        console.error('Error creating OpenAI embeddings:', error);
      }
    },
    getRelevantTextByQuery: async (query: string, maxTokens: number = 10000, minSimilarity: number = 0.3) => {
      const embeddings = loadEmbeddings();
      const queryEmbedding = await createOpenAIEmbedding(query);
      
      let sectionsWithSimilarity = [] as any;
    
      // Calculate similarity for each section
      embeddings.forEach((section: any) => {
        const similarity = cosineSimilarity(queryEmbedding, section.embedding);
        if (similarity > minSimilarity) {  // Only include sections above the similarity threshold
          sectionsWithSimilarity.push({
            text: section.text,
            similarity: similarity
          });
        }
      });
    
      // Sort sections by similarity in descending order
      sectionsWithSimilarity.sort((a: any, b: any) => b.similarity - a.similarity);
    
      // Select top sections within the token limit
      let tokenCount = 0;
      let selectedText = "";
      for (let section of sectionsWithSimilarity) {
        const sectionTokenCount = section.text.split(/\s+/).length; // Estimate token count as number of words
        if (tokenCount + sectionTokenCount > maxTokens) {
          break;  // Stop adding sections if max token count is reached
        }
        selectedText += section.text + "\n\n"; // Add two new lines for clear separation
        tokenCount += sectionTokenCount;
      }
    
      return selectedText.trim() || "No sufficiently relevant section found.";
    },
    generateResponseUsingCompletionsAPI: async (relevantText: string, query: string) => {
      console.log(relevantText, 'relevant text')
      const prompt = `You are tasked to help users answer questions about Devcon and its history. When possible, try to refer the user to the relevant category. The current date is ${new Date().toLocaleDateString()}. Based on the following content from our website: "${relevantText}", how would you answer the question: "${query}"? The user does not know which content you are provided, so be sensitive to how they perceive your answer.`;
      // const clarifications = `If the content is irrelevant, say "I don't know". The current date is ${new Date().toLocaleDateString()}.`;
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {"role": "system", "content": prompt},
        ]
      })
      
      return completion.choices[0];
    }
  }
  
  return _interface
})();

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

  console.log('The query was: ', query);
  console.log('The answer was: ', relevantText);
}

// queries.forEach(query => {
//     main(query);
// })

main('Where were the past Devcons held?');

// https://cookbook.openai.com/examples/question_answering_using_embeddings