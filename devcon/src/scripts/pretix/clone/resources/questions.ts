import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'

// Minimal field set known to be accepted by the dev Pretix version
// (mirrors what `setup-questions.ts` sends, which is verified working).
// `dependency_question` and `items` are bound in the link phase, after all
// questions exist on the target.
const COPY_FIELDS = [
  'question',
  'help_text',
  'type',
  'required',
  'position',
  'ask_during_checkin',
  'hidden',
  'identifier',
] as const

// Question types that actually use the `options` field (single/multiple choice).
const CHOICE_TYPES = new Set(['C', 'M'])

function bodyOf(src: RawResource, forCreate: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of COPY_FIELDS) {
    if (!(k in src)) continue
    const v = src[k]
    // Skip nulls — Pretix 500s on some null fields that don't apply to the question type.
    // Defaults will fill in unset values on creation.
    if (v === null || v === undefined) continue
    out[k] = v
  }
  // Pretix accepts `options` on POST (create) but rejects them on PATCH —
  // updates require the nested /options/ endpoint, which we don't currently
  // walk. So include options only on creation.
  const type = src.type as string | undefined
  if (forCreate && type && CHOICE_TYPES.has(type)) {
    const opts = (src.options as Array<Record<string, unknown>> | undefined) ?? []
    out.options = opts.map((o) => ({
      identifier: o.identifier,
      answer: o.answer,
      position: o.position,
    }))
  }
  if (forCreate) {
    // Pretix requires `items` on the create payload (rebound for real in link phase).
    out.items = []
  }
  // dependency_question is bound in the link phase.
  return out
}

export async function applyQuestions(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.questions

  const existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/questions/'))
  const byIdent = new Map<string, RawResource>()
  for (const r of existing) {
    const ident = r.identifier as string | undefined
    if (ident) byIdent.set(ident, r)
  }

  for (const src of snapshot.questions) {
    const sourceId = String(src.id)
    const body = bodyOf(src, !map[sourceId] && !(src.identifier && byIdent.get(src.identifier as string)))
    if (map[sourceId]) {
      if (cli.dryRun) {
        console.log('[questions] DRY RUN: PATCH ' + map[sourceId])
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/questions/' + map[sourceId] + '/'), body)
      console.log('[questions] patched id=' + map[sourceId])
      continue
    }
    const ident = src.identifier as string | undefined
    const adopt = ident ? byIdent.get(ident) : undefined
    if (adopt) {
      map[sourceId] = adopt.id
      if (cli.dryRun) {
        console.log('[questions] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/questions/' + adopt.id + '/'), body)
      saveState(state)
      console.log('[questions] adopted+patched id=' + adopt.id)
      continue
    }
    if (cli.dryRun) {
      console.log('[questions] DRY RUN: POST new question ident=' + ident)
      continue
    }
    const created = await targetClient.post<RawResource>(targetClient.eventUrl('/questions/'), body)
    map[sourceId] = created.id
    saveState(state)
    console.log('[questions] created id=' + created.id + ' ident=' + ident)
  }
}

export async function linkQuestionsToItems(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  for (const src of snapshot.questions) {
    const targetId = state.ids.questions[String(src.id)]
    if (!targetId) continue
    const srcItems = (src.items as number[] | undefined) ?? []
    const targetItems: number[] = []
    for (const sid of srcItems) {
      const tid = state.ids.items[String(sid)]
      if (tid) targetItems.push(tid)
    }
    // Resolve dependency_question (intra-event FK to another question).
    const srcDep = src.dependency_question as number | null | undefined
    const depBody: Record<string, unknown> = { items: targetItems }
    if (srcDep != null) {
      const tDep = state.ids.questions[String(srcDep)]
      if (tDep) depBody.dependency_question = tDep
    }
    if (cli.dryRun) {
      console.log(
        '[questions.link] DRY RUN: PATCH ' +
          targetId +
          ' items=' +
          targetItems.length +
          (depBody.dependency_question ? ' dep=' + depBody.dependency_question : ''),
      )
    } else {
      await targetClient.patch(targetClient.eventUrl('/questions/' + targetId + '/'), depBody)
      console.log(
        '[questions.link] linked id=' +
          targetId +
          ' items=' +
          targetItems.length +
          (depBody.dependency_question ? ' dep=' + depBody.dependency_question : ''),
      )
    }
  }
}
