/* =====================================================================
   Tema claro e escuro da Rizzygo (design system, versão 1)
   Um arquivo só, igual nos dois sites, como o rizzygo.css:
     rizzygo-website/ds/tema.js  -> rizzygo.com.br e rizzo.rizzygo.com.br
     ako/ds/tema.js              -> ako.rizzygo.com.br
   Carregue no <head>, sem defer, logo depois do rizzygo.css: assim a
   página já abre no tema escolhido, sem piscar.

   - Sem escolha salva, a página segue o sistema (prefers-color-scheme).
   - O botão sol/lua entra no fim da faixa .familia e alterna claro e escuro.
   - A escolha fica no navegador: cookie em .rizzygo.com.br (vale para os
     três sites) e localStorage (vale nas prévias e no localhost).
   - <picture> da Zumi com <source media="(prefers-color-scheme: dark)">
     acompanha a escolha.
   - Na impressão e no "Salvar em PDF", a página usa sempre o tema claro.
   - No Ako, quem entrou na conta leva a escolha para outros aparelhos:
     o /conta.js lê e grava por window.RizzygoTema e ouve o evento
     'rizzygo-salvou' (detalhe 'ajustes') que o clique dispara.
   ===================================================================== */
(function () {
  var CHAVE = 'rizzygo-tema';
  var raiz = document.documentElement;
  var sistema = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function lerCookie() {
    var m = document.cookie.match(/(?:^|;\s*)rizzygo-tema=(claro|escuro)/);
    return m ? m[1] : null;
  }
  function salva() {
    var v = lerCookie();
    if (v) return v;
    try { v = localStorage.getItem(CHAVE); } catch (e) { v = null; }
    return v === 'claro' || v === 'escuro' ? v : null;
  }
  function salvar(v) {
    var dominio = /(^|\.)rizzygo\.com\.br$/.test(location.hostname) ? '; domain=.rizzygo.com.br' : '';
    document.cookie = CHAVE + '=' + v + '; path=/; max-age=31536000; SameSite=Lax' + dominio + (location.protocol === 'https:' ? '; Secure' : '');
    try { localStorage.setItem(CHAVE, v); } catch (e) {}
  }
  function atual() {
    var v = salva();
    if (v) return v;
    return sistema && sistema.matches ? 'escuro' : 'claro';
  }

  // A Zumi tem uma versão para fundo escuro, escolhida pelo <picture>.
  function figuras(v, forcar) {
    var fontes = document.querySelectorAll('source[media*="prefers-color-scheme"], source[data-media-tema]');
    for (var i = 0; i < fontes.length; i++) {
      var s = fontes[i];
      if (!s.hasAttribute('data-media-tema')) s.setAttribute('data-media-tema', s.getAttribute('media'));
      var original = s.getAttribute('data-media-tema');
      if ((!forcar && !salva()) || original.indexOf('dark') < 0) s.setAttribute('media', original);
      else s.setAttribute('media', v === 'escuro' ? 'all' : 'not all');
    }
  }

  var ICONE_LUA = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5a8.5 8.5 0 1 0 10.9 10.9z" fill="currentColor"/></svg>';
  var ICONE_SOL = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>';
  var botao = null;

  function aplicar() {
    var escolha = salva();
    if (escolha) raiz.setAttribute('data-theme', escolha === 'escuro' ? 'dark' : 'light');
    else raiz.removeAttribute('data-theme');
    var v = atual();
    if (botao) {
      var proximo = v === 'escuro' ? 'claro' : 'escuro';
      botao.innerHTML = v === 'escuro' ? ICONE_SOL : ICONE_LUA;
      botao.setAttribute('aria-label', 'Usar o tema ' + proximo + (proximo === 'claro' ? ' (dia)' : ' (noite)'));
      botao.title = proximo === 'claro' ? 'Tema claro (dia)' : 'Tema escuro (noite)';
    }
    figuras(v);
  }

  aplicar(); // antes de a página aparecer

  // Para a conta do Ako: ler() devolve 'claro', 'escuro' ou null (segue o sistema); definir() troca sem disparar evento.
  window.RizzygoTema = {
    ler: salva,
    definir: function (v) {
      if (v !== 'claro' && v !== 'escuro') return;
      if (v !== salva()) { salvar(v); aplicar(); }
    }
  };

  function montar() {
    var faixa = document.querySelector('.familia-in');
    if (!faixa || document.querySelector('.tema-botao')) return;
    botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'tema-botao';
    botao.addEventListener('click', function () {
      salvar(atual() === 'escuro' ? 'claro' : 'escuro');
      raiz.classList.add('tema-trocando');
      aplicar();
      setTimeout(function () { raiz.classList.remove('tema-trocando'); }, 400);
      window.dispatchEvent(new CustomEvent('rizzygo-salvou', { detail: 'ajustes' }));
    });
    faixa.appendChild(botao);
    aplicar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();

  // Sem escolha salva, acompanha a troca do sistema (por exemplo, o modo noturno automático).
  if (sistema) {
    var mudou = function () { if (!salva()) aplicar(); };
    if (sistema.addEventListener) sistema.addEventListener('change', mudou);
    else if (sistema.addListener) sistema.addListener(mudou);
  }
  // Outra aba ou outro site da família trocou o tema: segue junto ao voltar para esta aba.
  window.addEventListener('storage', function (e) { if (e.key === CHAVE) aplicar(); });
  window.addEventListener('pageshow', aplicar);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) aplicar(); });

  // Impressão e PDF sempre no claro.
  var antes = null;
  window.addEventListener('beforeprint', function () {
    antes = raiz.getAttribute('data-theme');
    raiz.setAttribute('data-theme', 'light');
    figuras('claro', true);
  });
  window.addEventListener('afterprint', function () {
    if (antes) raiz.setAttribute('data-theme', antes); else raiz.removeAttribute('data-theme');
    antes = null;
    aplicar();
  });
})();
