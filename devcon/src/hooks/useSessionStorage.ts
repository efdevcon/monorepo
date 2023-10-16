import { useState } from "react"

const isBrowser = typeof window !== 'undefined';

export function useSessionStorage(key: string, initialValue: any) {
    const [storedValue, setStoredValue] = useState(() => {
        if (!isBrowser) return initialValue;

        try {
            const item = window.sessionStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.log(error)
            return initialValue
        }
    })

    const setValue = (value: any) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value
            setStoredValue(valueToStore)
            window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
        } catch (error) {
            console.log(error)
        }
    }

    return [storedValue, setValue]
}