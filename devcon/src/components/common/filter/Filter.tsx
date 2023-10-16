import React from 'react'
import css from './filter.module.scss'
import { Dropdown } from 'components/common/dropdown'
import IconCheck from 'assets/icons/check_circle.svg'
import IconPlus from 'assets/icons/plus.svg'
import IconClose from 'assets/icons/cross.svg'
import { InputForm } from 'components/common/input-form'
import IconSearch from 'assets/icons/search.svg'
import IconFilter from 'assets/icons/filter.svg'
import { ScrollGradient } from '../scroll-gradient'
import useDimensions from 'react-cool-dimensions'

export type FilterOptions = {
  tags?: boolean
  basic?: boolean
  multiSelect?: boolean
  initialFilter?: any
  filters: {
    text: string
    value: any
    count?: number
  }[]
  filterFunction: (currentFilter?: string) => any[]
}

type FilterState = {
  collapsed?: boolean
  basic?: boolean
  neverCollapse?: boolean
  tags?: boolean
  options: FilterOptions
  activeFilter: string
  setActiveFilter: (value: string) => void
  clearFilter: () => void
}
// Don't use this anymore, it's too unwieldy. TODO: Deprecate existing uses of it.
export const useFilter = (options: FilterOptions | undefined) => {
  const defaultValue = options?.filters[0]?.value ?? ''
  const [activeFilter, setActiveFilter] = React.useState(options?.initialFilter || defaultValue)
  // Some filters use multiselect
  const [activeFilterMulti, setActiveFilterMulti] = React.useState(
    (options?.initialFilter || {}) as { [key: string]: any }
  )

  if (!options) return [[], null] as [any[], any]

  const wrappedSetActiveFilter = (value: string | any, setExact?: false) => {
    if (options.multiSelect) {
      if (setExact) return setActiveFilterMulti(value)

      const nextActiveFilter: any = {
        ...activeFilterMulti,
        [value]: true,
      } as { [key: string]: any }

      const selected = activeFilterMulti[value]

      if (selected) delete nextActiveFilter[value]

      setActiveFilterMulti(nextActiveFilter)
    } else {
      setActiveFilter(value)
    }
  }

  const filterState: FilterState = {
    options,
    activeFilter: options.multiSelect ? activeFilterMulti : activeFilter,
    clearFilter: () => {
      if (options.multiSelect) {
        setActiveFilterMulti({})
      } else {
        setActiveFilter(defaultValue)
      }
    },
    setActiveFilter: wrappedSetActiveFilter,
  }

  const filteredData = options.filterFunction(filterState.activeFilter)

  return [filteredData, filterState] as [any[], FilterState]
}

