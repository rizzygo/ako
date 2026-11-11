/* Conta do Ako: botão "Entrar" na faixa do topo de todas as páginas.
   Entrar é opcional e pede o aceite da política de privacidade antes do login (Google ou e-mail e senha).
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
  /* Ajustes do navegador que também vão para a conta: tema claro/escuro (/ds/tema.js) e som de vitória (/vitoria.js). */
  var SOM = 'ako-som-vitoria';

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
    },
    ajustes: {
      ler: function () {
        var som = null;
        try { som = localStorage.getItem(SOM); } catch (e) { /* modo privado */ }
        return { tema: window.RizzygoTema ? window.RizzygoTema.ler() : null, som: som === 'sim' || som === 'nao' ? som : null };
      },
      temDados: function (o) { return !!(o && (o.tema || o.som)); },
      gravar: function (o) {
        o = o || {};
        if ((o.tema === 'claro' || o.tema === 'escuro') && window.RizzygoTema) window.RizzygoTema.definir(o.tema);
        if (o.som === 'sim' || o.som === 'nao') { try { localStorage.setItem(SOM, o.som); } catch (e) { /* modo privado */ } }
      },
      // Primeira vez neste aparelho: o que já está na conta vale; o aparelho completa o que falta.
      juntar: function (rem, loc) { rem = rem || {}; loc = loc || {}; return { tema: rem.tema || loc.tema || null, som: rem.som || loc.som || null }; }
    }
  };
  /* Trilhas, mapas e ajustes vão juntos num documento só ('ako'): uma leitura por página em vez de três.
     Na primeira vez, /nuvem.js traz o que estava nos três documentos antigos. */
  var PARTES = ['trilhas', 'mapas', 'ajustes'];
  var parte = function (o, p) { return (o && o[p]) || {}; };
  var AKO = {
    ler: function () { var o = {}; PARTES.forEach(function (p) { o[p] = CFG[p].ler(); }); return o; },
    temDados: function (o) { return PARTES.some(function (p) { return CFG[p].temDados(parte(o, p)); }); },
    juntar: function (rem, loc) {
      return {
        trilhas: CFG.trilhas.juntar(parte(rem, 'trilhas'), parte(loc, 'trilhas')),
        mapas: juntarMapas(rem && rem.mapas, loc && loc.mapas),
        ajustes: CFG.ajustes.juntar(rem && rem.ajustes, loc && loc.ajustes)
      };
    },
    antigos: { apps: PARTES, juntar: function (e) { return { trilhas: e.trilhas || {}, mapas: e.mapas || null, ajustes: e.ajustes || null }; } }
  };
  var COTA_AVISADA = 'rizzygo-nuvem-cota-avisada';
  function criarApps(m) {
    apps.ako = m.criar({
      app: 'ako', meta: meta('ako'), releitura: 600000, // trilhas, mapas e ajustes quase não mudam: relê a cada 10 min por aba
      salvarMeta: function (x) { gravar('rizzygo-nuvem-ako-v1', x); },
      ler: AKO.ler, temDados: AKO.temDados, juntar: AKO.juntar, antigos: AKO.antigos,
      paraNuvem: function (e) { return e; },
      daNuvem: function (rem) { return rem; },
      aplicar: function (e, avisar) {
        var antes = AKO.ler(), mudou = false;
        PARTES.forEach(function (p) { if (e && e[p] !== undefined) CFG[p].gravar(e[p]); });
        var depois = AKO.ler();
        lembrar();
        ['trilhas', 'mapas'].forEach(function (p) {
          if (JSON.stringify(antes[p]) !== JSON.stringify(depois[p])) { mudou = true; avisarPagina(p); }
        });
        if (avisar && mudou) toast('Trouxe seu progresso da conta.');
      },
      aoMudar: function () {
        desenhar();
        // Cota cheia: avisa uma vez por dia, em qualquer página, para a pessoa não achar que a internet caiu.
        if (meta('ako').erro !== m.AVISO_COTA) return;
        var hoje = new Date().toDateString();
        if (ler(COTA_AVISADA) === hoje) return;
        gravar(COTA_AVISADA, hoje); toast(m.AVISO_COTA);
      }
    });
  }

  function carregar() {
    if (mod) return Promise.resolve(mod);
    if (!carregando) carregando = import('/nuvem.js?v=2026111106').then(function (m) {
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
    '.conta-entrar[hidden],.conta-sair[hidden]{display:none}.conta-sair{margin-left:auto;cursor:pointer;font:inherit;font-weight:600;font-size:.88rem;background:transparent}.conta-entrar:hover{background:#FFC048;border-color:#FFC048;color:#0B1B3A}' +
    '.conta-dialogo{--c-fundo:#FFFFFF;--c-tinta:#0B1B3A;--c-suave:#4A5672;--c-linha:#D8DEEA;--c-campo:#F5F7FB;--c-azul:#1F4FD8;--c-azul-claro:#EAF0FF;--c-erro:#B42318;--c-erro-fundo:#FDECEA;--c-ok:#14794A;--c-ok-fundo:#E6F5EC;' +
    'max-width:26rem;width:calc(100% - 24px);max-height:calc(100vh - 24px);overflow:auto;border:0;border-radius:20px;padding:0;background:var(--c-fundo);color:var(--c-tinta);font-family:"Atkinson Hyperlegible",system-ui,sans-serif;line-height:1.5;box-shadow:0 24px 64px -12px rgba(11,27,58,.45),0 0 0 1px rgba(11,27,58,.06)}' +
    '.conta-dialogo[open]{animation:conta-entra .22s cubic-bezier(.2,.9,.3,1.2)}' +
    '@keyframes conta-entra{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.conta-dialogo[open]{animation:none}}' +
    '.conta-dialogo::backdrop{background:rgba(11,27,58,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
    '.conta-dialogo [hidden]{display:none !important}' +
    '.conta-corpo{padding:1.6rem 1.5rem 1.3rem;position:relative}' +
    '.conta-fechar{position:absolute;top:.8rem;right:.8rem;width:2.2rem;height:2.2rem;border-radius:50%;border:0;background:var(--c-campo);color:var(--c-suave);font-size:1.3rem;line-height:1;cursor:pointer;display:grid;place-items:center}' +
    '.conta-fechar:hover{background:var(--c-linha);color:var(--c-tinta)}' +
    '.conta-cab{display:flex;align-items:center;gap:.8rem;margin:0 2.2rem .9rem 0}.conta-cab picture{flex:none;display:block}.conta-cab img{width:52px;height:52px;display:block}' +
    '.conta-dialogo h2{font:700 1.3rem/1.2 Outfit,system-ui,sans-serif;letter-spacing:-.01em;margin:0}' +
    '.conta-dialogo p{margin:0}.conta-dialogo a{color:var(--c-azul)}' +
    '.conta-sub{color:var(--c-suave);font-size:.95rem;margin-bottom:.8rem !important}' +
    '.conta-chips{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;margin:0 0 1rem;padding:0}' +
    '.conta-chips li{display:inline-flex;align-items:center;gap:.3rem;background:var(--c-azul-claro);color:var(--c-azul);border-radius:999px;padding:.25rem .7rem;font-size:.85rem;font-weight:700}' +
    '.conta-chips li::before{content:"✓";font-size:.8rem}' +
    '.conta-aceite{display:flex;gap:.65rem;align-items:flex-start;border:1.5px solid var(--c-linha);border-radius:14px;padding:.75rem .85rem;margin-bottom:1rem;cursor:pointer;font-size:.95rem;transition:border-color .15s,background-color .15s}' +
    '.conta-aceite:has(input:checked){border-color:var(--c-azul);background:var(--c-azul-claro)}' +
    '.conta-aceite input{width:1.2rem;height:1.2rem;margin-top:.15rem;flex:none;accent-color:var(--c-azul);cursor:pointer}' +
    '.conta-msg{border-radius:10px;font-size:.92rem}.conta-msg:not(:empty){padding:.55rem .75rem;margin-bottom:.8rem !important;background:var(--c-erro-fundo);color:var(--c-erro)}.conta-msg.ok:not(:empty){background:var(--c-ok-fundo);color:var(--c-ok)}' +
    '.conta-dialogo button{font-family:"Atkinson Hyperlegible",system-ui,sans-serif;cursor:pointer}' +
    '.conta-dialogo button:disabled{cursor:not-allowed}' +
    '.conta-google{display:flex;align-items:center;justify-content:center;gap:.7rem;width:100%;min-height:3rem;border-radius:999px;border:1.5px solid var(--c-linha);background:var(--c-fundo);color:var(--c-tinta);font-weight:700;font-size:1rem;transition:background-color .15s,border-color .15s,box-shadow .15s}' +
    '.conta-google:not(:disabled):hover{border-color:#AEB9D3;box-shadow:0 2px 8px rgba(11,27,58,.1)}.conta-google:disabled,.conta-dialogo fieldset:disabled{opacity:.45}' +
    '.conta-google svg{width:20px;height:20px;flex:none}' +
    '.conta-ou{display:flex;align-items:center;gap:.7rem;color:var(--c-suave);font-size:.85rem;margin:1rem 0 !important}.conta-ou::before,.conta-ou::after{content:"";flex:1;border-top:1px solid var(--c-linha)}' +
    '.conta-dialogo fieldset{border:0;padding:0;margin:0;min-width:0}' +
    '.conta-modos{display:grid;grid-template-columns:1fr 1fr;background:var(--c-campo);border-radius:999px;padding:4px;margin-bottom:.9rem}' +
    '.conta-modos button{border:0;border-radius:999px;background:transparent;color:var(--c-suave);font-weight:700;font-size:.92rem;padding:.45rem}' +
    '.conta-modos button[aria-pressed="true"]{background:var(--c-fundo);color:var(--c-tinta);box-shadow:0 1px 4px rgba(11,27,58,.15)}' +
    '.conta-dialogo label[for]{display:block;font-weight:700;font-size:.88rem;margin:0 0 .3rem}' +
    '.conta-campo{margin-bottom:.8rem}' +
    '.conta-dialogo input[type=email],.conta-dialogo input[type=password],.conta-dialogo input[type=text]{width:100%;box-sizing:border-box;min-height:3rem;font:1rem "Atkinson Hyperlegible",system-ui,sans-serif;padding:.65rem .9rem;border:1.5px solid var(--c-linha);border-radius:12px;background:var(--c-campo);color:var(--c-tinta);transition:border-color .15s,box-shadow .15s,background-color .15s}' +
    '.conta-dialogo input:focus{outline:none;border-color:var(--c-azul);background:var(--c-fundo);box-shadow:0 0 0 4px rgba(31,79,216,.18)}' +
    '.conta-senha{position:relative}.conta-senha input{padding-right:5.2rem !important}' +
    '.conta-senha button{position:absolute;right:.45rem;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--c-azul);font-weight:700;font-size:.85rem;padding:.4rem .55rem;border-radius:8px}' +
    '.conta-forca{display:flex;gap:4px;margin:.5rem 0 .25rem}.conta-forca i{flex:1;height:5px;border-radius:3px;background:var(--c-linha);transition:background-color .2s}' +
    '.conta-forca[data-nivel="0"] i:nth-child(1){background:#B42318}' +
    '.conta-forca[data-nivel="1"] i:nth-child(1){background:#D9480F}' +
    '.conta-forca[data-nivel="2"] i:nth-child(-n+2){background:#B87400}' +
    '.conta-forca[data-nivel="3"] i{background:#14794A}' +
    '.conta-forca-txt{font-size:.85rem;color:var(--c-suave);margin:.3rem 0 0 !important}' +
    '.conta-esqueci-linha{text-align:right;margin:-.35rem 0 .6rem !important}' +
    '.conta-link{background:none;border:0;color:var(--c-azul);font-weight:700;font-size:.88rem;padding:.2rem 0}' +
    '.conta-link:hover{text-decoration:underline}' +
    '.conta-enviar{width:100%;min-height:3rem;border:0;border-radius:999px;background:var(--c-azul);color:#FFFFFF;font-weight:700;font-size:1rem;margin-top:.2rem;transition:filter .15s,transform .15s}' +
    '.conta-enviar:not(:disabled):hover{filter:brightness(1.08);transform:translateY(-1px)}' +
    '.conta-nota{font-size:.8rem;color:var(--c-suave);margin-top:1rem !important;padding-top:.9rem;border-top:1px solid var(--c-linha)}' +
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .conta-dialogo{--c-fundo:#111D3A;--c-tinta:#E8ECF6;--c-suave:#AEB9D3;--c-linha:#2C3B63;--c-campo:#0B1B3A;--c-azul:#8FB0FF;--c-azul-claro:#1A2A55;--c-erro:#FFB4AB;--c-erro-fundo:#3B1A1A;--c-ok:#7DDBA8;--c-ok-fundo:#123323}:root:not([data-theme="light"]) .conta-enviar{color:#0B1B3A}}' +
    ':root[data-theme="dark"] .conta-dialogo{--c-fundo:#111D3A;--c-tinta:#E8ECF6;--c-suave:#AEB9D3;--c-linha:#2C3B63;--c-campo:#0B1B3A;--c-azul:#8FB0FF;--c-azul-claro:#1A2A55;--c-erro:#FFB4AB;--c-erro-fundo:#3B1A1A;--c-ok:#7DDBA8;--c-ok-fundo:#123323}:root[data-theme="dark"] .conta-enviar{color:#0B1B3A}' +
    '.conta-toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:60;max-width:calc(100% - 32px);background:#0B1B3A;color:#FFFFFF;padding:.75rem 1.1rem;border-radius:10px;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}' +
    '.conta-painel{border:1px solid rgba(31,79,216,.25);border-radius:10px;padding:.9rem 1rem;margin:1rem 0}' +
    '.conta-painel p{margin:0 0 .6rem}.conta-painel .acoes{margin-top:.4rem}' +
    '.conta-painel .conta-msg:not(:empty){padding:.55rem .75rem;border-radius:10px;background:#FDECEA;color:#B42318}' +
    '@media (max-width:380px){.conta-entrar{padding-left:.6rem;padding-right:.6rem}}';
  document.head.appendChild(css);

  /* ---------- botão na faixa do topo ---------- */
  var botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'familia-item conta-entrar';
  botao.id = 'conta-entrar';
  botao.textContent = 'Entrar';
  botao.title = 'Entre para salvar seu progresso e continuar em qualquer aparelho';
  botao.hidden = ligada(); // quem já entrou não vê o botão nem por um instante
  var faixa = document.querySelector('.familia-in');
  if (faixa) faixa.appendChild(botao);
  botao.addEventListener('click', function () { abrir(); });
  // Quem entrou vê "Sair" no mesmo lugar. A cópia na conta fica; este navegador para de sincronizar.
  var sair = document.createElement('button');
  sair.type = 'button';
  sair.className = 'familia-item conta-sair';
  sair.id = 'conta-sair';
  sair.textContent = 'Sair';
  sair.hidden = true;
  if (faixa) faixa.appendChild(sair);
  sair.addEventListener('click', function () {
    if (!mod) return;
    sair.disabled = true;
    mod.sairDaConta().then(function () { sair.disabled = false; toast('Você saiu da conta. O progresso segue neste navegador.'); },
      function () { sair.disabled = false; toast('Não deu para sair agora. Tente de novo.'); });
  });

  /* ---------- janela do aceite ---------- */
  var dlg = document.createElement('dialog');
  dlg.className = 'conta-dialogo';
  dlg.id = 'conta-dialogo';
  dlg.setAttribute('aria-labelledby', 'conta-titulo');
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  dlg.innerHTML =
    '<div class="conta-corpo">' +
    '<button type="button" class="conta-fechar" id="conta-nao" aria-label="Fechar, agora não">×</button>' +
    '<div class="conta-cab"><picture><source srcset="/zumi/abelha-ola-fundo-escuro.png" media="(prefers-color-scheme: dark)"><img src="/zumi/abelha-ola.png" width="52" height="52" alt=""></picture><h2 id="conta-titulo">Continue de qualquer aparelho</h2></div>' +
    '<p class="conta-sub">Entre e o Ako guarda uma cópia do seu progresso na sua conta.</p>' +
    '<ul class="conta-chips" aria-label="O que fica salvo"><li>Roteiro</li><li>Trilhas</li><li>Mapas</li><li>Rotina</li></ul>' +
    '<label class="conta-aceite"><input type="checkbox" id="conta-aceite"><span>Li a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a> e aceito guardar meu progresso na minha conta.</span></label>' +
    '<p class="conta-msg" id="conta-msg" role="alert"></p>' +
    '<button type="button" class="conta-google" id="conta-google" disabled>' + G + '<span>Continuar com Google</span></button>' +
    '<p class="conta-ou">ou com e-mail</p>' +
    '<form id="conta-form" novalidate><fieldset id="conta-campos" disabled>' +
    '<div class="conta-modos" role="group" aria-label="Já tem conta?"><button type="button" id="conta-modo-entrar" aria-pressed="true">Entrar</button><button type="button" id="conta-modo-criar" aria-pressed="false">Criar conta</button></div>' +
    '<div class="conta-campo"><label for="conta-email">E-mail</label><input type="email" id="conta-email" autocomplete="email" inputmode="email" placeholder="voce@exemplo.com" required></div>' +
    '<div class="conta-campo"><label for="conta-senha">Senha</label><div class="conta-senha"><input type="password" id="conta-senha" autocomplete="current-password" required aria-describedby="conta-forca-txt"><button type="button" id="conta-ver" aria-pressed="false">Mostrar</button></div>' +
    '<div class="conta-forca" id="conta-forca" data-nivel="0" hidden><i></i><i></i><i></i></div><p class="conta-forca-txt" id="conta-forca-txt" aria-live="polite" hidden></p></div>' +
    '<p class="conta-esqueci-linha" id="conta-esqueci-linha"><button type="button" class="conta-link" id="conta-esqueci">Esqueci a senha</button></p>' +
    '<button type="submit" class="conta-enviar" id="conta-enviar">Entrar</button>' +
    '</fieldset></form>' +
    '<p class="conta-nota">Não quer entrar? Tudo continua funcionando, salvo só neste navegador. Lembretes de saúde e reflexões da Rotina só vão para a conta se você ligar nos Ajustes da Rotina.</p>' +
    '</div>';
  document.body.appendChild(dlg);
  function q(id) { return dlg.querySelector('#' + id); }
  var aceite = q('conta-aceite'), google = q('conta-google'), msg = q('conta-msg'), campos = q('conta-campos');
  var email = q('conta-email'), senha = q('conta-senha'), forcaBox = q('conta-forca'), forcaTxt = q('conta-forca-txt');
  var enviar = q('conta-enviar'), criando = false;

  function abrir() {
    msg.textContent = ''; msg.classList.remove('ok');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    aceite.focus();
  }
  function fechar() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function avisar(t, bom) { msg.textContent = t; msg.classList.toggle('ok', !!bom); }
  function pronto() { google.disabled = campos.disabled = !(mod && aceite.checked); }
  q('conta-nao').addEventListener('click', fechar);
  dlg.addEventListener('click', function (ev) { if (ev.target === dlg) fechar(); });
  // O módulo carrega no aceite, para a janela do Google abrir direto no clique (sem bloqueio de pop-up).
  var rotuloGoogle = google.querySelector('span');
  aceite.addEventListener('change', function () {
    if (!aceite.checked) { pronto(); return; }
    avisar('');
    rotuloGoogle.textContent = 'Preparando...';
    carregar().then(function () { rotuloGoogle.textContent = 'Continuar com Google'; pronto(); }, function () {
      rotuloGoogle.textContent = 'Continuar com Google';
      avisar('Não deu para conectar agora. Confira a internet e tente de novo.');
    });
  });
  function entrou(u) {
    fechar();
    aceite.checked = false; senha.value = ''; mostrarForca(); pronto();
    toast('Pronto' + (u && u.nome ? ', ' + u.nome.split(' ')[0] : '') + '. Seu progresso agora fica salvo na sua conta.');
  }
  function tentar(promessa) {
    google.disabled = campos.disabled = true; avisar('');
    promessa.then(entrou, function (e) { avisar(e.message); pronto(); });
  }
  google.addEventListener('click', function () { if (mod && aceite.checked) tentar(mod.entrarGoogle()); });

  /* Entrar ou criar conta: o mesmo formulário, muda o botão, a dica da senha e o "Esqueci a senha". */
  function modo(criar) {
    criando = criar;
    q('conta-modo-entrar').setAttribute('aria-pressed', String(!criar));
    q('conta-modo-criar').setAttribute('aria-pressed', String(criar));
    enviar.textContent = criar ? 'Criar conta' : 'Entrar';
    senha.setAttribute('autocomplete', criar ? 'new-password' : 'current-password');
    q('conta-esqueci-linha').hidden = criar;
    avisar(''); mostrarForca();
  }
  q('conta-modo-entrar').addEventListener('click', function () { modo(false); });
  q('conta-modo-criar').addEventListener('click', function () { modo(true); });

  /* Nível da senha: só um aviso. A regra é ter pelo menos 8 caracteres; o resto fica a critério da pessoa. */
  function forca(s) {
    if (s.length < 8) return { n: 0, txt: 'Curta: para criar conta, use pelo menos 8 caracteres.' };
    var p = 0;
    if (s.length >= 12) p++;
    if (/[a-z]/.test(s) && /[A-Z]/.test(s)) p++;
    if (/\d/.test(s)) p++;
    if (/[^A-Za-z0-9]/.test(s)) p++;
    if (p <= 1) return { n: 1, txt: 'Senha fraca. Dá para usar, mas fica mais segura com 12 caracteres ou mais, misturando letras, números e símbolos.' };
    if (p <= 2) return { n: 2, txt: 'Senha média. Mais caracteres ou um símbolo deixam ela forte.' };
    return { n: 3, txt: 'Senha forte.' };
  }
  function mostrarForca() {
    if (!criando) { forcaBox.hidden = true; forcaTxt.hidden = true; return; }
    forcaTxt.hidden = false;
    if (!senha.value) { forcaBox.hidden = true; forcaTxt.textContent = 'Use pelo menos 8 caracteres.'; return; }
    var f = forca(senha.value);
    forcaBox.hidden = false; forcaBox.setAttribute('data-nivel', f.n); forcaTxt.textContent = f.txt;
  }
  senha.addEventListener('input', function () { mostrarForca(); if (!msg.classList.contains('ok')) avisar(''); });
  email.addEventListener('input', function () { avisar(''); });
  q('conta-ver').addEventListener('click', function () {
    var ver = senha.type === 'password';
    senha.type = ver ? 'text' : 'password';
    this.textContent = ver ? 'Esconder' : 'Mostrar'; this.setAttribute('aria-pressed', String(ver));
  });
  function emailOk() {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return true;
    avisar('Digite o seu e-mail.'); email.focus(); return false;
  }
  q('conta-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!mod || !aceite.checked || !emailOk()) return;
    if (criando) {
      if (senha.value.length < 8) { avisar('Para criar conta, a senha precisa de pelo menos 8 caracteres.'); senha.focus(); return; }
      tentar(mod.criarContaEmail(email.value.trim(), senha.value));
    } else {
      if (!senha.value) { avisar('Digite a senha.'); senha.focus(); return; }
      tentar(mod.entrarEmail(email.value.trim(), senha.value));
    }
  });
  q('conta-esqueci').addEventListener('click', function () {
    if (!mod || !emailOk()) return;
    mod.redefinirSenha(email.value.trim()).then(function () {
      avisar('Se esse e-mail tiver conta no Ako, chega um link para criar uma senha nova. Olhe também o spam.', true);
    }, function (e) { avisar(e.message); });
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
      var m = meta('ako');
      var quando = m.sincronizadoEm && mod ? ' Salvo na nuvem ' + mod.haQuanto(m.sincronizadoEm) + '.' : '';
      return roteiro
        ? '<p><strong>Roteiro salvo na sua conta</strong> (' + quem + '). Abra o Ako em outro aparelho, entre com a mesma conta e continue de onde parou.</p>'
        : '<p>Você entrou como <strong>' + quem + '</strong>. Roteiro, trilhas, mapas, Rotina e ajustes (tema e som) ficam salvos nessa conta.' + quando + '</p>' +
          (m.erro ? '<p class="conta-msg">' + esc(m.erro) + '</p>' : '') +
          '<div class="acoes"><button class="btn btn-sec" type="button" data-conta="atualizar">Atualizar agora</button><button class="btn btn-sec" type="button" data-conta="sair">Sair da conta</button><button class="btn btn-perigo" type="button" data-conta="apagar">Apagar conta e dados da nuvem</button></div>' +
          '<p class="conta-msg" data-conta-msg role="alert"></p>';
    }
    return roteiro
      ? '<p><strong>Seu roteiro está salvo só neste navegador.</strong> Quer abrir no celular ou em outro computador? Entre com Google ou com e-mail e ele vai junto, com todo o progresso.</p>' +
        '<div class="acoes"><button class="btn" type="button" data-conta="entrar">Salvar meu roteiro na conta</button></div>'
      : '<p>Seu progresso está salvo só neste navegador. Entre com Google ou com e-mail para guardar uma cópia e continuar em qualquer aparelho.</p>' +
        '<div class="acoes"><button class="btn" type="button" data-conta="entrar">Entrar para salvar</button></div>';
  }
  function desenhar() {
    var dentro = !!usuario || (!conhecido && ligada());
    botao.hidden = dentro;
    sair.hidden = !usuario;
    if (usuario) { sair.title = 'Sair da conta ' + (usuario.email || usuario.nome || ''); sair.setAttribute('aria-label', sair.title); }
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
    else if (acao === 'atualizar' && apps.ako) {
      b.disabled = true;
      apps.ako.atualizar().then(function (ok) {
        if (ok) toast('Tudo em dia com a sua conta.');
        else if (aviso) aviso.textContent = meta('ako').erro || 'Não deu para atualizar agora. Tente de novo.';
        b.disabled = false;
      });
    }
    else if (acao === 'sair' && mod) {
      b.disabled = true;
      mod.sairDaConta().then(function () { toast('Você saiu. O progresso segue neste navegador.'); }, function () { b.disabled = false; if (aviso) aviso.textContent = 'Não deu para sair agora. Tente de novo.'; });
    } else if (acao === 'apagar' && mod) {
      if (!confirm('Apagar sua conta e todos os dados do Ako na nuvem? O progresso deste navegador continua aqui. Não tem como desfazer.')) return;
      b.disabled = true;
      mod.apagarConta(pedirSenha).then(function (ok) { b.disabled = false; if (!ok) return; usuario = null; desenhar(); toast('Conta e dados da nuvem apagados. O progresso segue neste navegador.'); },
        function (e) { b.disabled = false; if (aviso) aviso.textContent = (e && e.message && /Senha/.test(e.message)) ? e.message : 'Não deu para apagar agora. Tente de novo em instantes.'; });
    }
  });

  function pedirSenha() { return Promise.resolve(window.prompt('Por segurança, digite a sua senha do Ako para apagar a conta:')); }

  /* ---------- sincronização enquanto a página está aberta ---------- */
  // Entrou por outro lugar (Ajustes da Rotina): trilhas e mapas ligam junto.
  window.addEventListener('rizzygo-conta', function () { carregar().catch(function () { }); });
  window.addEventListener('rizzygo-salvou', function (ev) { lembrar(); if (apps.ako && PARTES.indexOf(ev.detail) >= 0) apps.ako.mudou(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { conferirOutraAba(); desenhar(); } // "salvo há X min" em dia
    Object.keys(apps).forEach(function (k) { if (document.hidden) apps[k].agora(); else apps[k].puxar(); });
  });

  /* ---------- outra aba do mesmo navegador ----------
     Duas abas do Ako abertas guardam o progresso no mesmo lugar. Quando uma grava, a outra
     relê e redesenha (evento 'rizzygo-nuvem'), para não gravar por cima com a versão velha. */
  var CHAVES_APP = { mapas: [MAPAS], trilhas: TRILHAS.map(function (t) { return t.chave; }) };
  var vistos = {};
  function bruto(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lembrar() { Object.keys(CHAVES_APP).forEach(function (a) { CHAVES_APP[a].forEach(function (k) { vistos[k] = bruto(k); }); }); }
  function conferirOutraAba() {
    Object.keys(CHAVES_APP).forEach(function (a) {
      var mudou = CHAVES_APP[a].some(function (k) { return bruto(k) !== vistos[k]; });
      if (mudou) { lembrar(); avisarPagina(a); }
    });
  }
  lembrar();
  window.addEventListener('storage', function (e) {
    var a = Object.keys(CHAVES_APP).filter(function (x) { return CHAVES_APP[x].indexOf(e.key) >= 0; })[0];
    if (a) { lembrar(); avisarPagina(a); }
  });
  window.addEventListener('focus', conferirOutraAba);

  window.AkoConta = { abrir: abrir, pedirSenha: pedirSenha, desenhar: desenhar, entrou: function () { return !!usuario; } };
  desenhar();
  if (ligada()) carregar().catch(function () { /* sem internet: segue no navegador */ });
})();
