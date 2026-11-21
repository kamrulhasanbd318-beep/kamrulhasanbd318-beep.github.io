const CACHE_NAME="kamrul-eagle-v22";

self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("kamrul-eagle-")).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(request,{cache:"no-store"}));
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
