import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Dropdown } from '../dropdown'
import { Input, TextArea } from '../input-form'
import { Alert } from '../alert'
import css from './form.module.scss'

type FormFieldProps = {
  fieldKey: string
  fieldOptions?: {
    [key: string]: any
  }
  [any: string]: any
}

const StandardError = (props: any) => {
  const { error } = props

  let message = error.message

  if (error.type === 'required') message = 'Required field'

  return <Alert type="error" message={message} />
}

export const FormDropdown = React.forwardRef(({ control, fieldOptions, ...props }: FormFieldProps, ref: any) => {
  return (
    <Controller
      name={props.fieldKey}
      control={control}
      rules={{ required: true }}
      render={({ field }) => (
        <Dropdown className={css['form-dropdown']} {...props} {...field} ref={ref} options={props.options} />
      )}
    />
  )
})

FormDropdown.displayName = 'FormDropDown'

export const FormInput = React.forwardRef(({ fieldOptions, ...props }: FormFieldProps, ref: any) => {
  return <Input {...props} ref={ref} />
})

export const FormTextArea = React.forwardRef(({ fieldOptions, ...props }: FormFieldProps, ref: any) => {
  return <TextArea {...props} ref={ref} />
})

export const Form = (props: any) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm(props)

  // console.log(watch('feedbackCategory')) // watch input value by passing the name of it

  let className = css['form']

  if (props.className) className += ` ${props.className}`

  return (
    <form className={className} onSubmit={handleSubmit(props.onSubmit)}>
      {React.Children.map(props.children, child => {
        if (!child.props.fieldKey) {
          return child
        }

        const error = errors[child.props.fieldKey]

        let render = []

        if (child && child.type.displayName === 'FormDropDown') {
          render.push(
            React.cloneElement(child, {
              control,
              error,
            })
          )
        } else {
          render.push(
            React.cloneElement(child, {
              ...register(child.props.fieldKey, child.props.fieldOptions),
              error,
            })
          )
        }

        if (error) render.push(<StandardError error={error} />)

        return render
      })}
    </form>
  )
}
