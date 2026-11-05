// Botão "Copiar" dos blocos de instrução e de terminal das páginas dos Favos.
document.querySelectorAll('button.copy').forEach(function(btn){
  btn.addEventListener('click', function(){
    var el = document.getElementById(btn.dataset.target);
    var text = el.innerText;
    function done(){ var o = btn.textContent; btn.textContent = 'Copiado'; btn.setAttribute('data-done',''); setTimeout(function(){ btn.textContent = o; btn.removeAttribute('data-done'); }, 1800); }
    function selectIt(){ var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selecionado, use Ctrl+C'; setTimeout(function(){ btn.textContent = 'Copiar'; }, 2500); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, selectIt); }
      else { selectIt(); }
    } catch(e){ selectIt(); }
  });
});

// No celular, as abas rolam na horizontal: mostra a aba da página atual.
(function(){
  var atual = document.querySelector('.aba[aria-current="page"]');
  if (!atual) return;
  var faixa = atual.parentNode;
  if (faixa.scrollWidth > faixa.clientWidth) faixa.scrollLeft = atual.offsetLeft - 16;
})();
