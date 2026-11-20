/// <reference lib="webworker" />
// Service worker (spec 10): exactly two runtime rules, no defaultCache, and /api/* is never intercepted.
import { CacheFirst, NetworkFirst, type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const v = process.env.NEXT_PUBLIC_BUILD_ID;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({ cacheName: `pages-${v}`, networkTimeoutSeconds: 3 }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({ cacheName: `static-${v}` }),
    },
  ],
});

serwist.addEventListeners();

// The menu shows "Offline ready" only after this message (spec 04).
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage('sw-ready'))));
});
