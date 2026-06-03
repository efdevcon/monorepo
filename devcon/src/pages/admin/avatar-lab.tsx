import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Page from 'components/common/layouts/page'
import { CircularAvatarPreview } from 'components/domain/avatar/CircularAvatarPreview'

// Seed prompt — Infinite-Garden + painterly-anime / Indian lunarpunk rendering
// style. Replaces the previous luxury-fashion framing entirely. Free to fully
// replace via the textarea; "reset to default" reloads from here.
const SEED_PROMPT = `Create a contemplative character portrait inspired by Ethereum's Infinite Garden — a quiet spiritual study fused with the luminous Devcon 8 Mumbai mascot aesthetic. The presentation should feel curated, considered, and restrained: closer to a sacred manuscript plate than a magazine spread.

RENDERING STYLE:
Painterly anime cinematic illustration. Soft brush textures, subtle grain, atmospheric lighting, volumetric glow. Soft edges, cinematic depth. Indian lunarpunk aesthetic — luminous, nocturnal, tech-nature symbiosis. NOT hyper-sharp. NOT photorealistic. NOT 3D-rendered. Visible brushwork is welcome.

Feature the subject from the source photo in a calm, grounded pose with strong silhouette clarity and a sense of unhurried presence. Keep the subject as the central focus, framed with the careful visual hierarchy of a devotional plate.

LIKENESS:
Preserve the subject's recognizable likeness, features, expression, age, hair shape, and skin tone — but reinterpreted as a painted anime character, not a photograph. They should be unmistakably the same person, illustrated. Don't change their identity; do paint them.

Do not create a symmetrical half-and-half split. Instead, let a slow, controlled bloom of luminous matter grow outward from selected areas of the outfit, accessories, or aura — as if the spirit of the garden is gently overflowing into the subject. The transformation should feel intentional and sacred, like a still moment caught mid-growth in a luminous grove.

The bloom flows organically rather than dividing the subject evenly. Let it emerge from clothing, accessories, or the air around them — never replacing the face — while preserving the recognizable silhouette and identity.

The luminous material should feel like:
- iridescent painted lacquer in deep indigo, violet, and teal
- bioluminescent sap tinted with starlight
- glowing cyan vines and tendrils of slow-flowing light
- magenta sparks and warm-gold filament highlights
- suspended petals, dewdrops, and ribbons of frozen painted light

ETHEREUM RESONANCE (subtle, latent):
Within the painted flora and luminous matter, hide one or two whispered echoes of Ethereum's diamond silhouette — two stacked pyramids forming an upright octahedron. A petal's facets might align into that shape; a dewdrop's inner reflection might cut into it; a glowing seed-pod or bud might echo the geometry. Treat it as form latent in nature, never as a logo. The diamond must read as part of the flora — petal, fruit, gem-like dew — not as branding or jewelry. If a viewer recognizes it as "the Ethereum icon" at a glance, you have gone too far. Subtle enough that it is noticed only on a second look.

Avoid:
- slime aesthetics
- horror melting
- chaotic dripping
- aggressive sci-fi effects
- photorealistic skin, hyper-sharp focus, or 3D/CGI rendering
- redrawn or altered identity
- explicit Ethereum logos, brand glyphs, or recognizable crypto iconography
- diamond shapes that read as cut jewelry, crystals, or repeated tessellation

The flowing forms should appear soft-edged, painted, glowing, and controlled — like vines, dewdrops, and ribbons suspended in a nocturnal sacred grove. Movement is slow and considered, never frantic. Light is volumetric and atmospheric.

Background: a luminous Indian lunarpunk Infinite Garden at twilight — deep indigo and violet skies, scattered stars, soft teal/cyan particle glow, occasional magenta sparks, warm-gold lantern highlights, and the faint suggestion of growing forms and bioluminescent flora in the distance. Generous negative space. Avoid pure white. Avoid pure black. Centered, square composition. Cinematic depth.

Optional restrained inserts: small atmospheric close-ups of painted glowing textures, organic surfaces, fragments of bloom, or quiet still-life details — painterly and contemplative, never technical, never analytical. These insets must also contain no text.

NO TEXT:
The final image must contain absolutely no text, words, letters, numbers, captions, labels, titles, headings, signatures, watermarks, logos, glyphs, or typography of any kind. No language, no calligraphy, no script, no symbols pretending to be text. The composition must be purely pictorial.

Avoid:
- any text, captions, labels, titles, or written language
- cluttered diagrams
- excessive callouts
- technical breakdown panels
- material analysis layouts
- floating exploded clothing parts
- combat imagery
- heavy sci-fi interfaces
- overt religious iconography or specific deities

The final artwork should feel like a fusion of:
- a painterly anime cinematic illustration
- a contemplative spiritual portrait
- an Indian lunarpunk plate
- a moment from Ethereum's Infinite Garden

Restrained yet luminous.
Devotional yet personal.
Painterly, not photographic.
Refined without being branded.
Wordless — no text, no captions, no titles, no typography of any kind.`

