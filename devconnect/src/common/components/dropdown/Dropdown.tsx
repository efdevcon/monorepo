import React, { useEffect, useState } from 'react'
import css from './dropdown.module.scss'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'

export interface DropdownProps {
  value: any
  className?: string
  customIcon?: React.ElementType<SVGAElement>
  renderCustomTrigger?: (foldout: any, defaultTriggerProps: any) => React.ReactElement
  onChange: (value: any) => void
  placeholder?: string
  pushFromLeft?: boolean
  options: {
    [key: string]: any
  }[]
}

const Dropdown = React.forwardRef((props: DropdownProps, externalRef: any) => {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)
  const foldoutRef = React.useRef<HTMLUListElement | null>(null)
  const currentSelection = props.options.find(option => option.value === props.value)

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [ref, open])

  let className = `${css['container']}`
  if (props.className) className += ` ${props.className}`

  // if (props.value) className += ` ${css['clearable']}`

  let foldoutClassName = css['dropdown']
  if (open) foldoutClassName += ` ${css['open']}`
  if (props.pushFromLeft) foldoutClassName += ` ${css['push-from-left']}`

  const Icon = (() => {
    // Used by e.g. Filter
    if (props.customIcon) return props.customIcon

    if (open) {
      return ChevronUp
    } else {
      return ChevronDown
    }
  })()

  const triggerProps = {
    role: 'button',
    onClick: () => setOpen(!open),
    'aria-label': 'Toggle dropdown',
    className,
    ref: (el: any) => {
      ref.current = el

      if (externalRef) externalRef.current = el
    },
  }

  const foldoutContent = (
    <ul className={foldoutClassName} ref={foldoutRef} onClick={e => e.stopPropagation()}>
      <li
        onClick={() => {
          const closeDropdown = () => setOpen(false)

          props.onChange(undefined)

          closeDropdown()
        }}
      >
        Any
      </li>

      {props.options.map(({ text, value, onClick }) => {
        const selected = value === props.value

        return (
          <li
            key={value}
            onClick={() => {
              const closeDropdown = () => setOpen(false)

              if (onClick) {
                onClick(closeDropdown)
              } else {
                props.onChange(value)

                closeDropdown()
              }
            }}
          >
            <span className={selected ? css['active-filter'] : undefined}>{text}</span>
          </li>
        )
      })}
    </ul>
  )

  if (props.renderCustomTrigger) {
    return props.renderCustomTrigger(triggerProps, foldoutContent)
  }

  return (
    <div {...triggerProps}>
      {currentSelection ? (
        <p className="bold">{currentSelection.text}</p>
      ) : (
        <p className={`${css['placeholder']}`}>{props.placeholder}</p>
      )}
      <Icon />

      {foldoutContent}
    </div>
  )
})

Dropdown.displayName = 'Dropdown'

export default Dropdown
