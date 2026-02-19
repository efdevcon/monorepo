import React, { useState } from 'react'
import { useCopyContext } from './provider'
import css from './overview.module.scss'

// Collect all leaf paths from an object: { hero: { title: "x" } } → [["hero","title","x"]]
function leafPaths(obj: any, prefix: string[] = []): Array<{ path: string; value: any }> {
  const results: Array<{ path: string; value: any }> = []
  for (const [k, v] of Object.entries(obj)) {
    const p = [...prefix, k]
    if (typeof v === 'object' && v !== null) {
      results.push(...leafPaths(v, p))
    } else {
      results.push({ path: p.join('.'), value: v })
    }
  }
  return results
}

function EntryRow({ entryKey, resolved }: { entryKey: string; resolved: Record<string, any> }) {
  const { saveCopy } = useCopyContext()
  const [dataOpen, setDataOpen] = useState(false)
  const [draft, setDraft] = useState(() => JSON.stringify(resolved, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fieldCount = Object.keys(resolved).length

  const currentJson = JSON.stringify(resolved, null, 2)
  const isDirty = draft !== currentJson

  const scrollToField = () => {
    const el = document.querySelector(`[data-copy-key="${entryKey}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSave = async () => {
    let parsed: any
    try {
      parsed = JSON.parse(draft)
    } catch {
      setError('Invalid JSON')
      return
    }

    setError(null)
    setSaving(true)

    try {
      // Save each leaf that changed
      const oldLeaves = leafPaths(resolved)
      const newLeaves = leafPaths(parsed)
      const newMap = new Map(newLeaves.map(l => [l.path, l.value]))

      for (const { path, value } of oldLeaves) {
        const newVal = newMap.get(path)
        if (newVal !== value) {
          await saveCopy(entryKey, path, newVal)
        }
      }
      // Handle new paths that didn't exist before
      const oldPaths = new Set(oldLeaves.map(l => l.path))
      for (const { path, value } of newLeaves) {
        if (!oldPaths.has(path)) {
          await saveCopy(entryKey, path, value)
        }
      }

      setError(null)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={css.entry}>
      <div
        className={css.entryHeader}
        onClick={() => {
          if (!dataOpen) setDraft(JSON.stringify(resolved, null, 2))
          setDataOpen(!dataOpen)
          setError(null)
        }}
      >
        <div className={css.entryInfo}>
          <h4>{entryKey}</h4>
          <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
        </div>
        <span className={`${css.dataArrow} ${dataOpen ? css.dataArrowOpen : ''}`}>&#9654;</span>
      </div>
      {dataOpen && (
        <div className={css.dataEditor}>
          <textarea
            className={css.dataTextarea}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null) }}
            spellCheck={false}
          />
          {error && <div className={css.dataError}>{error}</div>}
          {isDirty && (
            <button
              className={css.dataSave}
              onClick={handleSave}
              disabled={saving}
              type="button"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function CopyOverview() {
  const { config, setEditMode, showOutlines, setShowOutlines, registry } = useCopyContext()
  const [panelOpen, setPanelOpen] = useState(false)

  if (!config.devMode) return null

  const entries = Array.from(registry.entries())

  const togglePanel = () => {
    const opening = !panelOpen
    setPanelOpen(opening)

    if (opening) {
      setEditMode(true)
      setShowOutlines(true)
    } else {
      setEditMode(false)
      setShowOutlines(false)
    }
  }

  return (
    <>
      <button
        className={css.trigger}
        onClick={togglePanel}
        title="Copy Overview"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {panelOpen && (
        <div className={css.panel}>
          <div className={css.panelHeader}>
            <h3>Copy Instances</h3>
            <button
              className={`${css.toggleButton} ${showOutlines ? css.active : ''}`}
              onClick={() => setShowOutlines(!showOutlines)}
              type="button"
            >
              Outlines
            </button>
          </div>

          <div className={css.panelBody}>
            {entries.length === 0 ? (
              <div className={css.empty}>No useCopy instances on this page</div>
            ) : (
              entries.map(([key, entry]) => (
                <EntryRow key={key} entryKey={key} resolved={entry.resolved} />
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
