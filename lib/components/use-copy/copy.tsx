import React, { useState } from 'react'
import { useCopyContext } from './provider'
import { CopyModal } from './modal'
import css from './copy.module.scss'

interface CopyProps {
  field: any
  children: React.ReactNode
  className?: string
}

export function Copy({ field, children, className }: CopyProps) {
  const { config, editMode, showOutlines, registry } = useCopyContext()
  const [modalOpen, setModalOpen] = useState(false)

  const value = String(field)
  const resolvedKey: string | undefined = field?.__copyKey
  const path: string | undefined = field?.__copyPath

  const childArray = React.Children.toArray(children)
  const child =
    childArray.length === 1 && React.isValidElement(childArray[0])
      ? (childArray[0] as React.ReactElement<any>)
      : null

  // Production or untagged: just inject value as children
  if (!config.devMode || !resolvedKey || !path) {
    if (child) return React.cloneElement(child, {}, value)
    return <>{value}</>
  }

  const handleClick = (e: React.MouseEvent) => {
    if (editMode) {
      e.preventDefault()
      e.stopPropagation()
      setModalOpen(true)
    }
  }

  const modal = modalOpen ? (
    <CopyModal
      copyKey={resolvedKey}
      copyPath={path}
      currentValue={value}
      open={modalOpen}
      onOpenChange={setModalOpen}
    />
  ) : null

  if (child) {
    // Native DOM elements — inject props + value directly via cloneElement
    if (typeof child.type === 'string') {
      const editClasses = [
        editMode ? css.editable : '',
        showOutlines ? css.showOutlines : '',
        child.props.className,
        className,
      ].filter(Boolean).join(' ')

      const enhanced = React.cloneElement(
        child,
        {
          className: editClasses,
          onClick: (e: React.MouseEvent) => {
            handleClick(e)
            child.props.onClick?.(e)
          },
          'data-copy-key': resolvedKey,
          'data-copy-path': path,
        },
        value
      )

      return <>{enhanced}{modal}</>
    }

    // React components (Markdown, etc.) — display:contents wrapper
    const contentsClasses = [
      editMode ? css.editableContents : '',
      showOutlines ? css.showOutlinesContents : '',
      className,
    ].filter(Boolean).join(' ')

    return (
      <>
        <div
          className={contentsClasses || undefined}
          onClick={handleClick}
          data-copy-key={resolvedKey}
          data-copy-path={path}
          style={{ display: 'contents' }}
        >
          {React.cloneElement(child, {}, value)}
        </div>
        {modal}
      </>
    )
  }

  // Fallback for no child element
  const editClasses = [
    editMode ? css.editable : '',
    showOutlines ? css.showOutlines : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <>
      <span
        className={editClasses}
        onClick={handleClick}
        data-copy-key={resolvedKey}
        data-copy-path={path}
      >
        {value}
      </span>
      {modal}
    </>
  )
}
