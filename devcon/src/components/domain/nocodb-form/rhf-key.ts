/**
 * react-hook-form treats `[...]` and `.` as path syntax — `register('[x] y')`
 * silently stores the value under `'x y'`, dropping the brackets. NocoDB
 * column titles can contain both characters (e.g. `[encrypted] Passport ...`),
 * so we register fields under a sanitized alias and remap to the original
 * column title before sending data to the server.
 *
 * We replace `[`, `]`, and `.` with a single safe character. RHF doesn't
 * parse `-` as syntax, so it's a clean substitution.
 */

const UNSAFE = /[\[\]\.]/g

export function rhfFieldName(columnName: string): string {
  return columnName.replace(UNSAFE, '-')
}

/**
 * Given the form's submitted data (keyed by RHF aliases) and a list of the
 * schema's original column names, return a new object keyed by original
 * column names.
 */
export function remapToOriginalNames(
  formData: Record<string, unknown>,
  originalColumnNames: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const aliasToOriginal = new Map<string, string>()
  for (const name of originalColumnNames) aliasToOriginal.set(rhfFieldName(name), name)

  for (const [key, value] of Object.entries(formData)) {
    out[aliasToOriginal.get(key) ?? key] = value
  }
  return out
}
