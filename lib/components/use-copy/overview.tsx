import React, { useState } from 'react'
import { useCopyContext } from './provider'
import css from './overview.module.scss'

export function CopyOverview() {
  const { config, editMode, setEditMode, registry } = useCopyContext()
  const [panelOpen, setPanelOpen] = useState(false)

  if (!config.devMode) return null

  const entries = Array.from(registry.entries())

  const scrollToField = (key: string) => {
    const el = document.querySelector(`[data-copy-key="${key}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <>
      <button
        className={css.trigger}
        onClick={() => setPanelOpen(!panelOpen)}
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
              className={`${css.toggleButton} ${editMode ? css.active : ''}`}
              onClick={() => setEditMode(!editMode)}
              type="button"
            >
              {editMode ? 'Editing' : 'Edit Mode'}
            </button>
          </div>

          <div className={css.panelBody}>
            {entries.length === 0 ? (
              <div className={css.empty}>No useCopy instances on this page</div>
            ) : (
              entries.map(([key, entry]) => {
                const fieldCount = Object.keys(entry.resolved).length

                return (
                  <div key={key} className={css.entry} onClick={() => scrollToField(key)}>
                    <div className={css.entryInfo}>
                      <h4>{key}</h4>
                      <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                    </div>
                    <button
                      className={css.entryAction}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditMode(true)
                        scrollToField(key)
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </>
  )
}
