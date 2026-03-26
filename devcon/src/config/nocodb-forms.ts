export interface NocodbFormConfig {
  baseId: string
  tableId: string
  formViewId: string
  /** Password-protected shared form view UUID — used server-side only for fetching field metadata */
  sharedViewId: string
  title: string
  requireOtp?: boolean
}

export const nocodbForms: Record<string, NocodbFormConfig> = {
  'student-application': {
    baseId: 'p964xl4nowbllvq',
    tableId: 'm3bqjjne9mqgnue',
    formViewId: 'vwgfemz67zunzvyo',
    sharedViewId: 'aa5be094-8784-4f12-9b95-20925cd0ea70',
    title: 'Student Application — Devcon 8',
    requireOtp: true,
  },
}

export function getFormConfig(slug: string): NocodbFormConfig {
  const config = nocodbForms[slug]
  if (!config) throw new Error(`Unknown form slug: ${slug}`)
  return config
}
