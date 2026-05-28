import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs/promises'
import path from 'path'
import {
  RUNS_DIR,
  RunMeta,
  RunOutput,
  Source,
  generateImage,
  isLabEnabled,
  newRunId,
  resolveSource,
  safeSlug,
} from 'services/avatar-lab'

export const config = {
  api: {
    bodyParser: { sizeLimit: '30mb' },
    responseLimit: false,
  },
  // OpenAI image generation can take ~30s per source; allow 5 minutes for a batch.
  maxDuration: 300,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isLabEnabled()) return res.status(404).json({ success: false, error: 'Not found' })

  if (req.method === 'GET') {
    try {
      const entries = await fs.readdir(RUNS_DIR)
      const runs = (
        await Promise.all(
          entries.map(async id => {
            try {
              const raw = await fs.readFile(path.join(RUNS_DIR, id, 'meta.json'), 'utf8')
              const meta = JSON.parse(raw) as RunMeta
              return { id, ...meta }
            } catch {
              return null
            }
          }),
        )
      ).filter(Boolean) as Array<{ id: string } & RunMeta>
      runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return res.status(200).json({ success: true, runs })
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'GET, POST').end()
  }

  const { prompt, model = 'openai', quality = 'auto', sources, label } = req.body ?? {}
  if (typeof prompt !== 'string' || prompt.length < 10) {
    return res.status(400).json({ success: false, error: 'prompt is required (min 10 chars)' })
  }
  if (model !== 'openai') {
    return res.status(400).json({ success: false, error: `Unsupported model: ${model}` })
  }
  if (!['auto', 'low', 'medium', 'high'].includes(quality)) {
    return res.status(400).json({ success: false, error: 'quality must be auto|low|medium|high' })
  }
  if (!Array.isArray(sources) || sources.length === 0 || sources.length > 8) {
    return res.status(400).json({ success: false, error: 'sources must be 1-8 entries' })
  }

  const runId = newRunId()
  const runDir = path.join(RUNS_DIR, runId)
  await fs.mkdir(runDir, { recursive: true })

  console.log(
    `[avatar-lab] run ${runId} starting — model=${model} quality=${quality} sources=${sources.length}`,
  )

  const outputs: RunOutput[] = await Promise.all(
    (sources as Source[]).map(async (src, i) => {
      const t0 = Date.now()
      let resolved
      try {
        resolved = await resolveSource(src)
      } catch (err) {
        return {
          sourceFile: '',
          outputFile: null,
          sourceLabel: src.kind === 'preset' ? `${src.dir}/${src.name}` : src.name,
          error: (err as Error).message,
          durationMs: Date.now() - t0,
        }
      }

      const slug = safeSlug(resolved.label)
      const ext = resolved.mime.split('/')[1] || 'png'
      const sourceFilename = `source-${i}-${slug}.${ext}`
      const outputFilename = `output-${i}-${slug.replace(/\.[^.]+$/, '')}.png`

      await fs.writeFile(path.join(runDir, sourceFilename), Buffer.from(resolved.base64, 'base64'))

      try {
        const outBuf = await generateImage(model, resolved.base64, resolved.mime, prompt, quality)
        await fs.writeFile(path.join(runDir, outputFilename), outBuf)
        return {
          sourceFile: sourceFilename,
          outputFile: outputFilename,
          sourceLabel: resolved.label,
          durationMs: Date.now() - t0,
        }
      } catch (err) {
        console.error(`[avatar-lab] ${runId} source ${i} failed:`, (err as Error).message)
        return {
          sourceFile: sourceFilename,
          outputFile: null,
          sourceLabel: resolved.label,
          error: (err as Error).message || 'Generation failed',
          durationMs: Date.now() - t0,
        }
      }
    }),
  )

  const meta: RunMeta = {
    createdAt: new Date().toISOString(),
    model,
    quality,
    prompt,
    label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
    outputs,
  }
  await fs.writeFile(path.join(runDir, 'meta.json'), JSON.stringify(meta, null, 2))

  console.log(
    `[avatar-lab] run ${runId} done — ${outputs.filter(o => o.outputFile).length}/${outputs.length} succeeded`,
  )
  return res.status(200).json({ success: true, id: runId, ...meta })
}
