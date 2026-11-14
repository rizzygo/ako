// A Rotina mudou para rotina.rizzygo.com.br. Este service worker substitui o antigo, apaga o cache
// do app e se desliga. A página /rotina/ leva a pessoa (e os dados do aparelho) para o endereço novo.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('rotina-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' });
  }).then(function (cs) { cs.forEach(function (c) { c.navigate(c.url); }); }));
});
