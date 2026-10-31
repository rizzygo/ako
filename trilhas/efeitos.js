// Efeitos: entrada ao rolar, igual ao rizzygo.com.br. O app redesenha a página
// a cada rota, então os elementos novos são marcados de novo quando aparecem.
(function () {
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calmo || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');

  var GRUPOS = ['.passos > li', '.principios > div', '.ako', '.lista-materiais > li', '.lista-mapas > li',
    '.licao section', '.ramo', '.secao h2'];

  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('visivel');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  function marcar() {
    GRUPOS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        if (el.classList.contains('revela')) return;
        el.classList.add('revela');
        el.style.setProperty('--i', i % 6);
        obs.observe(el);
      });
    });
  }

  marcar();
  var espera;
  new MutationObserver(function () {
    clearTimeout(espera);
    espera = setTimeout(marcar, 30);
  }).observe(document.getElementById('conteudo') || document.body, { childList: true, subtree: true });
})();
