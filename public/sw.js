const C = 'golden-tool-v3'
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'logo-192.png', 'logo-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'].map(p => new URL(p, self.registration.scope).href)))); self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)) }
    return res
  }).catch(() => caches.match(new URL('./', self.registration.scope).href))))
})
