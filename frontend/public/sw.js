self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('it25patok-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/it25patok-logo-192.png',
        '/it25patok-logo-512.png',
        '/manifest.webmanifest'
      ])
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request)
    })
  )
})