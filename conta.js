/* Conta do Ako: botão "Entrar" na faixa do topo de todas as páginas.
   Entrar é opcional e pede o aceite da política de privacidade antes do login com o Google.
   Depois de entrar, o botão some e trilhas, roteiro e mapas passam a ter uma cópia na conta
   (a Rotina sincroniza pela própria página, com /nuvem.js). Quem não entra segue com tudo no navegador. */
(function () {
  'use strict';

  var CONTA = 'rizzygo-conta-v1';
  /* Mesmas chaves de trilhas/app.js e trilhas/mapas/mapas.js. Trilha nova: acrescente aqui também. */
  var TRILHAS = [
    { id: 'primeiros-passos', chave: 'rizzygo-trilhas-v1' },
    { id: 'platform-engineering', chave: 'rizzygo-trilha-platform-engineering-v1' }
  ];
  var MAPAS = 'rizzygo-mapas-v1';

  function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
  function ligada() { var c = ler(CONTA); return !!(c && c.ligado); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function avisarPagina(app) { window.dispatchEvent(new CustomEvent('rizzygo-nuvem', { detail: { app: app } })); }

  var usuario = null, mod = null, carregando = null, apps = {}, metas = {}, conhecido = false;

  /* ---------- juntar o que já existe nos dois lados (só na primeira vez) ---------- */
  function juntarTrilha(a, b) {
    if (!a) return b;
    if (!b) return a;
    var r = JSON.parse(JSON.stringify(b));
    r.perfil = b.perfil || a.perfil;
    r.caminho = b.caminho || a.caminho;
    r.topicos = r.topicos || {};
    Object.keys(a.topicos || {}).forEach(function (id) {
      var x = a.topicos[id], y = r.topicos[id];
      if (!y) { r.topicos[id] = x; return; }
      var cx = x.check || [], cy = y.check || [], c = [];
      for (var i = 0; i < Math.max(cx.length, cy.length); i++) c[i] = !!(cx[i] || cy[i]);
      y.check = c;
      if (x.quiz && y.quiz) {
        y.quiz = Object.assign({}, x.quiz, y.quiz, {
          tentativas: (x.quiz.tentativas || 0) + (y.quiz.tentativas || 0),
          melhor: Math.max(x.quiz.melhor || 0, y.quiz.melhor || 0),
          aprovado: !!(x.quiz.aprovado || y.quiz.aprovado),
          primeiraPerfeita: !!(x.quiz.primeiraPerfeita || y.quiz.primeiraPerfeita)
        });
      } else y.quiz = y.quiz || x.quiz;
      if ((x.reflexao || '').length > (y.reflexao || '').length) y.reflexao = x.reflexao;
      y.ensinei = !!(x.ensinei || y.ensinei);
    });
    r.dias = (a.dias || []).concat(r.dias || []).filter(function (d, i, l) { return l.indexOf(d) === i; }).sort();
    r.conquistas = r.conquistas || {};
    Object.keys(a.conquistas || {}).forEach(function (k) {
      if (!r.conquistas[k] || a.conquistas[k] < r.conquistas[k]) r.conquistas[k] = a.conquistas[k];
    });
    var vistas = {};
    r.revisoes = (a.revisoes || []).concat(r.revisoes || []).filter(function (v) { var k = JSON.stringify(v); if (vistas[k]) return false; vistas[k] = 1; return true; });
    return r;
  }
  function juntarMapas(a, b) {
    if (!a) return b;
    if (!b) return a;
    var r = { versao: 1, nos: Object.assign({}, a.nos || {}) };
    Object.keys(b.nos || {}).forEach(function (k) { if (r.nos[k] !== 'feito') r.nos[k] = b.nos[k]; });
    return r;
  }

  /* ---------- configuração de cada app para /nuvem.js ---------- */
  function meta(app) {
    if (!metas[app]) {
      metas[app] = ler('rizzygo-nuvem-' + app + '-v1') || {};
      metas[app].aceites = { saude: false, reflexoes: false }; // só a Rotina usa
    }
    return metas[app];
  }
  var CFG = {
    trilhas: {
      ler: function () { var o = {}; TRILHAS.forEach(function (t) { o[t.id] = ler(t.chave); }); return o; },
      temDados: function (o) { return TRILHAS.some(function (t) { return !!o[t.id]; }); },
      gravar: function (o) { TRILHAS.forEach(function (t) { gravar(t.chave, o[t.id] || null); }); },
      juntar: function (rem, loc) { var o = {}; TRILHAS.forEach(function (t) { o[t.id] = juntarTrilha(rem[t.id], loc[t.id]); }); return o; }
    },
    mapas: {
      ler: function () { return ler(MAPAS); },
      temDados: function (o) { return !!(o && o.nos && Object.keys(o.nos).length); },
      gravar: function (o) { gravar(MAPAS, o); },
      juntar: juntarMapas
    }
  };
  function criarApps(m) {
    Object.keys(CFG).forEach(function (app) {
      var c = CFG[app];
      apps[app] = m.criar({
        app: app, meta: meta(app),
        salvarMeta: function (x) { gravar('rizzygo-nuvem-' + app + '-v1', x); },
        ler: c.ler, temDados: c.temDados, juntar: c.juntar,
        paraNuvem: function (e) { return e; },
        daNuvem: function (rem) { return rem; },
        aplicar: function (e, avisar) {
          c.gravar(e);
          avisarPagina(app);
          if (avisar) toast('Trouxe seu progresso da conta.');
        },
        aoMudar: function () { desenhar(); }
      });
    });
  }

  function carregar() {
    if (mod) return Promise.resolve(mod);
    if (!carregando) carregando = import('/nuvem.js').then(function (m) {
      mod = m;
      criarApps(m);
      m.aoMudarConta(function (u) { usuario = u; conhecido = true; desenhar(); });
      return m;
    }, function (e) { carregando = null; throw e; });
    return carregando;
  }

  /* ---------- estilo (vale nas páginas com e sem o design system) ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.conta-entrar{margin-left:auto;cursor:pointer;font:inherit;font-weight:700;font-size:.88rem;background:#F5A524;border-color:#F5A524;color:#0B1B3A}' +
    '.conta-entrar[hidden]{display:none}.conta-entrar:hover{background:#FFC048;border-color:#FFC048;color:#0B1B3A}' +
    '.conta-dialogo{max-width:30rem;width:calc(100% - 32px);border:0;border-radius:12px;padding:1.4rem 1.4rem 1.2rem;background:#FFFFFF;color:#0B1B3A;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;line-height:1.5;box-shadow:0 20px 50px rgba(11,27,58,.35)}' +
    '.conta-dialogo::backdrop{background:rgba(11,27,58,.55)}' +
    '.conta-dialogo h2{font-family:Outfit,system-ui,sans-serif;font-size:1.35rem;line-height:1.25;margin:0 0 .6rem}' +
    '.conta-dialogo p,.conta-dialogo ul{margin:0 0 .7rem}.conta-dialogo ul{padding-left:1.2rem}' +
    '.conta-dialogo .suave{color:#4A5672;font-size:.95rem}.conta-dialogo a{color:#1F4FD8}' +
    '.conta-aceite{display:flex;gap:.55rem;align-items:flex-start;background:#F5F7FB;border-radius:8px;padding:.7rem .8rem;margin:.2rem 0 .6rem;cursor:pointer}' +
    '.conta-aceite input{width:1.15rem;height:1.15rem;margin-top:.2rem;flex:none;accent-color:#1F4FD8}' +
    '.conta-msg{min-height:1.2em;color:#B42318;font-size:.95rem}' +
    '.conta-acoes{display:flex;flex-wrap:wrap;gap:.6rem}' +
    '.conta-acoes button{font:700 1rem "Atkinson Hyperlegible",system-ui,sans-serif;border-radius:8px;padding:.65rem 1.1rem;cursor:pointer;border:2px solid #1F4FD8}' +
    '.conta-google{background:#1F4FD8;color:#FFFFFF}.conta-google:disabled{opacity:.45;cursor:not-allowed}' +
    '.conta-nao{background:transparent;color:#1F4FD8}' +
    '.conta-toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:60;max-width:calc(100% - 32px);background:#0B1B3A;color:#FFFFFF;padding:.75rem 1.1rem;border-radius:10px;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}' +
    '.conta-painel{border:1px solid rgba(31,79,216,.25);border-radius:10px;padding:.9rem 1rem;margin:1rem 0}' +
    '.conta-painel p{margin:0 0 .6rem}.conta-painel .acoes{margin-top:.4rem}' +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .conta-dialogo{background:#111D3A;color:#E8ECF6}:root:not([data-theme="light"]) .conta-dialogo .suave{color:#AEB9D3}:root:not([data-theme="light"]) .conta-dialogo a{color:#8FB0FF}:root:not([data-theme="light"]) .conta-aceite{background:#1A284B}:root:not([data-theme="light"]) .conta-nao{color:#8FB0FF;border-color:#8FB0FF}:root:not([data-theme="light"]) .conta-msg{color:#FF9B8F}}' +
    ':root[data-theme="dark"] .conta-dialogo{background:#111D3A;color:#E8ECF6}:root[data-theme="dark"] .conta-dialogo .suave{color:#AEB9D3}:root[data-theme="dark"] .conta-aceite{background:#1A284B}' +
    '@media (max-width:380px){.conta-entrar{padding-left:.6rem;padding-right:.6rem}}';
  document.head.appendChild(css);

  /* ---------- botão na faixa do topo ---------- */
  var botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'familia-item conta-entrar';
  botao.id = 'conta-entrar';
  botao.textContent = 'Entrar';
  botao.title = 'Entre com o Google para salvar seu progresso e continuar em qualquer aparelho';
  botao.hidden = ligada(); // quem já entrou não vê o botão nem por um instante
  var faixa = document.querySelector('.familia-in');
  if (faixa) faixa.appendChild(botao);
  botao.addEventListener('click', function () { abrir(); });

  /* ---------- janela do aceite ---------- */
  var dlg = document.createElement('dialog');
  dlg.className = 'conta-dialogo';
  dlg.id = 'conta-dialogo';
  dlg.setAttribute('aria-labelledby', 'conta-titulo');
  dlg.innerHTML =
    '<h2 id="conta-titulo">Salve seu progresso e continue de qualquer aparelho</h2>' +
    '<p>Entre com a sua conta Google e o Ako guarda uma cópia de:</p>' +
    '<ul><li>seu roteiro de estudo e as respostas das quatro perguntas;</li><li>o progresso nas trilhas: checklists, desafios e respostas da pergunta Ako;</li><li>o que você marcou nos mapas das áreas;</li><li>a Rotina com a Zumi.</li></ul>' +
    '<p class="suave">Lembretes de saúde e reflexões da Rotina só vão para a conta se você ligar nos Ajustes da Rotina. Não entrar também vale: tudo continua funcionando, salvo só neste navegador.</p>' +
    '<label class="conta-aceite"><input type="checkbox" id="conta-aceite"><span>Li a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a> e aceito guardar meu progresso na minha conta.</span></label>' +
    '<p class="conta-msg" id="conta-msg" role="alert"></p>' +
    '<div class="conta-acoes"><button type="button" class="conta-google" id="conta-google" disabled>Entrar com Google</button><button type="button" class="conta-nao" id="conta-nao">Agora não</button></div>';
  document.body.appendChild(dlg);
  var aceite = dlg.querySelector('#conta-aceite'), google = dlg.querySelector('#conta-google'), msg = dlg.querySelector('#conta-msg');

  function abrir() {
    msg.textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    aceite.focus();
  }
  function fechar() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  dlg.querySelector('#conta-nao').addEventListener('click', fechar);
  dlg.addEventListener('click', function (ev) { if (ev.target === dlg) fechar(); });
  // O módulo carrega no aceite, para a janela do Google abrir direto no clique (sem bloqueio de pop-up).
  aceite.addEventListener('change', function () {
    if (!aceite.checked) { google.disabled = true; return; }
    msg.textContent = '';
    google.textContent = 'Preparando...';
    carregar().then(function () { google.textContent = 'Entrar com Google'; google.disabled = !aceite.checked; }, function () {
      google.textContent = 'Entrar com Google';
      msg.textContent = 'Não deu para conectar agora. Confira a internet e tente de novo.';
    });
  });
  google.addEventListener('click', function () {
    if (!mod || !aceite.checked) return;
    google.disabled = true; msg.textContent = '';
    mod.entrarGoogle().then(function (u) {
      fechar();
      aceite.checked = false; google.disabled = true;
      toast('Pronto' + (u && u.nome ? ', ' + u.nome.split(' ')[0] : '') + '. Seu progresso agora fica salvo na sua conta.');
    }, function (e) { msg.textContent = e.message; google.disabled = false; });
  });

  /* ---------- aviso rápido ---------- */
  var toastEl = null, toastT;
  function toast(t) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'conta-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 4500);
  }

  /* ---------- painéis: [data-conta-painel] (data-contexto="roteiro" muda o texto) ---------- */
  function painelHTML(el) {
    var roteiro = el.getAttribute('data-contexto') === 'roteiro';
    if (usuario) {
      var quem = esc(usuario.email || usuario.nome || 'Google');
      var m = meta('trilhas');
      var quando = m.sincronizadoEm ? ' Última cópia: ' + new Date(m.sincronizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '.' : '';
      return roteiro
        ? '<p><strong>Roteiro salvo na sua conta</strong> (' + quem + '). Abra o Ako em outro aparelho, entre com a mesma conta e continue de onde parou.</p>'
        : '<p>Você entrou como <strong>' + quem + '</strong>. Roteiro, trilhas, mapas e Rotina ficam salvos nessa conta.' + quando + '</p>' +
          '<div class="acoes"><button class="btn btn-sec" type="button" data-conta="sair">Sair da conta</button><button class="btn btn-perigo" type="button" data-conta="apagar">Apagar conta e dados da nuvem</button></div>' +
          '<p class="conta-msg" data-conta-msg role="alert"></p>';
    }
    return roteiro
      ? '<p><strong>Seu roteiro está salvo só neste navegador.</strong> Quer abrir no celular ou em outro computador? Entre com a sua conta Google e ele vai junto, com todo o progresso.</p>' +
        '<div class="acoes"><button class="btn" type="button" data-conta="entrar">Salvar meu roteiro na conta</button></div>'
      : '<p>Seu progresso está salvo só neste navegador. Entre com a sua conta Google para guardar uma cópia e continuar em qualquer aparelho.</p>' +
        '<div class="acoes"><button class="btn" type="button" data-conta="entrar">Entrar para salvar</button></div>';
  }
  function desenhar() {
    var dentro = !!usuario || (!conhecido && ligada());
    botao.hidden = dentro;
    document.querySelectorAll('[data-conta-painel]').forEach(function (el) {
      if (!conhecido && ligada()) return; // espera saber quem é
      el.className = (el.className.replace(/\bconta-painel\b/, '') + ' conta-painel').trim();
      el.innerHTML = painelHTML(el);
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-conta]');
    if (!b) return;
    var acao = b.getAttribute('data-conta');
    var painel = b.closest('[data-conta-painel]');
    var aviso = painel && painel.querySelector('[data-conta-msg]');
    if (acao === 'entrar') abrir();
    else if (acao === 'sair' && mod) {
      b.disabled = true;
      mod.sairDaConta().then(function () { toast('Você saiu. O progresso segue neste navegador.'); }, function () { b.disabled = false; if (aviso) aviso.textContent = 'Não deu para sair agora. Tente de novo.'; });
    } else if (acao === 'apagar' && mod) {
      if (!confirm('Apagar sua conta e todos os dados do Ako na nuvem? O progresso deste navegador continua aqui. Não tem como desfazer.')) return;
      b.disabled = true;
      mod.apagarConta().then(function () { usuario = null; desenhar(); toast('Conta e dados da nuvem apagados. O progresso segue neste navegador.'); },
        function () { b.disabled = false; if (aviso) aviso.textContent = 'Não deu para apagar agora. Tente de novo em instantes.'; });
    }
  });

  /* ---------- sincronização enquanto a página está aberta ---------- */
  // Entrou por outro lugar (Ajustes da Rotina): trilhas e mapas ligam junto.
  window.addEventListener('rizzygo-conta', function () { carregar().catch(function () { }); });
  window.addEventListener('rizzygo-salvou', function (ev) { var a = apps[ev.detail]; if (a) a.mudou(); });
  document.addEventListener('visibilitychange', function () {
    Object.keys(apps).forEach(function (k) { if (document.hidden) apps[k].agora(); else apps[k].puxar(); });
  });

  window.AkoConta = { abrir: abrir, desenhar: desenhar, entrou: function () { return !!usuario; } };
  desenhar();
  if (ligada()) carregar().catch(function () { /* sem internet: segue no navegador */ });
})();
