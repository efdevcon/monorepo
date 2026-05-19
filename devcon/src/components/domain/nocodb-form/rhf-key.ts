/**
 * react-hook-form parses field names as lodash-style paths. Its
 * `stringToPath` helper does `input.replace(/["|']|\]/g, '')` and then splits
 * on `.` / `[` — so quotes/brackets get silently stripped, and dots/brackets
 * create nested keys. NocoDB column titles can contain ALL of these (e.g.
 * `Minor's full name`, `[encrypted] Passport …`), so we register fields
 * under a sanitized alias that matches what RHF actually stores under,
 * then remap to the original column title before sending data to the server.
 *
 * The alias must exactly mirror RHF's transformation, otherwise the map
 * can't translate the submitted keys back:
 *   - `'` and `"` → stripped (RHF replaces with empty string)
 *   - `[`, `]`, `.` → replaced with `-` so the key stays flat (no nesting)
 */

export function rhfFieldName(columnName: string): string {
  return columnName.replace(/['"]/g, '').replace(/[\[\]\.]/g, '-')
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
