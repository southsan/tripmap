const VERSION = 'tripmap-v3-search-fix-20260719'
const APP_CACHE = `${VERSION}-app`
const MAP_CACHE = `${VERSION}-map`
const OFFLINE_URL = new URL('./', self.registration.scope).href

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key !== APP_CACHE && key !== MAP_CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
    const windows = await self.clients.matchAll({ type: 'window' })
    await Promise.all(windows.map(client => client.navigate(client.url)))
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' })
        const cache = await caches.open(APP_CACHE)
        await cache.put(OFFLINE_URL, response.clone())
        return response
      } catch {
        return (await caches.match(OFFLINE_URL)) || Response.error()
      }
    })())
    return
  }

  if (url.hostname === 'tiles.openfreemap.org') {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      const cache = await caches.open(MAP_CACHE)
      await cache.put(request, response.clone())
      return response
    })())
  }
})
