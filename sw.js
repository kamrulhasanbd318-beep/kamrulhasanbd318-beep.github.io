const CACHE_NAME="kamrul-eagle-v21";
const CORE=["./index.html","./manifest.webmanifest"];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async url=>{
      try{
        const response=await fetch(url,{cache:"reload",signal:AbortSignal.timeout(3000)});
        if(response.ok)await cache.put(url,response);
      }catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const current=await caches.open(CACHE_NAME);
    for(const key of keys.filter(key=>key.startsWith("kamrul-eagle-")&&key!==CACHE_NAME)){
      try{
        const previous=await caches.open(key);
        const saved=await previous.match("./site-data.json");
        if(saved&&!await current.match("./site-data.json"))await current.put("./site-data.json",saved);
      }catch(e){}
    }
    await Promise.all(keys.filter(key=>key.startsWith("kamrul-eagle-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request,cacheKey,timeout=3000){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:"no-store",signal:AbortSignal.timeout(timeout)});
    if(response.ok){
      const copy=response.clone();
      if(cacheKey==="./site-data.json"){
        const headers=new Headers(copy.headers);
        headers.set("x-kep-cached-at",String(Date.now()));
        await cache.put(cacheKey,new Response(await copy.arrayBuffer(),{
          status:copy.status,statusText:copy.statusText,headers
        }));
      }else{
        await cache.put(cacheKey||request,copy);
      }
    }
    return response;
  }catch(e){
    return (cacheKey?await cache.match(cacheKey):await cache.match(request))||Response.error();
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  const update=networkFirst(request,null,3000);
  if(cached){
    // Keep static assets instant while refreshing them for the next visit.
    return cached;
  }
  return await update;
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(url.pathname.endsWith("/site-data.json")){
    event.respondWith(networkFirst(request,"./site-data.json",3000));
    return;
  }

  if(request.mode==="navigate"&&(url.pathname==="/"||url.pathname==="/index.html")){
    event.respondWith(networkFirst(request,"./index.html",3000));
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached){
      event.waitUntil(networkFirst(request,null,4500));
      return cached;
    }
    return await networkFirst(request,null,4500);
  })());
});

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
    for(const client of clientsList){
      if(new URL(client.url).origin===self.location.origin){
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
