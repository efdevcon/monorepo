/**
 * Resolves `true` once a service worker controls this page, `false` when the
 * browser has no service worker container at all (insecure context, old
 * browser).
 *
 * On a cold visit the worker registers, installs (precaching the app shell,
 * which takes several seconds on a phone) and only then claims the page
 * (`clientsClaim` in src/sw.ts). So "no controller right now" is the normal
 * state during the first seconds of the first visit, not a sign that there will
 * never be one. Work that only makes sense with a worker in place (the image
 * warmer: without one nothing caches its fetches) should wait for it rather
 * than give up.
 *
 * Never resolves when no worker ever takes control (development, where the SW
 * is disabled; a failed install): a caller waiting on it simply never runs.
 * The container is injectable for tests.
 */
export type ServiceWorkerControl = Pick<
  ServiceWorkerContainer,
  "controller" | "addEventListener"
>;

export function whenControlled(
  container: ServiceWorkerControl | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.serviceWorker
): Promise<boolean> {
  if (!container) return Promise.resolve(false);
  if (container.controller) return Promise.resolve(true);
  return new Promise((resolve) => {
    container.addEventListener(
      "controllerchange",
      () => resolve(container.controller !== null),
      { once: true }
    );
  });
}