// Reference-driven variant for the image-reference approach. STYLE comes
// entirely from the reference artwork; the source photo is treated as a
// CHARACTER BRIEF (attributes, not exact face geometry) so the output is a
// fully-stylized illustrated character rather than a realistic face fighting
// the anime style. Pose is inherited from the source. The "don't copy the
// reference's pose/body" guard matters because the references are full-body
// character sheets (T-pose, multi-view) we do NOT want restaged.
const SEED_PROMPT_REFERENCE = `Design a character drawn in the EXACT art style and world of the provided reference artwork — as if illustrated by the same artist, for the same project. Fully commit to the reference's level of stylization: if the reference is anime/illustrated, the result must be genuinely anime/illustrated, NOT a realistic or photographic face. Match its medium, palette, line quality, linework, shading, and proportions closely.

USE THE SOURCE PHOTO AS A CHARACTER BRIEF, not a face to trace:
Do NOT preserve the photographic facial geometry or render a realistic likeness. Instead, capture the person's overall attributes — hairstyle and hair color, eye color, mouth and smile, skin tone, facial hair, approximate age, gender presentation, build, expression, and general vibe — and design a stylized character who clearly reads as "that kind of person," redrawn natively in the reference's style. A friend should say "that looks like them, as an anime character," not "that's a photo of them."

WARDROBE & ACCESSORIES from the reference:
Dress the character in clothing, fabrics, gear, and accessories drawn from the reference artwork — the same lunarpunk garments, layered textiles, tech-woven details, jewelry, and props — re-fitted naturally to the subject's pose and build. Replace the subject's original everyday clothes entirely with this wardrobe so they look outfitted for the same world. Adapt, don't paste: the garments should sit believably on this character, not be a cut-out of the reference.

POSE & FRAMING from the source:
Keep the subject's pose, posture, head angle, framing, and crop close to the source photo. Do NOT restage them into the reference character's pose or body.

STYLE & WORLD from the reference:
Place the character in the same luminous world the reference belongs to — Ethereum's Infinite Garden, a nocturnal Indian lunarpunk setting of deep indigo/violet light, soft teal/cyan glow, faint warm-gold highlights, and gentle bioluminescent flora — but let the reference dictate how that world is painted. A subtle glowing bloom may grow from the character's clothing or surrounding air. Avoid pure white and pure black backgrounds. Centered, square composition.

ETHEREUM RESONANCE (subtle, latent):
Optionally hide one whispered echo of Ethereum's diamond silhouette (an upright octahedron) in the flora or glow — latent in nature, never a logo, noticed only on a second look.

Avoid:
- realistic or photographic rendering of the face when the reference is stylized
- inventing a rendering style that departs from the reference artwork
- copying the reference character's specific face, hair, or pose onto the subject (wardrobe/accessories SHOULD be borrowed; face, hair, and pose should NOT)
- keeping the subject's original mundane street clothes
- explicit Ethereum logos, brand glyphs, or crypto iconography
- slime, horror melting, chaotic dripping, aggressive sci-fi effects
- combat imagery, overt religious iconography or specific deities

NO TEXT:
The final image must contain absolutely no text, words, letters, numbers, captions, labels, watermarks, logos, glyphs, or typography of any kind. Purely pictorial.

Same artist, same world as the reference. The person's attributes and pose, reimagined as a character in that style. Wordless.`

