import React, { useState, useEffect, useRef } from 'react'
import { useCopyContext } from './provider'
import css from './modal.module.scss'

interface CopyModalProps {
  copyKey: string
  copyPath: string
  currentValue: any
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef?: React.RefObject<HTMLElement | null>
}

export function CopyModal({ copyKey, copyPath, currentValue, open, onOpenChange, anchorRef }: CopyModalProps) {
  const { previewCopy, saveCopy, registry } = useCopyContext()
  const originalValue = useRef(currentValue)
  const [draft, setDraft] = useState(String(currentValue))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Store original on open
  useEffect(() => {
    if (open) {
      originalValue.current = currentValue
      setDraft(String(currentValue))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live preview on draft change
  useEffect(() => {
    if (open && draft !== String(originalValue.current)) {
      previewCopy(copyKey, copyPath, draft)
    }
  }, [draft, open, copyKey, copyPath, previewCopy])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    // Delay to avoid catching the opening click
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    // Revert to original value
    previewCopy(copyKey, copyPath, originalValue.current)
    onOpenChange(false)
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    try {
      await saveCopy(copyKey, copyPath, draft)
      originalValue.current = draft
      onOpenChange(false)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const entry = registry.get(copyKey)
    if (!entry) return

    const keys = copyPath.split('.')
    let defaultVal: any = entry.defaults
    for (const k of keys) {
      defaultVal = defaultVal?.[k]
    }

    setDraft(String(defaultVal ?? ''))
  }

  if (!open) return null

  const isDirty = draft !== String(originalValue.current)

  return (
    <div className={css.panel} ref={panelRef}>
      <div className={css.header}>
        <div>
          <div className={css.title}>Edit Copy</div>
          <div className={css.fieldLabel}>{copyKey} &rarr; {copyPath}</div>
        </div>
        <button className={css.closeButton} onClick={handleClose} type="button">
          &times;
        </button>
      </div>

      <div className={css.body}>
        <textarea
          className={css.textarea}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          autoFocus
          spellCheck={false}
        />
        {error && <div className={css.error}>{error}</div>}
      </div>

      <div className={css.footer}>
        <button className={css.resetButton} onClick={handleReset} type="button">
          Reset
        </button>
        <div className={css.footerRight}>
          <button className={css.cancelButton} onClick={handleClose} type="button">
            Cancel
          </button>
          <button className={css.saveButton} onClick={handleSave} disabled={saving || !isDirty} type="button">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
