/**
 * Orage Core service worker.
 *
 * Strategy:
 *  - HTML pages: network-first with cached fallback so a flaky connection
 *    doesn't show a blank shell. The service worker only takes over when
 *    Next.js's own client navigation isn't available.
 *  - Static Next.js assets (`/_next/static/*`): cache-first, immutable.
 *  - API routes: network-only (never cache writes; reads are short-lived
 *    and we want fresh data).
 *
 * This is a minimal SW — install/activate/fetch only. No push, no sync.
 * If we add offline create-task later we'd extend with IndexedDB queues.
 */

const STATIC_CACHE = "orage-static-v1"
const PAGES_CACHE = "orage-pages-v1"
const PRECACHE_URLS = ["/", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Never cache API or auth routes.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return
  }

  // Cache-first for immutable Next.js static chunks.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone))
            return res
          }),
      ),
    )
    return
  }

  // Network-first for HTML / RSC payloads, with cache fallback for offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone()
        caches.open(PAGES_CACHE).then((c) => c.put(req, clone))
        return res
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error())),
  )
})
