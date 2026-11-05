/**
 * Every result of a paginated Pretix list (`results` + `next`). Pretix pages
 * at 50, and the Devcon 8 catalog passed that, so one page is not enough.
 * Throws on any failed page rather than returning a partial list.
 */
export async function fetchAllPages<T>(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
  fetchImpl: typeof fetch = fetch
): Promise<T[]> {
  const all: T[] = [];
  let next: string | null = url;
  for (let page = 0; next && page < 50; page++) {
    const res: Response = await fetchImpl(next, init);
    if (!res.ok) throw new Error(`Pretix list failed (${res.status}): ${next}`);
    const data: { results?: T[]; next?: string | null } = await res.json();
    all.push(...(data.results ?? []));
    next = data.next ?? null;
  }
  return all;
}
