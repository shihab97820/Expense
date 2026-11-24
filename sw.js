/* হিসাব খাতা — অফলাইন সার্ভিস ওয়ার্কার।
   অ্যাপ আপডেট করলে নিচের VERSION সংখ্যা বদলাবেন (যেমন v2), তাহলে ফোনে নতুন সংস্করণ আসবে। */
const VERSION = 'hisab-v3';
const APP = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.endsWith('-fonts') && !k.endsWith('-lib') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // পেজ খোলা: আগে ইন্টারনেট থেকে নতুন সংস্করণ, না পেলে জমানো কপি
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Google Fonts: জমানো কপি থাকলে সেটাই, পেছনে আপডেট
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('hisab-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Firebase লাইব্রেরি (নির্দিষ্ট সংস্করণ, বদলায় না): একবার নামালে অফলাইনেও চলবে
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open('hisab-lib').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }
  // অ্যাপের নিজের ফাইল: আগে জমানো কপি
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
