// Forest Zip : garde tout le jeu sur l'appareil pour jouer sans connexion.
// Pour publier une mise à jour, augmente le numéro de version.
const VERSION = 'forest-zip-v2';
const CORE = ["./", "./index.html"];
const ASSETS = [
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/favicon-32.png",
  "./fonts/unbounded-latin-500-normal.woff2",
  "./fonts/unbounded-latin-700-normal.woff2",
  "./fonts/manrope-latin-500-normal.woff2",
  "./fonts/manrope-latin-600-normal.woff2",
  "./fonts/manrope-latin-700-normal.woff2",
  "./fonts/manrope-latin-800-normal.woff2"
];

// Copie « propre » d'une réponse (Safari refuse une page servie hors ligne si elle garde une trace de redirection)
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // La page elle-même est indispensable : si elle échoue, l'installation recommencera au prochain lancement
    for (const url of CORE) {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error('page indisponible');
      await cache.put(url, await clean(res));
    }
    // Polices et icônes : on garde tout ce qui répond, sans bloquer
    await Promise.all(ASSETS.map(async url => {
      try { const res = await fetch(new Request(url, { cache: 'reload' })); if (res.ok) await cache.put(url, await clean(res)); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('forest-zip-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'offline-ready' }));
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    // Page : réseau d'abord (pour les mises à jour), copie gardée si pas de réseau ou réseau trop lent
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const network = fetch(req).then(async res => {
        if (res.ok && res.type === 'basic') await cache.put('./index.html', await clean(res.clone()));
        return res;
      });
      if (!cached) return network;
      const timeout = new Promise(resolve => setTimeout(() => resolve(cached), 2500));
      try { return await Promise.race([network.catch(() => cached), timeout]); }
      catch (e) { return cached; }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) await cache.put(req, await clean(res.clone()));
      return res;
    } catch (e) { return Response.error(); }
  })());
});
