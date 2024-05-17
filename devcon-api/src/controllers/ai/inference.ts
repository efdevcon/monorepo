import fetch from 'node-fetch'

export const infer = async (query: string, context: string) => {
  const TransformersApi = Function('return import("@xenova/transformers")')()
  const { AutoTokenizer } = await TransformersApi

  const text = `Given: ${context}, how would you answer: ${query}`

  // const tokenizer = await AutoTokenizer.from_pretrained('meta-llama/Meta-Llama-3-8B-Instruct') // "mistralai/Mistral-7B-Instruct-v0.1");
  // @ts-ignore
  const tokenizer = await AutoTokenizer.from_pretrained('mustafaaljadery/gemma-2B-10M')

  const chat = [
    { role: 'system', content: 'Hello, how are you?' },
    { role: 'user', content: text },
    // { role: 'assistant', content: "I'm doing great. How can I help you today?" },
    // { role: 'user', content: "I'd like to show off how chat templating works!" },
  ]

  const formattedInput = tokenizer.apply_chat_template(chat, { tokenize: false })

  const response = await fetch(`https://api-inference.huggingface.co/models/mustafaaljadery/gemma-2B-10M`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HF_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      inputs: formattedInput,
    }),
  })

  const json = await response.json()

  return json
}
