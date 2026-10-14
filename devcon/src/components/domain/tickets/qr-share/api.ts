/** Typed fetch for /api/qr-share/* with the admin key header and the repo's
 *  { success, error } convention. Throws on failure so callers show the text. */
export async function qrApi<T>(
  key: string,
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api/qr-share/${path}/`, {
    method: init.method ?? 'GET',
    headers: { 'x-admin-key': key, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const json = (await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }))) as {
    success: boolean
    error?: string
  } & T
  if (!json.success) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}