type Quality = 'auto' | 'low' | 'medium' | 'high'

// Only the plain (background-free) character sheets are used as style
// references — the busier `characters` set muddies the extraction.
const STYLE_REF_DIR = 'characters-plain'

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
  referenceCount?: number
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
  // No trailing slash: devcon's Next config 308s dot-extensioned segments back
  // to no-slash, and the round-trip can break <img> loads in some browsers.
  return `/api/avatar-lab/files/${encodeURIComponent(runId)}/${encodeURIComponent(name)}`
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

  // Reference artwork passed as image inputs to generation (style applied to
  // the target selfie). Separate from the text-extraction styleRefs.
  const [genRefs, setGenRefs] = useState<Set<string>>(new Set())

  // Style extractor — toggleable set of preset reference artworks.
  const [styleRefs, setStyleRefs] = useState<Set<string>>(new Set())
  const [styleRefsInit, setStyleRefsInit] = useState(false)
  const [styleResult, setStyleResult] = useState<string>('')
  const [styleBusy, setStyleBusy] = useState<boolean>(false)
  const [styleErr, setStyleErr] = useState<string>('')

  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Restore from localStorage on first mount.
  useEffect(() => {
    setPrompt(localStorage.getItem('avatarLabPrompt') ?? SEED_PROMPT)
    setLabel(localStorage.getItem('avatarLabLabel') ?? '')
    setQuality((localStorage.getItem('avatarLabQuality') as Quality) ?? 'auto')
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
  useEffect(() => {
    // Don't persist until the initial prefill has run, or we'd clobber the
    // stored selection with an empty set on first render.
    if (styleRefsInit) localStorage.setItem('avatarLabStyleRefs', JSON.stringify([...styleRefs]))
  }, [styleRefs, styleRefsInit])

  // Restore generation reference selection (defaults to none — opt-in).
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('avatarLabGenRefs') ?? '[]') as string[]
      setGenRefs(new Set(stored))
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem('avatarLabGenRefs', JSON.stringify([...genRefs]))
  }, [genRefs])

  const loadPresets = useCallback(async () => {
    setPresetsErr('')
    try {
      const res = await fetch('/api/avatar-lab/presets/')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setPresets(data.presets)

      // Prefill style references with every characters-plain preset (all
      // toggled on by default) unless the operator has a stored selection.
      // Prune any stored keys that aren't valid characters-plain refs (e.g.
      // stale `characters/` keys from before the extractor was restricted).
      const allKeys = (data.presets[STYLE_REF_DIR] ?? []).map((name: string) => `${STYLE_REF_DIR}/${name}`)
      const validKeys = new Set(allKeys)
      const stored = localStorage.getItem('avatarLabStyleRefs')
      let parsed: string[] | null = null
      if (stored) {
        try {
          parsed = JSON.parse(stored) as string[]
        } catch {
          parsed = null
        }
      }
      if (parsed) {
        setStyleRefs(new Set(parsed.filter(k => validKeys.has(k))))
      } else {
        setStyleRefs(new Set(allKeys))
      }
      setStyleRefsInit(true)
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

  const toggleStyleRef = (key: string) => {
    setStyleRefs(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const extractStyleFromRefs = async () => {
    if (styleRefs.size === 0) {
      setStyleErr('Select at least one reference.')
      return
    }
    const sources = [...styleRefs].map(key => {
      const [dir, name] = key.split('/')
      return { kind: 'preset', dir, name }
    })

    setStyleBusy(true)
    setStyleErr('')
    setStyleResult('')
    try {
      const res = await fetch('/api/avatar-lab/extract-style/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setStyleResult(data.style)
    } catch (err) {
      setStyleErr((err as Error).message)
    } finally {
      setStyleBusy(false)
    }
  }

  const appendStyleToPrompt = () => {
    if (!styleResult) return
    setPrompt(prev => `${prev.trimEnd()}\n\nEXTRACTED STYLE REFERENCE:\n${styleResult}`)
  }

  const toggleGenRef = (key: string) => {
    setGenRefs(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
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

    const references = [...genRefs].map(key => {
      const [dir, name] = key.split('/')
      return { kind: 'preset', dir, name }
    })

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
        body: JSON.stringify({ prompt, model: 'openai', quality, label: label || undefined, sources, references }),
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
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Prompt</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Load the style-agnostic reference prompt? Your current prompt will be replaced.')) {
                        setPrompt(SEED_PROMPT_REFERENCE)
                      }
                    }}
                    className="text-xs text-[#7235ed] hover:underline"
                    title="No rendering-style opinions — defers the look to your reference artwork"
                  >
                    load reference prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset the prompt to the current default seed? Your edits will be lost.')) {
                        setPrompt(SEED_PROMPT)
                      }
                    }}
                    className="text-xs text-[#7235ed] hover:underline"
                  >
                    reset to default
                  </button>
                </div>
              </div>
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
                <option>OpenAI gpt-image-2</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-[#594d73] font-bold">Quality</span>
              <select
                value={quality}
                onChange={e => setQuality(e.target.value as Quality)}
                className="px-3 py-2 bg-[#fbfafc] border border-[#dddae2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#7235ed]"
              >
                <option value="auto">auto (model picks)</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high — may 60s-timeout</option>
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

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-[#594d73] font-bold">Style extractor</h2>
          <button
            type="button"
            onClick={extractStyleFromRefs}
            disabled={styleBusy || styleRefs.size === 0}
            className="px-3 py-1.5 bg-[#7235ed] hover:bg-[#6029d1] disabled:bg-[#dddae2] disabled:text-[#594d73] text-white rounded-full text-xs font-bold transition"
          >
            {styleBusy ? 'Analyzing...' : `Extract style from ${styleRefs.size} reference${styleRefs.size === 1 ? '' : 's'}`}
          </button>
        </div>
        <p className="text-xs text-[#594d73] mb-3">
          Toggle the reference artworks to draw style from. A vision model distills their shared style (palette,
          brushwork, light, mood) into prompt-ready clauses — the images themselves are never fed to the generator,
          so results stay consistent.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(presets[STYLE_REF_DIR] ?? []).map(name => {
            const key = `${STYLE_REF_DIR}/${name}`
            const on = styleRefs.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStyleRef(key)}
                aria-pressed={on}
                className={`relative block rounded-lg overflow-hidden cursor-pointer aspect-square text-left transition-all duration-150 ${
                  on
                    ? 'ring-2 ring-[#7235ed] ring-offset-2 ring-offset-white shadow-[0_0_16px_rgba(114,53,237,0.45)] scale-[1.02]'
                    : 'ring-1 ring-[#dddae2] opacity-45 hover:opacity-80 grayscale'
                }`}
              >
                <img
                  src={`/avatar-lab-refs/${STYLE_REF_DIR}/${name}`}
                  alt={name}
                  className="block w-full h-full object-cover"
                />
                {/* Selected badge */}
                {on && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#7235ed] text-white text-[11px] font-bold flex items-center justify-center shadow">
                    ✓
                  </span>
                )}
                <div
                  className={`px-2 py-1 text-[10px] truncate border-t ${
                    on ? 'bg-[#7235ed] text-white border-[#7235ed] font-semibold' : 'bg-white text-[#594d73] border-[#dddae2]'
                  }`}
                >
                  {name}
                </div>
              </button>
            )
          })}
        </div>

        {styleErr && <p className="text-sm text-red-500 mb-2">{styleErr}</p>}
        {styleResult && (
          <div className="bg-[#f9f8fa] border border-[#dddae2] rounded-lg p-3 mt-2">
            <textarea
              readOnly
              rows={8}
              value={styleResult}
              className="w-full px-3 py-2 bg-white border border-[#dddae2] rounded-lg text-xs font-mono leading-relaxed focus:outline-none"
            />
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={appendStyleToPrompt}
                className="px-3 py-1.5 bg-[#7235ed] hover:bg-[#6029d1] text-white rounded-full text-xs font-bold transition"
              >
                Append to prompt
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(styleResult)}
                className="text-xs text-[#7235ed] hover:underline font-bold"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-[#594d73] font-bold">
            Reference artwork (style){genRefs.size > 0 ? ` · ${genRefs.size} on` : ''}
          </h2>
        </div>
        <p className="text-xs text-[#594d73] mb-3">
          Optional. Selected artworks are passed to the generator <span className="font-semibold">as image inputs</span>{' '}
          alongside each target — the model applies their style while preserving the target&apos;s likeness. (This is the
          image-reference approach; the Style extractor above is the text approach. Use one or the other.)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(presets[STYLE_REF_DIR] ?? []).map(name => {
            const key = `${STYLE_REF_DIR}/${name}`
            const on = genRefs.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleGenRef(key)}
                aria-pressed={on}
                className={`relative block rounded-lg overflow-hidden cursor-pointer aspect-square text-left transition-all duration-150 ${
                  on
                    ? 'ring-2 ring-[#7235ed] ring-offset-2 ring-offset-white shadow-[0_0_16px_rgba(114,53,237,0.45)] scale-[1.02]'
                    : 'ring-1 ring-[#dddae2] opacity-45 hover:opacity-80 grayscale'
                }`}
              >
                <img src={`/avatar-lab-refs/${STYLE_REF_DIR}/${name}`} alt={name} className="block w-full h-full object-cover" />
                {on && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#7235ed] text-white text-[11px] font-bold flex items-center justify-center shadow">
                    ✓
                  </span>
                )}
                <div
                  className={`px-2 py-1 text-[10px] truncate border-t ${
                    on ? 'bg-[#7235ed] text-white border-[#7235ed] font-semibold' : 'bg-white text-[#594d73] border-[#dddae2]'
                  }`}
                >
                  {name}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-[#594d73] font-bold">Sources (target)</h2>
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
                        aria-pressed={checked}
                        className={`relative block rounded-lg overflow-hidden cursor-pointer aspect-square text-left transition-all duration-150 ${
                          checked
                            ? 'ring-2 ring-[#7235ed] ring-offset-2 ring-offset-white shadow-[0_0_16px_rgba(114,53,237,0.45)] scale-[1.02]'
                            : 'ring-1 ring-[#dddae2] opacity-45 hover:opacity-80 grayscale'
                        }`}
                      >
                        <img
                          src={`/avatar-lab-refs/${dir}/${name}`}
                          alt={name}
                          className="block w-full h-full object-cover"
                        />
                        {checked && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#7235ed] text-white text-[11px] font-bold flex items-center justify-center shadow">
                            ✓
                          </span>
                        )}
                        <div
                          className={`px-2 py-1 text-[10px] truncate border-t ${
                            checked
                              ? 'bg-[#7235ed] text-white border-[#7235ed] font-semibold'
                              : 'bg-white text-[#594d73] border-[#dddae2]'
                          }`}
                        >
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
            {run.referenceCount ? (
              <>
                <span className="text-[#594d73]">·</span>
                <span className="text-[#7235ed] font-semibold">{run.referenceCount} style ref{run.referenceCount === 1 ? '' : 's'}</span>
              </>
            ) : null}
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

              {outUrl && (
                // Avatar-style preview: circular crop with brand gradient ring
                // + curved DEVCON/MUMBAI wordmark. Same component used by the
                // production /avatar page.
                <CircularAvatarPreview
                  src={outUrl}
                  href={outUrl}
                  id={`${run.id}-${i}`}
                  className="flex justify-center mb-2"
                />
              )}

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
