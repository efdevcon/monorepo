export class CopyValue<T = string> {
  value: T
  __copyKey: string
  __copyPath: string
  __isCopyValue: true = true

  constructor(value: T, copyKey: string, copyPath: string) {
    this.value = value
    this.__copyKey = copyKey
    this.__copyPath = copyPath
  }

  toString(): string {
    return String(this.value)
  }

  valueOf(): T {
    return this.value
  }

  [Symbol.toPrimitive](_hint: string): T | string {
    if (_hint === 'string') return String(this.value)
    return this.value as T | string
  }
}

export type Proxied<T> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? Proxied<T[K]>
    : CopyValue<T[K]>
}

export interface CopyConfig {
  basePath: string
  devMode: boolean
  apiEndpoint?: string
}

export interface CopyRegistryEntry {
  defaults: Record<string, any>
  overrides: Record<string, any> | null
  resolved: Record<string, any>
}

export function isCopyValue(value: unknown): value is CopyValue {
  return value instanceof CopyValue || (typeof value === 'object' && value !== null && '__isCopyValue' in value && (value as any).__isCopyValue === true)
}
