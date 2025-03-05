import { useCallback, useState } from 'react'

export const useFormField = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue)
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value), [])
  return { value, onChange }
}
