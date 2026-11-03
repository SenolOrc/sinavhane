// Sınavhane — internetsiz çalışma için hafif servis çalışanı.
// Aynı kökten gelen GET isteklerini ilk kullanımda saklar; sonraki açılışlarda önce ağdan,
// ağ yoksa saklıdan döner. Sürüm değişince eski saklar silinir.
const SURUM = "sinavhane-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return;
  olay.respondWith(
    fetch(istek)
      .then((yanit) => {
        if (yanit.ok && yanit.status === 200) {
          const kopya = yanit.clone();
          caches.open(SURUM).then((c) => c.put(istek, kopya));
        }
        return yanit;
      })
      .catch(async () => {
        const saklı = await caches.match(istek);
        if (saklı) return saklı;
        // Uygulama içi adreslerde (tek sayfa) ana sayfayı ver.
        if (istek.mode === "navigate") {
          const ana = await caches.match(new URL("./", self.registration.scope).toString());
          if (ana) return ana;
        }
        return Response.error();
      }),
  );
});
