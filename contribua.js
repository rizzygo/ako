/* Contribuição voluntária no rodapé: botão que copia a chave Pix. */
(function () {
  'use strict';
  document.querySelectorAll('.contribua-copiar').forEach(function (bt) {
    var original = bt.textContent;
    bt.hidden = false;
    bt.addEventListener('click', function () {
      var chave = bt.getAttribute('data-pix');
      var feito = function () {
        bt.textContent = 'Chave copiada';
        setTimeout(function () { bt.textContent = original; }, 2500);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(chave).then(feito, function () { reserva(chave) && feito(); });
      } else if (reserva(chave)) {
        feito();
      }
    });
  });
  function reserva(texto) {
    var campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(campo);
    return ok;
  }
})();
