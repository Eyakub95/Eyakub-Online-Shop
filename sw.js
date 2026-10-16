/* বাজার হিসাব: অফলাইনে চালানোর সার্ভিস ওয়ার্কার।
   নতুন সংস্করণ দিলে নিচের VERSION-এর সংখ্যা বাড়িয়ে দিন (v1 → v2)।
   এটা শুধু অ্যাপের ফাইল ক্যাশ করে — আপনার হিসাবের তথ্য কখনো মোছে না। */
const VERSION = 'bazar-hisab-v4-1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'js/config.js', 'js/main.js', 'js/store.js', 'js/state.js', 'js/views.js', 'js/domain.js', 'js/util.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.png', 'favicon.ico', 'logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // ফন্ট ও Supabase লাইব্রেরি: একবার নামালে ক্যাশ থেকেই চলে (অফলাইনেও অ্যাপ খোলে)
  const cacheFirst = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
    || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@supabase/'));
  if (cacheFirst) {
    e.respondWith(caches.open(VERSION).then((cache) => cache.match(req).then((hit) =>
      hit || fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }))));
    return;
  }
  if (!sameOrigin) return;   // Supabase-এর ডেটা/লগইন অনুরোধ সার্ভিস ওয়ার্কার ছোঁয় না
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((cache) => cache.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
