import OpenAI from 'openai'
import { LOCALE_NAMES } from './locales'

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY })

export async function translateJson(source: string, locale: string): Promise<string> {
  const localeName = LOCALE_NAMES[locale]
  if (!localeName) throw new Error(`Unknown locale: ${locale}`)

  const input = JSON.parse(source)
  const isArrayInput = Array.isArray(input)

  // OpenAI's `response_format: { type: 'json_object' }` requires a top-level object,
  // so a top-level array input gets coerced into `{"0":..., "1":...}`. Wrap arrays
  // in `{ items: [...] }` before sending and unwrap on return so callers always get
  // back exactly the same top-level shape they passed in.
  const wrappedInput = isArrayInput ? { items: input } : input
  const wrappedSource = JSON.stringify(wrappedInput)

  const resp = await openai.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          `You translate JSON documents to ${localeName}. Return a JSON object with the EXACT same structure (same keys, same nesting, same array lengths) as the input. ` +
          `Translate string values only. Preserve HTML tags, markdown syntax, URLs, and placeholder tokens like {name} or {{count}} inside strings. ` +
          `Do NOT translate: keys, URLs, email addresses, numbers, booleans, slugs, IDs, or any key starting with underscore (_template, _id, etc). ` +
          `Do not add, remove, or rename fields. Do not wrap the output in explanation.` +
          (isArrayInput
            ? ` The input was wrapped in { "items": [ ... ] } so it can be returned as a JSON object — your output must use the same wrapper, with "items" containing an array of the same length.`
            : ''),
      },
      { role: 'user', content: wrappedSource },
    ],
  })

  const raw = resp.choices[0].message.content ?? ''
  const parsed = JSON.parse(raw)

  let result: unknown
  if (isArrayInput) {
    const items = (parsed as { items?: unknown }).items
    if (!Array.isArray(items)) {
      throw new Error(
        `translateJson: expected { items: [...] } in output, got keys [${Object.keys(parsed as object).join(',')}]`
      )
    }
    result = items
  } else {
    result = parsed
  }

  assertSameShape(input, result)
  return JSON.stringify(result, null, 2) + '\n'
}

// Verifies the translated value has the same structural shape as the input:
// matching object keys, matching array lengths, and matching primitive types
// (with null allowed in either position). Throws on any divergence so a
// malformed translation fails the run instead of getting committed.
function assertSameShape(input: unknown, output: unknown, p: string = '$'): void {
  if (Array.isArray(input)) {
    if (!Array.isArray(output)) {
      throw new Error(`translateJson shape mismatch at ${p}: expected array, got ${describe(output)}`)
    }
    if (input.length !== output.length) {
      throw new Error(`translateJson shape mismatch at ${p}: array length ${input.length} → ${output.length}`)
    }
    input.forEach((v, i) => assertSameShape(v, output[i], `${p}[${i}]`))
    return
  }

  if (input !== null && typeof input === 'object') {
    if (output === null || typeof output !== 'object' || Array.isArray(output)) {
      throw new Error(`translateJson shape mismatch at ${p}: expected object, got ${describe(output)}`)
    }
    const inKeys = Object.keys(input as object).sort()
    const outKeys = Object.keys(output as object).sort()
    if (inKeys.length !== outKeys.length || inKeys.some((k, i) => k !== outKeys[i])) {
      throw new Error(
        `translateJson shape mismatch at ${p}: keys [${inKeys.join(',')}] → [${outKeys.join(',')}]`
      )
    }
    for (const k of inKeys) {
      assertSameShape((input as Record<string, unknown>)[k], (output as Record<string, unknown>)[k], `${p}.${k}`)
    }
    return
  }

  // Primitives — null may translate to/from a string in either direction (rare),
  // so allow null on either side; otherwise require matching primitive types.
  if (input === null || output === null) return
  if (typeof input !== typeof output) {
    throw new Error(`translateJson shape mismatch at ${p}: ${typeof input} → ${typeof output}`)
  }
}

function describe(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}
