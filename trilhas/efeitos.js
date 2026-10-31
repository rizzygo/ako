// Efeitos iguais aos do rizzygo.com.br (site.js). O app redesenha a página
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

  // Título da capa: cada palavra sobe em sequência.
  function quebrar(h1) {
    var n = 0;
    (function andar(no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          var frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.className = 'palavra'; s.style.setProperty('--i', n++); s.textContent = p;
            frag.appendChild(s);
          });
          no.replaceChild(frag, filho);
        } else if (filho.nodeType === 1) andar(filho);
      });
    })(h1);
  }

  // Luz que acompanha o cursor nos cartões.
  function acender(el) {
    el.classList.add('luz');
    el.addEventListener('pointermove', function (ev) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  }

  function enfeitar() {
    marcar();
    document.querySelectorAll('.hero h1:not([data-quebrado])').forEach(function (h1) {
      h1.setAttribute('data-quebrado', '');
      quebrar(h1);
    });
    document.querySelectorAll('.lista-materiais > li, .lista-mapas a').forEach(function (el) {
      if (!el.classList.contains('luz')) acender(el);
    });
    medir();
  }

  // Barra de leitura nas páginas longas.
  var barra = document.createElement('div');
  barra.className = 'progresso'; barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);
  var pendente = false;
  function medir() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    barra.hidden = document.documentElement.scrollHeight <= window.innerHeight * 3;
    barra.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (pendente) return; pendente = true;
    requestAnimationFrame(function () { medir(); pendente = false; });
  }, { passive: true });

  enfeitar();
  var espera;
  new MutationObserver(function () {
    clearTimeout(espera);
    espera = setTimeout(enfeitar, 30);
  }).observe(document.getElementById('conteudo') || document.body, { childList: true, subtree: true });
})();
