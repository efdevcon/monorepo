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
