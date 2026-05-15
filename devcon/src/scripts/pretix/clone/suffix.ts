/**
 * Marks every cloned-into-dev resource with a visible suffix so it cannot
 * be confused with the production catalog. Applied at body-build time to
 * user-visible name/value fields on the event, items, variations, categories,
 * quotas, questions, and tax rules.
 *
 * Stable matching keys (`internal_name`, `identifier`, `slug`) are NOT
 * suffixed — those are how we find target resources across runs. To keep
 * adoption working when the target already has the suffix, the index helpers
 * here strip the suffix before comparing.
 */

export const TARGET_SUFFIX = ' TEST 🔴'

export function withSuffix(s: string): string {
  if (!s) return s
  return s.endsWith(TARGET_SUFFIX) ? s : s + TARGET_SUFFIX
}

export function stripSuffix(s: string): string {
  return s.endsWith(TARGET_SUFFIX) ? s.slice(0, -TARGET_SUFFIX.length) : s
}

/**
 * Pretix multilingual fields are either a plain string or an object keyed by
 * locale (e.g. `{ en: "Foo", es: "Bar" }`). Apply the suffix to every locale
 * value.
 */
export function suffixMultilingual(name: unknown): unknown {
  if (name == null) return name
  if (typeof name === 'string') return withSuffix(name)
  if (typeof name === 'object') {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(name as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = withSuffix(v)
    }
    return out
  }
  return name
}

/** Inverse of suffixMultilingual — for adoption-time index keys. */
export function stripMultilingual(name: unknown): string {
  if (typeof name === 'string') return stripSuffix(name)
  if (name && typeof name === 'object') {
    const m = name as Record<string, string>
    const v = m.en ?? Object.values(m)[0] ?? ''
    return stripSuffix(v)
  }
  return ''
}
