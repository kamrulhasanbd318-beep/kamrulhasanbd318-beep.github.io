const CACHE_NAME="kamrul-eagle-v7";
const CORE=["./","./index.html","./site-data.json","./manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.all(CORE.map(async url=>{try{const r=await fetch(url,{cache:"reload"});if(r.ok)await cache.put(url,r)}catch(e){}}));await self.skipWaiting()})())});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("kamrul-eagle-")&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim()})())});
async function refresh(req,cacheKey){try{const response=await fetch(req,{cache:"no-store",signal:AbortSignal.timeout(4500)});if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(cacheKey||req,response.clone())}return response}catch(e){return null}}
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET")return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
if(url.pathname.endsWith("/site-data.json")){event.respondWith((async()=>{const fresh=await refresh(req);if(fresh)return fresh;const cache=await caches.open(CACHE_NAME);return (await cache.match(req))||(await cache.match("./site-data.json"))||Response.error()})());return}
if(req.mode==="navigate" && (url.pathname==="/" || url.pathname==="/index.html")){event.respondWith((async()=>{const fresh=await refresh(req,"./index.html");if(fresh)return fresh;const cache=await caches.open(CACHE_NAME);return (await cache.match("./index.html"))||Response.error()})());return}
event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const cached=await cache.match(req);const update=refresh(req);if(cached){event.waitUntil(update);return cached}return (await update)||Response.error()})())});

self.addEventListener("push",event=>{
  let data={title:"Kamrul Messenger",body:"আপনার নতুন মেসেজ এসেছে",url:"/messenger/"};
  try{if(event.data)data={...data,...event.data.json()}}catch(e){if(event.data)data.body=event.data.text()}
  event.waitUntil(self.registration.showNotification(data.title||"Kamrul Messenger",{
    body:data.body||"আপনার নতুন মেসেজ এসেছে",
    icon:"/manifest.webmanifest",
    badge:"/manifest.webmanifest",
    data:{url:data.url||"/messenger/"},
    tag:data.tag||"kamrul-messenger",
    renotify:true
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/messenger/",self.location.origin).href;
  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clientsList){if(new URL(client.url).origin===self.location.origin){await client.navigate(target);return client.focus()}}
    return clients.openWindow(target);
  })());
});
