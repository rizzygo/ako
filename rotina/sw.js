// Service worker da Rotina com a Zumi: deixa o app abrir sem internet, mostra as notificações e recebe o push
// dos lembretes com o app fechado (servidor em /push).
var CACHE = 'rotina-2026111223';
var ARQUIVOS = [
  '/rotina/', '/rotina/rotina.css?v=2026111222', '/rotina/rotina.js?v=2026111223', '/mesclar.js?v=2026111101', '/vitoria.js?v=2026111020', '/nuvem.js?v=2026111106', '/conta.js?v=2026111210', '/topo.css?v=2026110914', '/ds/rizzygo.css?v=2026111020', '/ds/tema.js?v=2026111020', '/contribua.js?v=2026110901',
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

// Configuração do push que o app guarda neste aparelho: endereço do servidor, id e nomes dos lembretes.
function dadosPush() {
  return caches.open('zumi-push').then(function (c) { return c.match('/rotina/__push'); })
    .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}

// Push do servidor: o corpo traz só a chave do lembrete; o nome vem do cache deste aparelho.
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { /* push sem corpo */ }
  var k = String(d.k || '');
  e.waitUntil(Promise.all([dadosPush(), self.clients.matchAll({ type: 'window', includeUncontrolled: true })]).then(function (r) {
    var nomes = r[0].nomes || {};
    // Com a Rotina na frente, o próprio app já mostra o aviso. Só o Chrome deixa pular a notificação;
    // Safari e Firefox cortam o push de quem recebe sem mostrar nada.
    var naFrente = r[1].some(function (c) { return c.url.indexOf('/rotina/') >= 0 && c.focused; });
    if (naFrente && /Chrome|Edg/.test(navigator.userAgent)) return;
    return self.registration.showNotification('Zumi lembrando', {
      body: nomes[k] || 'Hora de um lembrete seu.', icon: '/zumi/abelha-icone.png', badge: '/icones/icone-192.png',
      tag: 'lem-' + k, renotify: true, data: { k: k },
      actions: [{ action: 'depois', title: 'Daqui a 10 min' }, { action: 'pular', title: 'Ignorar dessa vez' }]
    });
  }));
});

// Tocar na notificação volta para o app. Os botões do push adiam ou pulam sem abrir o app.
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var k = e.notification.data && e.notification.data.k;
  if (e.action === 'pular') return;
  if (e.action === 'depois') {
    e.waitUntil(dadosPush().then(function (cfg) {
      if (!cfg.api || !cfg.id || !k) return;
      return fetch(cfg.api + '/adiar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cfg.id, k: k, em: Date.now() + 10 * 60 * 1000 }) });
    }).catch(function () {}));
    return;
  }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].url.indexOf('/rotina/') >= 0) { if (k) cs[i].postMessage({ lembrete: k }); return cs[i].focus(); }
    }
    return self.clients.openWindow('/rotina/' + (k ? '?lem=' + encodeURIComponent(k) : ''));
  }));
});
