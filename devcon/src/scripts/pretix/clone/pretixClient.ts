/**
 * Minimal Pretix REST client for the clone script.
 *
 * - GET handles pagination via `next` URL.
 * - POST/PATCH/DELETE retry on 5xx with exponential backoff (3 attempts).
 * - 4xx fails fast and surfaces the response body — almost always a schema
 *   mismatch we want to see immediately rather than silently retry.
 */
import { normalizeBaseUrl } from './config'

interface ClientConfig {
  baseUrl: string
  organizer: string
  event?: string
  token: string
}

const RETRY_ATTEMPTS = 3
const BACKOFF_MS = [500, 1500, 4000]

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export class PretixClient {
  private baseUrl: string
  private organizer: string
  private event?: string
  private headers: Record<string, string>

  constructor(cfg: ClientConfig) {
    this.baseUrl = normalizeBaseUrl(cfg.baseUrl)
    this.organizer = cfg.organizer
    this.event = cfg.event
    this.headers = {
      Authorization: 'Token ' + cfg.token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  /** URL within the configured event scope. `path` should start with `/`. */
  eventUrl(path: string): string {
    if (!this.event) throw new Error('event not configured on this client')
    return this.baseUrl + 'organizers/' + this.organizer + '/events/' + this.event + path
  }

  /** URL within the organizer scope. `path` should start with `/`. */
  orgUrl(path: string): string {
    return this.baseUrl + 'organizers/' + this.organizer + path
  }

  async getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) {
      const text = await res.text()
      throw new Error('GET ' + url + ' failed (' + res.status + '): ' + text)
    }
    return (await res.json()) as T
  }

  /** Paginates through Pretix's `{count, next, results}` envelope. */
  async getAll<T>(url: string): Promise<T[]> {
    type Page = { next: string | null; results: T[] }
    let next: string | null = url
    const out: T[] = []
    while (next) {
      const page: Page = await this.getJson<Page>(next)
      out.push(...page.results)
      next = page.next
    }
    return out
  }

  async mutate<T>(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        method,
        headers: this.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (res.ok) {
        if (res.status === 204 || method === 'DELETE') return undefined as T
        return (await res.json()) as T
      }
      const text = await res.text()
      const err = new Error(method + ' ' + url + ' failed (' + res.status + '): ' + text)
      // Fail fast on 4xx; only retry 5xx / network errors.
      if (res.status >= 400 && res.status < 500) throw err
      lastErr = err
      if (attempt < RETRY_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt])
    }
    throw lastErr
  }

  post<T>(url: string, body: unknown): Promise<T> {
    return this.mutate<T>('POST', url, body)
  }
  patch<T>(url: string, body: unknown): Promise<T> {
    return this.mutate<T>('PATCH', url, body)
  }
  del(url: string): Promise<void> {
    return this.mutate<void>('DELETE', url)
  }

  /**
   * Upload a binary file to Pretix's `/api/v1/upload/` endpoint and return the
   * `file:<uuid>` reference. The reference can be assigned to fields like
   * `item.picture`, `event.settings.logo_image`, etc. Pretix expects the raw
   * binary as the body with Content-Type and Content-Disposition headers.
   */
  async uploadFile(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    // No trailing slash — Pretix's `/upload` endpoint doesn't redirect on POST.
    const url = this.baseUrl + 'upload'
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.headers.Authorization,
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
      body: buffer,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error('upload ' + filename + ' failed (' + res.status + '): ' + text)
    }
    const data = (await res.json()) as { id: string }
    return data.id
  }
}
