import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from 'lib/components/ui/dialog'
import { toast } from 'lib/hooks/use-toast'
import { useCopyContext } from './provider'
import css from './modal.module.scss'

interface CopyModalProps {
  copyKey: string
  copyPath: string
  currentValue: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CopyModal({ copyKey, copyPath, currentValue, open, onOpenChange }: CopyModalProps) {
  const { saveCopy, registry } = useCopyContext()
  const isComplex = typeof currentValue === 'object'
  const [draft, setDraft] = useState(
    isComplex ? JSON.stringify(currentValue, null, 2) : String(currentValue)
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    let parsed: any = draft

    if (isComplex) {
      try {
        parsed = JSON.parse(draft)
      } catch {
        setError('Invalid JSON')
        return
      }
    }

    setError(null)
    setSaving(true)

    try {
      await saveCopy(copyKey, copyPath, parsed)
      toast({ title: 'Saved', description: `${copyKey}.${copyPath} updated` })
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

    setDraft(
      typeof defaultVal === 'object'
        ? JSON.stringify(defaultVal, null, 2)
        : String(defaultVal ?? '')
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className={css.header}>
          <DialogTitle>Edit Copy</DialogTitle>
          <DialogDescription>
            <span className={css.fieldLabel}>{copyKey} &rarr; {copyPath}</span>
          </DialogDescription>
        </DialogHeader>

        <div className={css.modalBody}>
          <textarea
            className={css.textarea}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
            }}
          />
          {error && <div className={css.error}>{error}</div>}
        </div>

        <div className={css.footer}>
          <button className={css.resetButton} onClick={handleReset} type="button">
            Reset to Default
          </button>
          <button className={css.saveButton} onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
