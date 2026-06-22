// VetNot Service Worker
// Cache adını uygulama güncellendiğinde artırın (örn. 'vetnot-v2') —
// böylece eski cache otomatik temizlenir ve kullanıcılar güncel dosyaları alır.
const CACHE_NAME = "vetnot-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        // Bir dosya bulunamazsa kurulumun tamamı başarısız olmasın
        console.warn("VetNot SW: precache sırasında hata", err);
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Sadece GET isteklerini ele al; diğerlerini tarayıcıya bırak
  if (request.method !== "GET") return;

  // Sayfa navigasyonları: önce ağ, başarısız olursa cache'teki kabuğa düş
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Diğer her şey: cache-first, sonra ağa düş ve cache'i güncelle
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
