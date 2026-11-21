const CACHE_NAME="kamrul-eagle-v18";
const CORE=["./index.html","./manifest.webmanifest"];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async url=>{
      try{
        const response=await fetch(url,{cache:"reload"});
        if(response.ok)await cache.put(url,response);
      }catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("kamrul-eagle-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function refresh(request,cacheKey){
  try{
    const response=await fetch(request,{cache:"no-store",signal:AbortSignal.timeout(4500)});
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      if(cacheKey==="./site-data.json"){
        const copy=response.clone();
        const headers=new Headers(copy.headers);
        headers.set("x-kep-cached-at",String(Date.now()));
        const body=await copy.arrayBuffer();
        await cache.put(cacheKey,new Response(body,{status:copy.status,statusText:copy.statusText,headers}));
      }else{
        await cache.put(cacheKey||request,response.clone());
      }
    }
    return response;
  }catch(e){
    return null;
  }
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(url.pathname.endsWith("/site-data.json")){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const key="./site-data.json";
      const cached=await cache.match(key);
      if(cached){
        const cachedAt=Number(cached.headers.get("x-kep-cached-at")||0);
        if(!cachedAt||Date.now()-cachedAt>120000)event.waitUntil(refresh(request,key));
        return cached;
      }
      return (await refresh(request,key))||Response.error();
    })());
    return;
  }

  if(request.mode==="navigate"&&(url.pathname==="/"||url.pathname==="/index.html")){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match("./index.html");
      if(cached){
        event.waitUntil(refresh(request,"./index.html"));
        return cached;
      }
      return (await refresh(request,"./index.html"))||Response.error();
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    const update=refresh(request);
    if(cached){
      event.waitUntil(update);
      return cached;
    }
    return (await update)||Response.error();
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
