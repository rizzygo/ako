/* A Iniciativa Ako mudou de endereço: de rizzygo.github.io/iniciativa-ako para ako.rizzygo.com.br.
   No endereço antigo, este script confere se o novo já responde e leva a pessoa para a mesma página lá.
   Na página das trilhas, leva junto o progresso salvo no navegador, porque o localStorage não passa
   de um domínio para outro. O progresso vai no fragmento (#), que não é enviado a nenhum servidor. */
(function () {
  'use strict';

  var ANTIGO = 'rizzygo.github.io';
  var BASE_ANTIGA = '/iniciativa-ako/';
  var NOVO = 'https://ako.rizzygo.com.br/';
  var CHAVE = 'rizzygo-trilhas-v1';

  if (location.hostname !== ANTIGO || location.pathname.indexOf(BASE_ANTIGA) !== 0) return;
  if (!window.fetch) return;

  var caminho = location.pathname.slice(BASE_ANTIGA.length);
  var destino = NOVO + caminho;
  var fragmento = location.hash;

  if (caminho === 'trilhas/' || caminho === 'trilhas/index.html') {
    try {
      var progresso = localStorage.getItem(CHAVE);
      if (progresso) fragmento = '#migrar=' + encodeURIComponent(progresso);
    } catch (e) { /* sem acesso ao localStorage: segue sem levar o progresso */ }
  }

  /* Só redireciona se o endereço novo responder. Sem resposta, a pessoa continua aqui. */
  fetch(NOVO + 'trilhas/dados/primeiros-passos.json', { mode: 'no-cors', cache: 'no-store' })
    .then(function () { location.replace(destino + fragmento); })
    .catch(function () { /* endereço novo ainda fora do ar */ });
})();
