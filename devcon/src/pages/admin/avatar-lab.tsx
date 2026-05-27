import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Page from 'components/common/layouts/page'

// Seed prompt — Devcon-flavored adaptation of the luxury-liquid template the
// operator shared. Free to fully replace via the textarea.
const SEED_PROMPT = `Create a premium contemporary character identity artwork inspired by the Devcon 8 Mumbai mascot aesthetic — a quiet luxury fashion editorial fused with luminous Ethereum spirit art.

Feature the subject from the source photo in a clean, confident pose with strong silhouette clarity and natural movement. Keep the subject as the central focus, presented with a calm premium aesthetic and refined visual hierarchy.

IMPORTANT:
Do not redraw the subject's face. Same likeness, same proportions, same expression, same skin tone. Restyle the rendering around the face — never the facial geometry itself.

Do not create a symmetrical half-and-half split. Instead, introduce a controlled luminous transformation where parts of the outfit and surrounding silhouette gradually transition into flowing sculptural ribbons of light and liquid energy. The transformation should feel elegant, artistic, and premium — like frozen motion captured in a luxury editorial.

The transformation flows naturally across the subject rather than dividing them evenly. Let the luminous material emerge organically from selected areas of clothing, accessories, or aura — never replacing skin or face — while preserving the recognizable silhouette and identity.

The luminous material should feel like:
- iridescent lacquer in deep teal, cyan, and violet
- molten resin tinted with starlight
- reflective ribbons of glowing cyan light
- glossy pearl-coated fluid with soft purple highlights

Avoid:
- slime aesthetics
- horror melting
- destruction or chaotic dripping
- aggressive sci-fi effects
- redrawn faces, altered likeness, or skin recoloring

The flowing forms should appear smooth, sculptural, reflective, and controlled, with suspended droplets, ribbons, stretched surfaces, and subtle pools integrated elegantly into the composition.

Background: deep navy-indigo with subtle purple nebula tones, scattered stars, and soft teal/cyan particle glow — the world of the Devcon 8 Mumbai mascot. Generous negative space. Avoid pure white. Centered, square composition.

Optional restrained editorial inserts: small atmospheric close-ups of accessories, glowing material textures, or fabric — never analytical, never technical.

Understated plain-English labels in modern editorial typography are welcome, kept minimal.

Avoid:
- cluttered diagrams
- excessive callouts
- technical breakdown panels
- material analysis layouts
- floating exploded clothing parts
- combat imagery
- heavy sci-fi interfaces
- text-heavy overlays

The final artwork should feel like a fusion of:
- a luxury fashion campaign
- a Devcon 8 collectible art print
- a contemporary Ethereum design publication
- a high-end editorial poster

Minimal yet expressive.
Stylish yet quietly informative.
Artistic yet highly refined.`

type Quality = 'low' | 'medium' | 'high'

interface RunOutput {
  sourceFile: string
  outputFile: string | null
  error?: string
  sourceLabel: string
  durationMs: number
}

interface RunMeta {
  id: string
  createdAt: string
  model: 'openai'
  quality: Quality
  prompt: string
  label?: string
  outputs: RunOutput[]
}

