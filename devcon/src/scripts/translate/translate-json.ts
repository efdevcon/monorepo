import OpenAI from 'openai'
import { LOCALE_NAMES } from './locales'

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY })

export async function translateJson(source: string, locale: string): Promise<string> {
  const localeName = LOCALE_NAMES[locale]
  if (!localeName) throw new Error(`Unknown locale: ${locale}`)

  JSON.parse(source)

  const resp = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          `You translate JSON documents to ${localeName}. Return a JSON object with the exact same structure (same keys, same nesting, same array shapes) as the input. ` +
          `Translate string values only. Preserve HTML tags, markdown syntax, URLs, and placeholder tokens like {name} or {{count}} inside strings. ` +
          `Do NOT translate: keys, URLs, email addresses, numbers, booleans, slugs, IDs, or any key starting with underscore (_template, _id, etc). ` +
          `Do not add, remove, or rename fields. Do not wrap the output in explanation.`,
      },
      { role: 'user', content: source },
    ],
  })

  const output = resp.choices[0].message.content ?? ''
  JSON.parse(output)
  return JSON.stringify(JSON.parse(output), null, 2) + '\n'
}
