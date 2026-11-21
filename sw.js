const CACHE_NAME="kamrul-eagle-v24";
const CORE_URLS=["./","./index.html"];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_URLS.map(async url=>{
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

async function networkWithTimeout(request,milliseconds){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),milliseconds);
  try{return await fetch(request,{cache:"no-store",signal:controller.signal});}
  finally{clearTimeout(timer);}
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes("/rest/")||url.pathname.includes("/functions/"))return;

  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await networkWithTimeout(request,3500);
        if(response&&response.ok)await cache.put("./index.html",response.clone());
        return response;
      }catch(e){
        return (await cache.match("./index.html"))||(await cache.match("./"))||Response.error();
      }
    })());
    return;
  }

  const isData=url.pathname.endsWith("/site-data.json")||url.pathname.endsWith("site-data.json");
  if(isData){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await networkWithTimeout(request,4000);
        if(response&&response.ok)await cache.put(request,response.clone());
        return response;
      }catch(e){
        return (await cache.match(request))||Response.error();
      }
    })());
    return;
  }

  if(url.pathname.endsWith(".js")||url.pathname.endsWith(".css")||/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(request);
      const update=fetch(request).then(response=>{
        if(response&&response.ok)cache.put(request,response.clone());
        return response;
      }).catch(()=>null);
      if(cached){event.waitUntil(update);return cached;}
      return (await update)||Response.error();
    })());
  }
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
