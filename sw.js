/**
 * DAPO-HUB Service Worker
 * Dikembangkan oleh Rahmat Rahim (OPS SMP Negeri 3 Makassar)
 * Berkas ini menangani caching aset statis dan fungsionalitas offline PWA secara presisi.
 */

const CACHE_NAME = 'dapohub-cache-v2';

// Daftar aset utama yang akan disimpan di dalam cache untuk akses offline penuh
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn-icons-png.flaticon.com/512/2210/2210143.png'
];

// Event: Install (Penyimpanan aset awal ke dalam cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Memaksa Service Worker yang baru dipasang untuk langsung aktif
        return self.skipWaiting();
      })
  );
});

// Event: Activate (Pembersihan cache versi lama yang sudah usang)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            // Hapus cache versi sebelumnya demi keselarasan data terbaru
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Mengambil alih kendali halaman secara langsung tanpa harus memuat ulang (reload)
      return self.clients.claim();
    })
  );
});

// Event: Fetch (Strategi Network-First dengan Fallback ke Cache saat Offline)
self.addEventListener('fetch', (event) => {
  // Hanya proses permintaan dengan metode GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika respons valid, duplikat dan simpan versi terbaru ke dalam cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika jaringan gagal/offline, ambil aset dari cache lokal peramban
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Jika permintaan berupa navigasi halaman utama dan tidak ada di cache, arahkan ke index.html lokal
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});