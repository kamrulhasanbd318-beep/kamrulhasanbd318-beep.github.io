const CACHE_NAME="kamrul-eagle-v3";
const CORE=["./","./index.html","./site-data.json","./manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.all(CORE.map(async url=>{try{const r=await fetch(url,{cache:"reload"});if(r.ok)await cache.put(url,r)}catch(e){}}));await self.skipWaiting()})())});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("kamrul-eagle-")&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim()})())});
async function refresh(req,cacheKey){try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(cacheKey||req,response.clone())}return response}catch(e){return null}}
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET")return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
if(req.mode==="navigate"){event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const cached=await cache.match("./index.html");const update=refresh(req,"./index.html");if(cached){event.waitUntil(update);return cached}return (await update)||Response.error()})());return}
if(url.pathname.endsWith("/site-data.json")){event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const cached=await cache.match(req);const update=refresh(req);if(cached){event.waitUntil(update);return cached}return (await update)||Response.error()})());return}
event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const cached=await cache.match(req);if(cached){event.waitUntil(refresh(req));return cached}return (await refresh(req))||Response.error()})())});
