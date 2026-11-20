const CACHE='nz-schetterhaufen-app-v21-3';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png','./hero-original.jpg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(name=>name!==CACHE&&(name.startsWith('nz-schetterhaufen-app-')||name.startsWith('zunftcheck-v'))).map(name=>caches.delete(name)));await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const matches=await Promise.all(SHELL.map(url=>cache.match(url)));event.ports[0]?.postMessage({ready:matches.every(Boolean)})})())});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);
    if(request.mode==='navigate'){
      try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const path=new URL(request.url).pathname;const scopePath=new URL(self.registration.scope).pathname;if(path===scopePath||path===scopePath+'index.html')await cache.put('./index.html',response.clone())}return response}
      catch{return(await cache.match('./index.html'))||(await cache.match('./'))||Response.error()}
    }
    const cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;
    try{return await fetch(request)}catch{return Response.error()}
  })());
});
