// RAX3D shop: network first (always fresh), falls back to cache when offline.
// v38: points.json is network-only (never cached), old caches are deleted on activate,
// and 3D models (models/) are capped to the last 8 used so phones don't fill up.
const C = 'rax3d-shop-v69', M = 'rax3d-models-v69', MAX_MODELS = 8;
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== M).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
async function trimModels() {
  const c = await caches.open(M), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_MODELS; i++) await c.delete(ks[i]);   // keys come back oldest first
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (/\/points\.json$/.test(u.pathname)) return;               // network-only: loyalty balances must always be live
  const isModel = /\/models\//.test(u.pathname), name = isModel ? M : C;
  const key = isModel ? u.origin + u.pathname : r;               // ignore ?query on models so each is stored once
  e.respondWith(fetch(r).then(res => {
    if (res.ok && !u.search || res.ok && isModel) {
      const cp = res.clone();
      e.waitUntil(caches.open(name).then(c => c.delete(key).then(() => c.put(key, cp))).then(() => isModel ? trimModels() : 0));
    }
    return res;
  }).catch(() => caches.match(key)));
});
