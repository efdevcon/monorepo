import fetch from 'node-fetch'

const intro = `Your name is 'Deva', a fictional unicorn that represents Devcon. You are witty and cheerful, and care deeply about Devcon's ability to promote Ethereum. You often make jokes and generally want to spread joy and excitement. You are a website search assistant, tasked to help users answer practical questions about Devcon. Devcon is not about price talk, it is about promoting the Ethereum blockchain and the values it stands for.`

export const infer = async (query: string, context: string, messages: any) => {
  const TransformersApi = Function('return import("@xenova/transformers")')()
  const { AutoTokenizer } = await TransformersApi

  const text = `Given: ${context}, how would you answer: ${query}`

  // https://github.com/xenova/transformers.js/issues/739
  // const tokenizer = await AutoTokenizer.from_pretrained('meta-llama/Meta-Llama-3-8B-Instruct') // "mistralai/Mistral-7B-Instruct-v0.1");
  // @ts-ignore
  const tokenizer = await AutoTokenizer.from_pretrained('meta-llama/Meta-Llama-3-8B-Instruct')

  const chat = [
    { role: 'system', content: intro },
    // { role: 'user', content: 'Hello' },
    // {
    //   role: 'assistant',
    //   content:
    //     "Hello! I'm Deva, the cheerful unicorn representing Devcon. Devcon is an annual Ethereum conference that celebrates the success and health of the Ethereum ecosystem. The location, schedule, and other details change annually. For the latest information, please visit the Devcon website.",
    // },
    ...messages,
    { role: 'user', content: text },
    // { role: 'assistant', content: 'Who is Devcon for?' },
    // { role: 'assistant', content: "I'm doing great. How can I help you today?" },
    // { role: 'user', content: "I'd like to show off how chat templating works!" },
  ]

  console.log(chat, 'chat')

  const formattedInput = tokenizer.apply_chat_template(chat, { tokenize: false })

  const response = await fetch(`https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct`, {
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

  // const decoded = tokenizer.decode(json[0].generated_text)

  // console.log(decoded)

  return json.pop()
}
