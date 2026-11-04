// Forest Zip : garde tout le jeu sur l'appareil pour jouer sans connexion.
// Pour publier une mise à jour, change le numéro de version ci-dessous.
const CACHE = 'forest-zip-v1';
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./fonts/unbounded-latin-500-normal.woff2",
  "./fonts/unbounded-latin-700-normal.woff2",
  "./fonts/manrope-latin-500-normal.woff2",
  "./fonts/manrope-latin-600-normal.woff2",
  "./fonts/manrope-latin-700-normal.woff2",
  "./fonts/manrope-latin-800-normal.woff2"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (req.mode === 'navigate') {
    // Page : réseau d'abord (pour recevoir les mises à jour), sinon la copie gardée
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok && sameOrigin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
