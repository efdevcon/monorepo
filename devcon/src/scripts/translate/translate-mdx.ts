import matter from 'gray-matter'
import OpenAI from 'openai'
import { LOCALE_NAMES } from './locales'

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY })

export async function translateMdx(source: string, locale: string): Promise<string> {
  const localeName = LOCALE_NAMES[locale]
  if (!localeName) throw new Error(`Unknown locale: ${locale}`)

  const parsed = matter(source)
  const frontmatter = parsed.data
  const body = parsed.content

  const [translatedFrontmatter, translatedBody] = await Promise.all([
    Object.keys(frontmatter).length > 0 ? translateFrontmatter(frontmatter, localeName) : Promise.resolve(frontmatter),
    body.trim().length > 0 ? translateBody(body, localeName) : Promise.resolve(body),
  ])

  const output = matter.stringify(translatedBody, translatedFrontmatter)

  const reparsed = matter(output)
  if (reparsed.content === undefined) throw new Error('Translated MDX failed to re-parse')

  return output
}

async function translateFrontmatter(fm: Record<string, unknown>, localeName: string): Promise<Record<string, unknown>> {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          `You translate the string values inside a YAML frontmatter object to ${localeName}. ` +
          `Return JSON with the exact same keys, nesting, and array shapes. ` +
          `Do NOT translate: keys, URLs, email addresses, numbers, booleans, slugs, IDs, or any key starting with underscore. ` +
          `Preserve markdown syntax, HTML tags, placeholders, and JSX inside string values. ` +
          `Do not add, remove, or rename fields.`,
      },
      { role: 'user', content: JSON.stringify(fm) },
    ],
  })
  const output = resp.choices[0].message.content ?? '{}'
  return JSON.parse(output)
}

async function translateBody(body: string, localeName: string): Promise<string> {
  const resp = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          `Translate the following MDX content to ${localeName}. ` +
          `Translate ONLY prose text. Leave untouched: JSX tags and their names, JSX attribute names and their values, fenced code blocks, inline code, URLs, email addresses, href values, and import/export lines. ` +
          `Preserve markdown syntax exactly — translate only the visible text of headings, list items, bold, italic, and link labels. ` +
          `Return only the translated MDX content. Do not wrap your response in fences or add explanatory text.`,
      },
      { role: 'user', content: body },
    ],
  })
  return resp.choices[0].message.content ?? body
}
