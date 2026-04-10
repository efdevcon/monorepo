export interface NocodbFormConfig {
  formViewId: string
  requireOtp?: boolean
}

export const nocodbForms: Record<string, NocodbFormConfig> = {
  'student-application': {
    formViewId: 'vwgfemz67zunzvyo',
    requireOtp: true,
  },
}

/** Resolve a slug to its viewId + config. If no config exists, treat input as a viewId. */
export function resolveViewId(slugOrViewId: string): { viewId: string; config?: NocodbFormConfig } {
  const config = nocodbForms[slugOrViewId]
  if (config) return { viewId: config.formViewId, config }
  return { viewId: slugOrViewId }
}

/** Reverse-lookup: find config by viewId (for dynamic route OTP check). */
export function getConfigByViewId(viewId: string): NocodbFormConfig | undefined {
  return Object.values(nocodbForms).find(c => c.formViewId === viewId)
}
