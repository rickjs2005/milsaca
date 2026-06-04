/* Milsaca — service worker (resiliência de campo, área rural).
 * Estratégia conservadora pra NUNCA piorar o online e nunca dar tela branca:
 *  - Navegações (páginas): network-first → online sempre fresco; offline cai no
 *    último estado salvo daquela página, e por fim numa página offline.
 *  - Assets do Next (/_next/static, content-hashed) + estáticos: stale-while-
 *    revalidate (seguro — URLs imutáveis).
 *  - GET same-origin apenas; nunca cacheia POST/PUT/dados.
 */
const VERSION = "milsaca-v1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.add(OFFLINE_URL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: network-first, fallback ao cache da própria página, depois offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // Assets content-hashed do Next + estáticos: stale-while-revalidate.
  const isAsset =
    url.pathname.startsWith("/_next/static") ||
    ["style", "script", "image", "font"].includes(req.destination);
  if (isAsset) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
  // Demais GETs (ex.: dados/RSC): deixa passar direto pra rede.
});
