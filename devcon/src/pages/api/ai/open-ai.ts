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


// // Function to find the most relevant section
// async function findMostRelevantSection(query: any) {
//   const embeddings = loadEmbeddings();
//   const queryEmbedding = await createOpenAIEmbedding(query);

//   let highestSimilarity = -1;
//   let mostRelevantSection = null;

//   embeddings.forEach((section: any, index: any) => {
//     const similarity = cosineSimilarity(queryEmbedding, section.embedding); // Directly use `section.embedding` since it's an array
//     if (similarity > highestSimilarity) {
//       highestSimilarity = similarity;
//       mostRelevantSection = section; // `Section ${index + 1}`; // You may want to replace this with a more descriptive identifier
//     }
//   });

//   return mostRelevantSection;
// }

// Function to create a single OpenAI embedding
async function createOpenAIEmbedding(text: any) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

// Function to create OpenAI embeddings
// async function createOpenAIEmbeddings(sections: string): Promise<void> {
//   try {
//     const embedding = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: sections,
//       encoding_format: "float",
//     });

//     fs.writeFileSync(path.resolve(__dirname, 'openai_embeddings.json'), JSON.stringify(embedding));
  
//     console.log('OpenAI Embeddings:', embedding);
//   } catch (error) {
//     console.error('Error creating OpenAI embeddings:', error);
//   }
// }

async function generateResponseUsingCompletionsAPI(relevantText: string, query: string) {
  const prompt = `Based on the following information: "${relevantText}", how would you answer the question: "${query}"?`;
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Who won the world series in 2020?"}

    ],
    max_tokens: 150,
    temperature: 0.5
  });

  return completion.choices[0];
}

const api = (() => {
  const _interface = {
    createEmbeddingsFromContent: async () => {
      const formattedSections = Object.entries(sections).map(([key, value]) => {
        return `Page ${key}: ${value}`;
      })
      
      try {
        const allPromises = formattedSections.map(async (section) => {
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
    getRelevantTextByQuery: async (query: string) => {
      const embeddings = loadEmbeddings();
      const queryEmbedding = await createOpenAIEmbedding(query);
    
      let highestSimilarity = -1;
      let mostRelevantSection = '';
    
      embeddings.forEach((section: any, index: any) => {
        const similarity = cosineSimilarity(queryEmbedding, section.embedding); // Directly use `section.embedding` since it's an array

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostRelevantSection = section.text; // `Section ${index + 1}`; // You may want to replace this with a more descriptive identifier
        }
      });
    
      return mostRelevantSection;
    },
    generateResponseUsingCompletionsAPI: async (relevantText: string, query: string) => {
      const prompt = `Based on the following information: "${relevantText}", how would you answer the question: "${query}"?`;
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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

const main = async () => {
  const query = 'Where was Devcon 0 held?';
  // Compare embedding of query with each section, return most similar
  const mostRelevantSection = await api.getRelevantTextByQuery(query)
  // Take result of most relevant section and generate response
  const relevantText = await api.generateResponseUsingCompletionsAPI(mostRelevantSection, query)

  console.log('The query was: ', query);
  console.log('The answer was: ', relevantText);

}

main();

// https://cookbook.openai.com/examples/question_answering_using_embeddings