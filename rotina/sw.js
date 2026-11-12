// Service worker da Rotina com a Zumi: deixa o app abrir sem internet e mostra as notificações.
var CACHE = 'rotina-2026111219';
var ARQUIVOS = [
  '/rotina/', '/rotina/rotina.css?v=2026111202', '/rotina/rotina.js?v=2026111219', '/mesclar.js?v=2026111101', '/vitoria.js?v=2026111020', '/nuvem.js?v=2026111106', '/conta.js?v=2026111210', '/topo.css?v=2026110914', '/ds/rizzygo.css?v=2026111020', '/ds/tema.js?v=2026111020', '/contribua.js?v=2026110901',
  '/zumi/abelha-mini.png', '/zumi/abelha-icone.png',
  '/zumi/abelha-ola.png', '/zumi/abelha-ola-fundo-escuro.png',
  '/zumi/abelha-estudando.png', '/zumi/abelha-estudando-fundo-escuro.png',
  '/zumi/abelha-ideia.png', '/zumi/abelha-ideia-fundo-escuro.png',
  '/zumi/abelha-comemorando.png', '/zumi/abelha-comemorando-fundo-escuro.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('rotina-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Rede primeiro, cache como reserva: quem está online sempre recebe a versão nova.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }); }));
});

// Tocar na notificação volta para o app.
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if (cs[i].url.indexOf('/rotina/') >= 0) return cs[i].focus(); }
    return self.clients.openWindow('/rotina/');
  }));
});
