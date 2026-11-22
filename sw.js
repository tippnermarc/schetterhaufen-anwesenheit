const CACHE = 'nz-schetterhaufen-app-v23-5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png', './hero-original.jpg', './login-bg.jpg', './zunftcheck.css', './fonts/Roboto-var.woff', './fonts/RobotoSlab-Bold.woff2', './zunftcheck-footer.png'];
const TIMEOUT = 3000; // Bei schlechtem Netz nach 3 s auf die gespeicherte Version zurückfallen
const isCode = path => /(\.html|\.css|\.js|\.webmanifest)$/.test(path) || path.endsWith('/');

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // 'reload' umgeht den HTTP-Cache (GitHub Pages cached ca. 10 Minuten), damit nie veraltete Dateien im Shell landen.
  await Promise.all(SHELL.map(async url => {
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response.ok) throw new Error(url + ' → ' + response.status);
    await cache.put(url, response);
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(n => n !== CACHE && (n.startsWith('nz-schetterhaufen-app-') || n.startsWith('zunftcheck-v'))).map(n => caches.delete(n)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_OFFLINE') event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const matches = await Promise.all(SHELL.map(url => cache.match(url)));
    event.ports[0]?.postMessage({ ready: matches.every(Boolean) });
  })());
});

// Netz zuerst (mit Timeout, sobald eine gespeicherte Version existiert), sonst Cache.
async function networkFirst(request, cache, key) {
  const cached = await cache.match(key, { ignoreSearch: true });
  const ctl = new AbortController();
  const timer = cached ? setTimeout(() => ctl.abort(), TIMEOUT) : null;
  try {
    const response = await fetch(request.mode === 'navigate' ? key : request, { cache: 'no-store', signal: ctl.signal });
    if (timer) clearTimeout(timer);
    if (response.ok) { await cache.put(key, response.clone()); return response; }
    return cached || response;
  } catch {
    if (timer) clearTimeout(timer);
    return cached || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') return networkFirst(request, cache, new URL('./index.html', self.registration.scope).href);
    const key = url.origin + url.pathname;
    if (isCode(url.pathname)) return networkFirst(request, cache, key);
    // Bilder: Cache zuerst
    const cached = await cache.match(key, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(request); } catch { return Response.error(); }
  })());
});
