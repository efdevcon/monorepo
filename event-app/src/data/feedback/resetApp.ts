/**
 * The crash page's escape hatch: drop every cached file and the service
 * worker, then load Home fresh. IndexedDB (stars, catalogue, prefs) and the
 * sign-in stay; a poisoned cache is the failure this undoes, not user data.
 */
export async function resetApp(): Promise<void> {
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {}
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
  } catch {}
  window.location.replace("/");
}
