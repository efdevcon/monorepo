import React, { ChangeEvent, createRef, FormEvent, useEffect, useState } from 'react'
import css from './input-form.module.scss'

interface InputFormProps {
  id?: string
  type?: string
  label?: string
  placeholder: string
  transparentMode?: boolean
  timeout?: number
  icon?: React.ComponentType<any>
  defaultValue?: string
  className?: string
  autoFocus?: boolean
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
}

export function InputForm(props: InputFormProps) {
  const ref = createRef<HTMLInputElement>()
  let className = css['form']
  if (props.className) className = `${props.className} ${className}`
  if (props.transparentMode) className += ` ${css['transparent']}`
  const [value, setValue] = useState(props.defaultValue || '')

  useEffect(() => {
    if (props.defaultValue !== undefined) {
      setValue(props.defaultValue)
    }
  }, [props.defaultValue])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (props.onChange && props.timeout) {
        props.onChange(value)
      }
    }, props.timeout)

    return () => clearTimeout(delayDebounceFn)
  }, [props, value])

  useEffect(() => {
    if (props.autoFocus && ref.current) {
      ref.current.focus()
    }
  }, [ref, props.autoFocus])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value)

    if (props.onChange && !props.timeout) {
      props.onChange(event.target.value)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (props.onSubmit) {
      props.onSubmit(value)
    }
  }

  const id = props.id ?? `input-form_${props.type}`

  return (
    <form className={className} onSubmit={handleSubmit} role={props.type ?? 'form'}>
      <div className={css['container']}>
        {props.label && <label htmlFor={id}>{props.label}</label>}
        {/* <div className={css['input']}> */}
        <input
          ref={ref}
          className="font-md-fixed"
          type={props.type ?? 'text'}
          id={id}
          value={value}
          placeholder={props.placeholder}
          onChange={handleChange}
        />
        {props.icon && <props.icon onClick={handleSubmit} className={`${css['icon']} icon`} />}
        {/* </div> */}
      </div>
    </form>
  )
}
