import React, { useState } from 'react'
import { CopyValue, isCopyValue } from './types'
import { useCopyContext } from './provider'
import { CopyModal } from './modal'
import css from './copy.module.scss'

interface CopyProps {
  field: CopyValue
  children?: React.ReactNode
  className?: string
}

export function Copy({ field, children, className }: CopyProps) {
  const { config, editMode } = useCopyContext()
  const [modalOpen, setModalOpen] = useState(false)

  if (!isCopyValue(field)) {
    return <span className={className}>{children ?? String(field)}</span>
  }

  if (!config.devMode) {
    return <span className={className}>{children ?? field.toString()}</span>
  }

  const wrapperClass = [
    css.copyWrapper,
    css.editable,
    editMode ? css.editMode : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <>
      <span
        className={wrapperClass}
        onClick={(e) => {
          if (editMode) {
            e.preventDefault()
            e.stopPropagation()
            setModalOpen(true)
          }
        }}
        data-copy-key={field.__copyKey}
        data-copy-path={field.__copyPath}
      >
        {children ?? field.toString()}
        {editMode && (
          <span className={css.editIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </span>
        )}
      </span>

      {modalOpen && (
        <CopyModal
          copyKey={field.__copyKey}
          copyPath={field.__copyPath}
          currentValue={field.value}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  )
}
