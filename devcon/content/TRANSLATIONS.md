# Devcon Translations

How content is stored, translated, and rendered per-locale in devcon.

## Two systems, same folder

Everything translatable lives under `devcon/content/<locale>/`. One master tree (`en/`) is human-edited; every other locale is mirror produced by the AI translation pipeline.

| System | What it holds | Edited by | Location |
|---|---|---|---|
| **next-intl** | UI snippets — button labels, nav, table headers, short captions | Engineers/designers in PRs | `content/<locale>/intl/*.json` |
| **TinaCMS** | Long-form prose — body content of pages | Non-technical editors in Tina UI (English only); machine for other locales | `content/<locale>/pages/*.mdx` |
| **External data** | Webhook-synced JSON (NocoDB etc.) | Upstream source | `content/<locale>/external/<source>/*.json` |

Rule of thumb: if a string is short, repeated, or sits in JSX alongside layout → intl. If it's a paragraph of prose with formatting → Tina.

## Pipeline

```
content/en/**   ──push──►  .github/workflows/devcon-translate.yml
                           ├─ hash every file (SHA256)
                           ├─ diff against .manifest.json
                           └─ for each changed file:
                              ├─ JSON → OpenAI structured call (preserves keys/shape)
                              └─ MDX  → gray-matter split, translate frontmatter strings
                                        + prose body (JSX / code / URLs untouched)

content/<locale>/**   ◄── commit as github-actions[bot]
```

The manifest is the single source of truth for "what's up to date." If you add a new locale, delete `.manifest.json` to force a full retranslation pass.

## Adding a new translatable string (intl path)

1. Add the key to an existing namespace or a new file under `content/en/intl/`:
   ```json
   // content/en/intl/dips.json
   { "accepted_proposals_heading": "Accepted Proposals" }
   ```
2. Read it in the component:
   ```tsx
   import { useTranslations } from 'next-intl'

   const t = useTranslations('dips')        // namespace = filename
   return <p>{t('accepted_proposals_heading')}</p>
   ```
3. Make sure the page passes messages through `getStaticProps`:
   ```tsx
   import { getMessages } from 'utils/intl'

   export async function getStaticProps({ locale }: any) {
     const messages = await getMessages(locale ?? 'en')
     return { props: { messages } }
   }
   ```
   `_app.tsx` wires `pageProps.messages` into `IntlProvider` automatically.
4. Either hand-add the translated keys to `content/<locale>/intl/dips.json`, or wait for the translator Action to produce them on the next push.

## Adding a new translatable page (Tina path)

1. Create the MDX at `content/en/pages/<slug>.mdx` — Tina's `pages` collection picks it up automatically.
2. After `pnpm translate-content` (or the Action) runs, a Hindi version appears at `content/hi/pages/<slug>.mdx`.
3. Tina also has a `pagesHi` collection that reads `content/hi/pages/`. Running `pnpm build` (or `pnpm dev`) regenerates the Tina client with `client.queries.pagesHi`.
4. In the page's `getStaticProps`, pick the right query based on `context.locale`. See `src/pages/dips/index.tsx` for the pattern — it tries `pages<Locale>` and falls back to `pages` if the client hasn't been regenerated yet.

## Adding a new locale

1. Add the code to `TARGET_LOCALES` in `src/scripts/translate/locales.ts` and its human name to `LOCALE_NAMES`.
2. Add the code to `i18n.locales` in `next.config.js`.
3. Add it to `LOCALES` in `components/common/layouts/header/menu/language-toggle/LanguageToggle.tsx` with a Latin short code (2 letters — Devanagari and other non-Latin scripts sit on different baselines than Latin and throw the chip off-center; use the native label only in the dropdown list).
4. Add a corresponding Tina collection in `tina/config.ts` named `pages<Capitalized>` pointing at `content/<locale>/pages`. Run `pnpm build` to regenerate the Tina client.
5. Delete `.manifest.json` and run `pnpm translate-content` to backfill.

## What NOT to translate

- **Table content**: column headers, row data, and filter labels in `Proposals.tsx` (and similar tables) are intentionally kept in English — they're dense, often reference proper nouns, and mixing locales in a table looks worse than a mono-locale table.
- **Proper nouns / brands**: Devcon, Ethereum, GitHub, Pretix, Pretalx, etc. When you write an intl key, just leave them untouched in the source JSON; the AI prompt already instructs the translator to leave brand names alone, but short strings like `"GITHUB"` should be identical across locales anyway.
- **URLs, email addresses, slugs, JSX tag names, attribute names, code blocks.** The translator prompts forbid translating these. If you see one translated incorrectly, reject the PR and the next run will retry.
- **Keys starting with `_`** (e.g. `_template`, `_id`) — Tina frontmatter metadata.

## Debugging a bad translation

1. Find the file in `content/<locale>/` that's off.
2. Fix it by hand OR delete it — the next Action run will regenerate from the English source.
3. If the issue is systemic (prompt rewriting content it shouldn't), edit the system prompt in `src/scripts/translate/translate-json.ts` or `translate-mdx.ts` and re-run.

## Gotchas

- **New Tina collections require a rebuild.** Adding `pagesHi` to `tina/config.ts` is a code change — it doesn't take effect until `pnpm build` (or `pnpm dev`) regenerates `tina/__generated__/client.ts`. Until then, `client.queries.pagesHi` is undefined and the locale-aware query silently falls back to English.
- **`getMessages` reads from disk at build time.** It's called in `getStaticProps`, not at runtime in the browser. Pages missing `getStaticProps` will have empty `messages` and `t()` calls will return the key name.
- **Manifest drift.** Hand-editing `content/hi/**` is fine, but the next translator run will overwrite your edits unless you update `.manifest.json` so the source hash matches (tells the pipeline the en file hasn't changed since the last run — which is true — so don't retranslate).
- **Locale routing.** Next.js handles `/hi/<page>` prefixing via `i18n` config; don't hand-prefix URLs.

## Related files

- Translator: `src/scripts/translate-content.ts` (+ `translate/*.ts`)
- Manifest: `content/.manifest.json`
- intl loader: `src/utils/intl.ts`
- Language toggle: `src/components/common/layouts/header/menu/language-toggle/LanguageToggle.tsx`
- Workflow: `../.github/workflows/devcon-translate.yml`
- Plan: `~/.claude/plans/okay-so-you-and-purrfect-elephant.md`
