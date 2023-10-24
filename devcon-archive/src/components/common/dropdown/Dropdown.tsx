import React, { createRef, useEffect, useState } from 'react'
import css from './dropdown.module.scss'
// import IconArrowDropdown from 'src/assets/icons/arrow_drop_down.svg'
import ChevronDown from 'src/assets/icons/arrow_desc.svg'
import ChevronUp from 'src/assets/icons/arrow_asc.svg'

export interface DropdownProps {
  value: any
  className?: string
  customIcon?: React.ElementType<SVGAElement>
  onChange: (value: any) => void
  options: {
    [key: string]: any
  }[]
}

export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = createRef<HTMLDivElement>()
  const foldoutRef = createRef<HTMLUListElement>()
  const currentSelection = props.options.find(option => option.value === props.value)

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref, open])

  let className = `${css['container']}`
  if (props.className) className += ` ${props.className}`
  let foldoutClassName = css['dropdown']
  if (open) foldoutClassName += ` ${css['open']}`

  const Icon = (() => {
    // Used by e.g. Filter
    if (props.customIcon) return props.customIcon

    if (open) {
      return ChevronUp
    } else {
      return ChevronDown
    }
  })()

  return (
    <div role="button" onClick={() => setOpen(!open)} aria-label="Toggle dropdown" className={className} ref={ref}>
      {currentSelection && currentSelection.text}
      {/* <span className={css['icon']}> */}
      <Icon />
      {/* </span> */}

      <ul className={foldoutClassName} ref={foldoutRef} onClick={e => e.stopPropagation()}>
        {props.options.map(({ text, value }) => {
          const selected = value === props.value

          return (
            <li
              key={value}
              onClick={() => {
                props.onChange(value)

                setOpen(false)
              }}
            >
              <span className={selected ? css['active-filter'] : undefined}>{text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