interface Upload {
  name: string
  dataUrl: string
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function fileUrl(runId: string, name: string): string {
  return `/api/avatar-lab/files/${encodeURIComponent(runId)}/${encodeURIComponent(name)}/`
}

function PromptLab() {
  const [prompt, setPrompt] = useState<string>('')
  const [label, setLabel] = useState<string>('')
  const [quality, setQuality] = useState<Quality>('medium')
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<Upload[]>([])

  const [presets, setPresets] = useState<Record<string, string[]>>({})
  const [presetsErr, setPresetsErr] = useState<string>('')

  const [runs, setRuns] = useState<RunMeta[]>([])
  const [runsErr, setRunsErr] = useState<string>('')

  const [busy, setBusy] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('')

  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Restore from localStorage on first mount.
  useEffect(() => {
    setPrompt(localStorage.getItem('avatarLabPrompt') ?? SEED_PROMPT)
    setLabel(localStorage.getItem('avatarLabLabel') ?? '')
    setQuality((localStorage.getItem('avatarLabQuality') as Quality) ?? 'medium')
    try {
      const stored = JSON.parse(localStorage.getItem('avatarLabPresets') ?? '[]') as string[]
      setSelectedPresets(new Set(stored))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('avatarLabPrompt', prompt)
  }, [prompt])
  useEffect(() => {
    localStorage.setItem('avatarLabLabel', label)
  }, [label])
  useEffect(() => {
    localStorage.setItem('avatarLabQuality', quality)
  }, [quality])
  useEffect(() => {
    localStorage.setItem('avatarLabPresets', JSON.stringify([...selectedPresets]))
  }, [selectedPresets])

  const loadPresets = useCallback(async () => {
    setPresetsErr('')
    try {
      const res = await fetch('/api/avatar-lab/presets/')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setPresets(data.presets)
    } catch (err) {
      setPresetsErr((err as Error).message)
    }
  }, [])

  const loadRuns = useCallback(async () => {
    setRunsErr('')
    try {
      const res = await fetch('/api/avatar-lab/runs/')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setRuns(data.runs)
    } catch (err) {
      setRunsErr((err as Error).message)
    }
  }, [])

  useEffect(() => {
    loadPresets()
    loadRuns()
  }, [loadPresets, loadRuns])

  const togglePreset = (key: string) => {
    setSelectedPresets(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const onUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    if (uploadInputRef.current) uploadInputRef.current.value = ''
    const reads = await Promise.all(
      files.map(
        f =>
          new Promise<Upload>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve({ name: f.name, dataUrl: reader.result as string })
            reader.onerror = reject
            reader.readAsDataURL(f)
          }),
      ),
    )
    setUploads(prev => [...prev, ...reads])
  }

  const sourcesCount = selectedPresets.size + uploads.length

  const runBatch = async () => {
    if (prompt.trim().length < 10) {
      setStatus('Prompt is too short.')
      return
    }
    if (sourcesCount === 0) {
      setStatus('Pick at least one source image.')
      return
    }
    const sources: any[] = []
    for (const key of selectedPresets) {
      const [, payload] = key.split(':')
      const [dir, name] = payload.split('/')
      sources.push({ kind: 'preset', dir, name })
    }
    for (const u of uploads) {
      sources.push({ kind: 'upload', name: u.name, data: u.dataUrl })
    }

    setBusy(true)
    const startedAt = Date.now()
    const tick = setInterval(
      () => setStatus(`Generating ${sources.length} image(s)... ${Math.floor((Date.now() - startedAt) / 1000)}s`),
      1000,
    )
    try {
      const res = await fetch('/api/avatar-lab/runs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'openai', quality, label: label || undefined, sources }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setStatus(`Done in ${Math.floor((Date.now() - startedAt) / 1000)}s`)
      await loadRuns()
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      clearInterval(tick)
      setBusy(false)
    }
  }

  const reuseRun = (r: RunMeta) => {
    setPrompt(r.prompt)
    setLabel(r.label || '')
    setQuality(r.quality)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteRun = async (id: string) => {
    if (!window.confirm(`Delete run ${id}?`)) return
    try {
      await fetch(`/api/avatar-lab/runs/${encodeURIComponent(id)}/`, { method: 'DELETE' })
      await loadRuns()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-[#160b2b]">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Avatar Prompt Lab</h1>
        <p className="text-sm text-[#594d73] mt-1">
          Iterate on prompts against fixed source images. Each run is saved locally to{' '}
          <code className="text-[#160b2b] bg-[#f1eef9] px-1 rounded">avatar-lab-runs/</code>.
        </p>
      </header>

      <section className="bg-white border border-[rgba(34,17,68,0.08)] rounded-2xl p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Prompt</span>
              <textarea
                rows={20}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-[#fbfafc] border border-[#dddae2] rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:border-[#7235ed]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Label (optional)</span>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. liquid-v3 / brighter-glow"
                className="px-3 py-2 bg-[#fbfafc] border border-[#dddae2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#7235ed]"
              />
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Model</span>
              <select
                disabled
                className="px-3 py-2 bg-[#fbfafc] border border-[#dddae2] rounded-lg text-sm font-mono opacity-70"
              >
                <option>OpenAI gpt-image-1</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Quality</span>
              <select
                value={quality}
                onChange={e => setQuality(e.target.value as Quality)}
                className="px-3 py-2 bg-[#fbfafc] border border-[#dddae2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#7235ed]"
              >
                <option value="low">low — ~$0.01</option>
                <option value="medium">medium — ~$0.04</option>
                <option value="high">high — ~$0.17</option>
              </select>
            </label>
            <div className="bg-[#f9f8fa] border border-[#dddae2] rounded-lg p-3 text-xs text-[#594d73] leading-relaxed">
              <p className="font-bold text-[#160b2b] mb-1">Tip</p>
              Pick the sources once below, then iterate the prompt and re-run. The selection is remembered across reloads.
            </div>
            <button
              onClick={runBatch}
              disabled={busy || sourcesCount === 0}
              className="w-full px-4 py-3 bg-[#7235ed] hover:bg-[#6029d1] disabled:bg-[#dddae2] disabled:text-[#594d73] disabled:cursor-not-allowed transition text-white rounded-full text-sm font-bold"
            >
              {busy ? 'Running...' : `Run against ${sourcesCount} source${sourcesCount === 1 ? '' : 's'}`}
            </button>
            <p className="text-xs text-[#594d73] min-h-[1.25rem]">{status}</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-[#594d73] font-bold">Sources</h2>
          <label className="text-xs text-[#7235ed] hover:underline cursor-pointer flex items-center gap-2 font-bold">
            <span>Upload custom...</span>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onUploadChange}
              className="hidden"
            />
          </label>
        </div>

        {presetsErr && <p className="text-sm text-red-500 mb-3">{presetsErr}</p>}

        <div className="space-y-6">
          {Object.entries(presets).map(([dir, files]) => {
            if (!files.length) return null
            return (
              <div key={dir}>
                <h3 className="text-xs text-[#594d73] mb-2 font-mono">{dir}/</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {files.map(name => {
                    const key = `preset:${dir}/${name}`
                    const checked = selectedPresets.has(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePreset(key)}
                        className={`block rounded-lg overflow-hidden border-2 cursor-pointer aspect-square text-left transition ${
                          checked ? 'border-[#7235ed]' : 'border-transparent hover:border-[#dddae2]'
                        }`}
                      >
                        <img
                          src={`/avatar-lab-refs/${dir}/${name}`}
                          alt={name}
                          className="block w-full h-full object-cover"
                        />
                        <div className="px-2 py-1 bg-white text-[10px] text-[#594d73] truncate border-t border-[#dddae2]">
                          {name}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {uploads.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs text-[#594d73] mb-2 font-mono">uploads/ (not persisted across reloads)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {uploads.map((u, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden border-2 border-[#7235ed] aspect-square relative">
                  <img src={u.dataUrl} className="block w-full h-full object-cover" />
                  <button
                    onClick={() => setUploads(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded px-1.5 py-0.5 text-[10px]"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-white/95 text-[10px] text-[#594d73] truncate border-t border-[#dddae2]">
                    {u.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-wider text-[#594d73] font-bold">Runs</h2>
          <button onClick={loadRuns} className="text-xs text-[#7235ed] hover:underline font-bold">
            refresh
          </button>
        </div>
        {runsErr && <p className="text-sm text-red-500 mb-3">{runsErr}</p>}
        {runs.length === 0 ? (
          <p className="text-sm text-[#594d73]">No runs yet — fire the first one above.</p>
        ) : (
          <div className="space-y-8">
            {runs.map(r => (
              <RunCard key={r.id} run={r} onReuse={() => reuseRun(r)} onDelete={() => deleteRun(r.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RunCard({
  run,
  onReuse,
  onDelete,
}: {
  run: RunMeta
  onReuse: () => void
  onDelete: () => void
}) {
  return (
    <article className="bg-white border border-[rgba(34,17,68,0.08)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-bold text-[#160b2b]">{run.label || '(unlabeled)'}</span>
            <span className="text-[#594d73]">·</span>
            <span className="text-[#594d73]">
              {run.model} / {run.quality}
            </span>
            <span className="text-[#594d73]">·</span>
            <span className="text-[#594d73]">{fmtTime(run.createdAt)}</span>
          </div>
          <div className="text-[10px] text-[#594d73] font-mono mt-0.5">{run.id}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onReuse} className="text-xs text-[#7235ed] hover:underline font-bold">
            reuse prompt
          </button>
          <button onClick={onDelete} className="text-xs text-[#594d73] hover:text-red-500">
            delete
          </button>
        </div>
      </div>

      <details className="mb-3 bg-[#f9f8fa] border border-[#dddae2] rounded-lg px-3 py-2 text-xs">
        <summary className="text-[#594d73] cursor-pointer">prompt ({run.prompt.length} chars)</summary>
        <pre className="whitespace-pre-wrap text-[#160b2b] leading-relaxed mt-2 font-mono">{run.prompt}</pre>
      </details>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {run.outputs.map((o, i) => {
          const srcUrl = o.sourceFile ? fileUrl(run.id, o.sourceFile) : null
          const outUrl = o.outputFile ? fileUrl(run.id, o.outputFile) : null
          return (
            <div key={i} className="bg-[#fbfafc] border border-[#dddae2] rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {srcUrl ? (
                  <a href={srcUrl} target="_blank" rel="noreferrer">
                    <img src={srcUrl} className="block w-full aspect-square object-cover rounded" />
                  </a>
                ) : (
                  <div className="aspect-square rounded bg-[#dddae2]" />
                )}
                {outUrl ? (
                  <a href={outUrl} target="_blank" rel="noreferrer">
                    <img src={outUrl} className="block w-full aspect-square object-cover rounded" />
                  </a>
                ) : (
                  <div className="aspect-square rounded bg-red-50 border border-red-200 flex items-center justify-center text-[10px] text-red-600 text-center px-2">
                    failed
                  </div>
                )}
              </div>
              <div className="text-[10px] text-[#594d73] flex justify-between gap-2">
                <span className="truncate">{o.sourceLabel}</span>
                <span className="shrink-0">{(o.durationMs / 1000).toFixed(1)}s</span>
              </div>
              {o.error && <div className="mt-1 text-[10px] text-red-500">{o.error}</div>}
            </div>
          )
        })}
      </div>
    </article>
  )
}

// Dev-only: 404 on production builds so the lab never ships when the branch
// deploys. Local `pnpm dev` keeps it reachable.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

export default function AvatarLabPage() {
  return (
    <>
      <Head>
        <title>Avatar Prompt Lab</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Page>
        <PromptLab />
      </Page>
    </>
  )
}
