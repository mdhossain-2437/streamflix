// StreamFlix service worker — runtime cache for static assets and TMDB images.
// Keep it simple: stale-while-revalidate for images & built JS/CSS.
const VERSION = "v1.0.0";
const RUNTIME = `streamflix-runtime-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cache TMDB poster/backdrop images & built /assets/ chunks
  const isImage = /^image\//.test(req.headers.get("accept") || "") ||
    url.hostname.endsWith("image.tmdb.org") ||
    url.hostname.endsWith("picsum.photos");
  const isBuiltAsset = url.pathname.startsWith("/assets/");

  if (!isImage && !isBuiltAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })(),
  );
});
