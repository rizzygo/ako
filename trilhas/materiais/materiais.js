/* Botão de copiar nos blocos de comando das lições. */
(function () {
  document.querySelectorAll('.cmd').forEach(function (bloco) {
    var pre = bloco.querySelector('pre');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copiar';
    btn.textContent = 'Copiar';
    btn.setAttribute('aria-label', 'Copiar comando');
    bloco.appendChild(btn);
    btn.addEventListener('click', function () {
      var texto = pre.textContent;
      function feito(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Copiar'; }, 1600); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(function () { feito('Copiado'); }, function () { selecionar(); });
      } else { selecionar(); }
      function selecionar() {
        var r = document.createRange(); r.selectNodeContents(pre);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        feito('Use Ctrl+C');
      }
    });
  });
})();
