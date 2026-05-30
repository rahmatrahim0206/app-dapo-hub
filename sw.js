/**
 * DAPO-HUB Service Worker
 * Dikembangkan oleh Rahmat Rahim (OPS SMP Negeri 3 Makassar)
 * Berkas ini menangani caching aset statis dan fungsionalitas offline PWA secara presisi.
 * Optimal untuk server lokal (localhost) maupun sub-direktori GitHub Pages.
 */

const CACHE_NAME = 'dapohub-spentig-cache-v3';

// Daftar aset utama yang wajib disimpan di dalam cache untuk akses offline penuh tanpa interupsi
// UPDATE: Menyertakan 'manifest.json' agar terdeteksi secara valid oleh Chrome Windows
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdn-icons-png.flaticon.com/512/2210/2210143.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2'
];

// Event: Install (Penyimpanan aset awal ke dalam cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // PERBAIKAN BUG UTAMA: Melakukan caching secara individual agar jika salah satu aset eksternal/internal gagal (404),
      // Service Worker tetap sukses terinstall dan tombol PWA Chrome Windows tidak terblokir!
      const cachePromises = ASSETS_TO_CACHE.map((asset) => {
        return cache.add(asset).catch((err) => {
          console.warn(`[Service Worker] Gagal menyimpan aset ke cache: ${asset}`, err);
        });
      });
      return Promise.all(cachePromises);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Event: Activate (Pembersihan cache versi lama yang sudah usang)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            // Hapus cache versi lama demi mencegah bentrok data
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Event: Fetch (Strategi Gabungan Cerdas: Stale-While-Revalidate untuk PWA Tercepat)
self.addEventListener('fetch', (event) => {
  // Hanya proses permintaan dengan metode GET
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Batasi hanya memproses request dengan protokol HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  // Intersepsi khusus untuk permintaan Navigasi Utama (Offline Fallback ke index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('index.html') || caches.match('index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Hanya simpan respons valid (status 200) ke dalam cache untuk pembaruan data di latar belakang
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Abaikan error fetch untuk aset non-navigasi saat offline
      });

      // Kembalikan aset cache lokal secara instan (0ms) jika ada, 
      // dan perbarui data di latar belakang via fetchPromise secara asinkron
      return cachedResponse || fetchPromise;
    })
  );
});
