const CACHE='anime-mood-v0.7';
const ASSETS=['./','./index.html','./app.js?v=9','./manifest.webmanifest','./assets/anime-mood.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith((async()=>{
    try{
      const network=await fetch(event.request);
      if(event.request.mode==='navigate'){
        const cache=await caches.open(CACHE);
        await cache.put('./index.html',network.clone());
      }
      return network;
    }catch{
      const cached=await caches.match(event.request);
      return cached||caches.match('./index.html');
    }
  })());
});