// Don't use this anymore, it's too unwieldy. TODO: Deprecate existing uses of it.
export const Filter = (props: FilterState) => {
  if (props.options.tags) {
    return (
      <div className={css['tags']} data-type="filter">
        {props.options.filters.map(filter => {
          let className = `${css['tag']} label label-hover white plain`

          const active = props.activeFilter === filter.value || props.activeFilter?.[filter.value]

          if (active) className += ` ${css['active']} black`

          return (
            <button key={filter.value} onClick={() => props.setActiveFilter(filter.value)} className={className}>
              <div className={css['icons']}>
                <IconCheck className={`icon ${css['icon-check']}`} />
                <IconPlus className={`icon ${css['icon-plus']}`} />
              </div>
              <span>{filter.text}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (props.options.basic) {
    return (
      <div className={css['basic']}>
        {props.options.filters.map(filter => {
          const selected = props.activeFilter === filter.value

          let className = 'plain'

          if (selected) className += ` ${css['selected']}`

          return (
            <button onClick={() => props.setActiveFilter(filter.value)} key={filter.value} className={className}>
              <p>{filter.text}</p>
              {filter.count && <div className="label sm error">4</div>}
            </button>
          )
        })}
      </div>
    )
  }

  let className = css['filter']

  if (props.collapsed) className += ` ${css['collapsed']}`
  if (props.options.multiSelect) className += ` ${css['never-collapse']}`

  return (
    <div className={className} data-type="filter">
      <Dropdown
        className={css['dropdown']}
        customIcon={IconFilter}
        options={props.options.filters}
        value={props.activeFilter}
        onChange={nextValue => props.setActiveFilter(nextValue)}
      />

      <div className={css['inline']}>
        {props.options.filters.map(filter => {
          let className = ''

          const active = props.activeFilter === filter.value || props.activeFilter?.[filter.value]

          if (active) className += `${css['active-filter']}`

          return (
            <p key={filter.value} onClick={() => props.setActiveFilter(filter.value)} className={className}>
              {filter.text}
            </p>
          )
        })}
      </div>
    </div>
  )
}

type Filter = {
  options: {
    id?: string | number
    text?: React.ReactElement | string
    value: any
  }[]
  value: any
  onChange: (nextVal: any) => void
}

type SearchProps = {
  value: Filter['value']
  onChange: Filter['onChange']
  placeholder?: string | undefined
  timeout?: number
}
export const Search = (props: SearchProps) => {
  return (
    <InputForm
      timeout={props.timeout}
      className={css['search']}
      placeholder={props.placeholder}
      onChange={props.onChange}
      icon={IconSearch}
    />
  )
}

// type DropdownProps = {
//   options: Filter['options']
//   value: Filter['value']
//   onChange: Filter['onChange']
//   collapsed?: boolean
//   neverCollapse?: boolean
// }
// export const DropdownFilter = (props: DropdownProps) => {
//   let className = css['filter']

//   if (props.collapsed) className += ` ${css['collapsed']}`
//   if (props.neverCollapse) className += ` ${css['never-collapse']}`

//   return (
//     <div className={css['filter']} data-type="filter">
//       <Dropdown
//         className={css['dropdown']}
//         customIcon={IconFilter}
//         options={props.options}
//         value={props.value}
//         onChange={nextValue => props.onChange(nextValue)}
//       />

//       <div className={css['inline']}>
//         {props.options.map(filter => {
//           let className = ''

//           const active = props.value === filter.value || props.value?.[filter.value]

//           if (active) className += `${css['active-filter']}`

//           return (
//             <p key={filter.value} onClick={() => props.onChange(filter.value)} className={className}>
//               {filter.text}
//             </p>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

type TagProps = {
  options: Filter['options']
  value: Filter['value']
  onChange: Filter['onChange']
}
export const Tags = (props: TagProps) => {
  return (
    <div className={css['tags']} data-type="filter">
      {props.options.map(filter => {
        let className = `${css['tag']} label label-hover white plain`

        const active = props.value === filter.value || props.value?.[filter.value]

        if (active) className += ` ${css['active']} black`

        return (
          <button key={filter.value} onClick={() => props.onChange(filter.value)} className={className}>
            <div className={css['icons']}>
              <IconCheck className={`icon ${css['icon-check']}`} />
              <IconPlus className={`icon ${css['icon-plus']}`} />
            </div>
            <span>{filter.text}</span>
          </button>
        )
      })}
    </div>
  )
}

type BasicProps = {
  options: Filter['options']
  value: Filter['value']
  onChange: Filter['onChange']
  className?: string
}
export const Basic = (props: BasicProps) => {
  let className = css['basic']

  if (props.className) className += ` ${props.className}`

  return (
    <div className={className}>
      {props.options.map(option => {
        const selected = props.value === option.value

        let className = 'plain'

        if (selected) className += ` ${css['selected']}`

        return (
          <button onClick={() => props.onChange(option.value)} key={option.value} className={className}>
            {option.text}
          </button>
        )
      })}
    </div>
  )
}

type FilterFoldoutProps = {
  children: (open: boolean, setOpen: (isOpen: boolean) => void) => React.ReactElement
  active?: boolean
  renderRight?: any
}

export const FilterFoldout = (props: FilterFoldoutProps) => {
  const [open, setOpen] = React.useState(false)
  const [maxHeight, setMaxHeight] = React.useState<number>()
  const scrollDistanceSinceOpen = React.useRef<number>()
  const ref = React.useRef<any>()
  const buttonRef = React.useRef<any>()
  const { observe } = useDimensions({
    onResize: ({ height }) => {
      const button = buttonRef.current

      const boundingBox = button.getBoundingClientRect()

      const buttonCutoff = window.scrollY + boundingBox.top + boundingBox.height

      const maxFoldoutHeight = height - buttonCutoff

      setMaxHeight(maxFoldoutHeight)
    },
  })

  React.useEffect(() => {
    if (!open) return

    scrollDistanceSinceOpen.current = window.scrollY

    const handler = () => {
      if (typeof scrollDistanceSinceOpen.current !== 'undefined') {
        if (window.scrollY > scrollDistanceSinceOpen.current + 300) {
          setOpen(false)
        }
      }
    }

    window.addEventListener('scroll', handler)

    return () => window.removeEventListener('scroll', handler)
  }, [open])

  React.useEffect(() => {
    const handleClickOutside = (e: any) => {
      const isButtonClick = buttonRef.current && buttonRef.current.contains(e.target)

      if (!isButtonClick && ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [ref, buttonRef, open])

  let className = css['filter-foldout']

  if (open) className += ` ${css['open']}`

  let style: any = maxHeight ? { '--max-foldout-height': `${maxHeight}px` } : {}

  return (
    <div className={`${className}`} style={style}>
      <button
        ref={buttonRef}
        className={`${open || props.active ? 'app hover' : 'app'} squared sm thin-borders`}
        onClick={(e: any) => {
          setOpen(!open)
        }}
      >
        {open ? <IconClose /> : <IconFilter />}
      </button>

      <div className={css['screen-size-simulator']} ref={observe} />

      <div className={css['foldout']}>
        <div className={css['content']} ref={ref}>
          <div className={css['header']}>
            <p>Filter</p>
            <props.renderRight setOpen={setOpen} />
          </div>
          <div className={css['children']}>
            {props.children(open, setOpen)}

            <div className={css['scroll-gradient']}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
