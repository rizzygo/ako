/* Mapas das áreas da Iniciativa Ako, em grafo. HTML, CSS e JS puros, sem build.
   O conteúdo fica em ../dados/mapas.json. O mapa de cada trilha sai do JSON dela (lista TRILHAS).
   O que a pessoa marca nos mapas fica só no navegador, em rizzygo-mapas-v1. O progresso da trilha é só lido. */
(function () {
  'use strict';

  var CHAVE = 'rizzygo-mapas-v1';
  /* A primeira é a Primeiros passos, que traz as áreas. As outras trilhas viram mapas próprios. */
  var TRILHAS = [
    { id: 'primeiros-passos', dados: '../dados/primeiros-passos.json', chave: 'rizzygo-trilhas-v1', q: '' },
    { id: 'platform-engineering', dados: '../dados/platform-engineering.json', chave: 'rizzygo-trilha-platform-engineering-v1', q: '?trilha=platform-engineering' }
  ];
  var app = document.getElementById('conteudo');
  var trilha = null, mapas = null, atual = null;
  var marcas = carregar(CHAVE, { versao: 1, nos: {} });
  TRILHAS.forEach(function (x) { x.progresso = carregar(x.chave, { topicos: {} }); });
  var progressoTrilha = TRILHAS[0].progresso;

  function carregar(chave, padrao) {
    try {
      var obj = JSON.parse(localStorage.getItem(chave) || 'null');
      return obj && typeof obj === 'object' ? obj : padrao;
    } catch (e) { return padrao; }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(marcas)); } catch (e) { /* modo privado: segue sem salvar */ }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function urlSegura(u) { return /^https:\/\//i.test(u) || /^\.\.?\//.test(u) ? u : '#'; }

  /* ---------- trilha ---------- */
  function topico(id) { return trilha.topicos.filter(function (t) { return t.id === id; })[0]; }
  /* De qual trilha vem o tópico de um nó: a Primeiros passos, ou a indicada em n.trilha. */
  function fonte(n) { return (n && n.trilha && TRILHAS.filter(function (x) { return x.id === n.trilha; })[0]) || TRILHAS[0]; }
  function topicoDo(n) {
    if (!n.topico) return null;
    var f = fonte(n);
    return f.json ? f.json.topicos.filter(function (t) { return t.id === n.topico; })[0] : null;
  }
  function area(id) { return trilha.areas.filter(function (a) { return a.id === id; })[0]; }
  function topicoConcluido(t, prog) {
    var s = ((prog || progressoTrilha).topicos || {})[t.id];
    if (!s || !s.quiz || !s.quiz.aprovado) return false;
    for (var i = 0; i < (t.checklist || []).length; i++) if (!(s.check || [])[i]) return false;
    return true;
  }
  function topicoIniciado(t, prog) {
    var s = ((prog || progressoTrilha).topicos || {})[t.id];
    return !!(s && ((s.check || []).some(Boolean) || s.quiz || (s.reflexao || '').length || s.ensinei));
  }
  function licaoDoTopico(t) {
    var r = (t.recursos || []).filter(function (x) { return /^\.\/materiais\//.test(x.url); })[0];
    return r ? { titulo: r.titulo, url: '../' + r.url.replace(/^\.\//, '') } : null;
  }
  function primeiraFrase(s) {
    var m = String(s).match(/^.*?[.!?](\s|$)/);
    return m ? m[0].trim() : s;
  }

  /* O mapa de cada trilha é montado a partir das etapas e tópicos dela. */
  function mapaDaTrilha(f) {
    f = f || TRILHAS[0];
    var j = f.json;
    var secoes = j.etapas.map(function (e) {
      return {
        titulo: e.titulo,
        nos: j.topicos.filter(function (t) { return t.etapa === e.id && t.tipo !== 'ramificacao'; }).map(function (t) {
          return { id: t.id, titulo: t.titulo, topico: t.id, trilha: f.id, resumo: primeiraFrase(t.resumo), daTrilha: true };
        })
      };
    });
    if (f !== TRILHAS[0]) {
      if (j.mapa_antes) secoes.unshift({ titulo: 'Antes de começar', nos: j.mapa_antes });
      return { id: f.id, titulo: j.titulo, resumo: j.descricao, cor: j.cor || 'var(--azul)', secoes: secoes, trilha: true };
    }
    secoes.push({
      titulo: 'Escolha seu próximo caminho',
      nos: mapas.map(function (m) {
        var a = area(m.area);
        return { id: 'mapa-' + m.id, titulo: m.titulo, resumo: m.resumo, mapa: m.id, cor: a && a.cor };
      })
    });
    return { id: 'primeiros-passos', titulo: trilha.titulo, resumo: trilha.descricao, cor: 'var(--azul)', secoes: secoes, trilha: true };
  }
  function mapaPorId(id) {
    var f = TRILHAS.filter(function (x) { return x.id === id && x.json; })[0];
    if (f) return mapaDaTrilha(f);
    var m = mapas.filter(function (x) { return x.id === id; })[0];
    if (!m) return null;
    var a = area(m.area);
    m.cor = a ? a.cor : 'var(--azul)';
    return m;
  }
  function todosOsNos(m) { return m.secoes.reduce(function (a, s) { return a.concat(s.nos); }, []); }
  function contaveis(m) { return todosOsNos(m).filter(function (n) { return !n.mapa; }); }

  /* ---------- situação de cada nó ---------- */
  function chave(m, n) { return m.id + '/' + n.id; }
  function situacao(m, n) {
    if (n.mapa) return '';
    if (vemDaTrilha(m, n)) {
      var t = topicoDo(n), prog = fonte(n).progresso;
      return topicoConcluido(t, prog) ? 'feito' : (topicoIniciado(t, prog) ? 'andamento' : '');
    }
    return marcas.nos[chave(m, n)] || '';
  }
  /* Na trilha e na primeira seção de cada mapa, o tópico é o mesmo da trilha e o progresso vem dela. */
  function vemDaTrilha(m, n) {
    return !!(n.topico && topicoDo(n) && (n.daTrilha || m.secoes[0].nos.indexOf(n) !== -1));
  }
  function tipoDoNo(m, n) {
    if (n.mapa) return 'mapa-link';
    if (!n.daTrilha && vemDaTrilha(m, n)) return 'base';
    return n.nivel === 'opcional' ? 'opcional' : '';
  }

  /* ---------- telas ---------- */
  function viewLista() {
    var pp = mapaDaTrilha();
    var card = function (m, extra) {
      var n = contaveis(m).length, feitos = contaveis(m).filter(function (x) { return situacao(m, x) === 'feito'; }).length;
      return '<li><a class="' + (extra || '') + '" href="#/' + m.id + '" style="--cor:' + esc(m.cor) + '"><h2>' + esc(m.titulo) + '</h2><p>' + esc(m.resumo) + '</p>' +
        '<span class="rodape-card"><span>' + n + ' tópicos</span><span>' + (feitos ? feitos + ' estudados' : 'Abrir o mapa') + '</span></span></a></li>';
    };
    var outras = TRILHAS.slice(1).filter(function (x) { return x.json; }).map(function (x) { return card(mapaDaTrilha(x), 'destaque'); }).join('');
    app.innerHTML = '<div class="casca"><div class="mapas-cab"><a class="voltar" href="../#/trilha">Voltar para a trilha</a>' +
      '<h1>Mapas das áreas da TI</h1><p class="lead">Cada mapa mostra, em ordem, o que estudar numa área: do que a trilha Primeiros passos já ensina até o nível de quem procura a primeira vaga. As trilhas também têm o seu mapa, como a de Platform Engineering. Clique num tópico para ver o resumo, um exercício e os materiais.</p></div>' +
      '<ul class="lista-mapas">' + card(pp, 'destaque') + outras + mapas.map(function (m) { return card(mapaPorId(m.id)); }).join('') + '</ul></div>';
    document.title = 'Mapas das áreas | Rizzygo Ako';
  }

  function viewMapa(m) {
    atual = m;
    var html = '<div class="casca"><div class="mapas-cab"><a class="voltar" href="#/">Todos os mapas</a>' +
      '<h1>' + esc(m.titulo) + '</h1><p class="lead">' + esc(m.resumo) + '</p>' +
      '<div class="legenda" aria-label="Legenda"><span><i></i>Essencial</span><span><i class="l-opcional"></i>Opcional, para depois</span>' +
      (m.id === 'primeiros-passos' ? '' : '<span><i class="l-base"></i>Já está na trilha Primeiros passos</span>') +
      '<span><i class="l-feito"></i>Estudado</span></div>' +
      '<div class="progresso"><p id="progresso-txt"></p><div class="barra"><i id="progresso-barra"></i></div></div></div>' +
      '<div class="grafo" id="grafo" style="--cor:' + esc(m.cor) + '"><svg aria-hidden="true" id="linhas"></svg>';
    m.secoes.forEach(function (s, si) {
      var esq = [], dir = [];
      s.nos.forEach(function (n, i) { (i % 2 === 0 ? esq : dir).push(n); });
      var botao = function (n) {
        var cls = ['no', tipoDoNo(m, n), situacao(m, n)].filter(Boolean).join(' ');
        return '<button type="button" class="' + cls + '" data-no="' + esc(n.id) + '"' + (n.cor ? ' style="--cor-no:' + esc(n.cor) + '"' : '') + '><span class="marca-no" aria-hidden="true"></span><span>' + esc(n.titulo) + '</span></button>';
      };
      html += '<section class="bloco-mapa" data-secao="' + si + '"><h2 class="bloco-mapa-titulo">' + esc(s.titulo) + '<small>' + (si + 1) + ' de ' + m.secoes.length + '</small></h2>' +
        '<div class="lado esq">' + esq.map(botao).join('') + '</div><div class="lado dir">' + dir.map(botao).join('') + '</div></section>';
    });
    var fTrilha = TRILHAS.filter(function (x) { return x.id === m.id; })[0];
    html += '</div><p class="fim-grafo">' + (m.id === 'primeiros-passos'
      ? 'A trilha termina na escolha de um caminho. Cada caminho tem o seu mapa.'
      : fTrilha ? 'A trilha termina num projeto seu, publicado no GitHub. <a href="../' + fTrilha.q + '#/trilha">Abrir a trilha, com checklist e desafios</a>.'
      : 'Achou algo faltando ou sobrando neste mapa? <a href="https://github.com/rizzygo/ako/issues">Conte numa issue</a>.') + '</p></div>';
    app.innerHTML = html;
    document.title = m.titulo + ' | Mapas | Rizzygo Ako';
    atualizarProgresso();
    desenhar();
  }

  function atualizarProgresso() {
    var nos = contaveis(atual);
    var feitos = nos.filter(function (n) { return situacao(atual, n) === 'feito'; }).length;
    var txt = document.getElementById('progresso-txt');
    if (!txt) return;
    txt.textContent = feitos + ' de ' + nos.length + ' tópicos estudados';
    document.getElementById('progresso-barra').style.width = (nos.length ? Math.round(feitos / nos.length * 100) : 0) + '%';
  }

  /* ---------- linhas do grafo ---------- */
  function desenhar() {
    var g = document.getElementById('grafo'), svg = document.getElementById('linhas');
    if (!g || !svg) return;
    var base = g.getBoundingClientRect();
    var estreito = window.matchMedia('(max-width: 760px)').matches;
    var caixa = function (el) {
      var r = el.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    };
    var d = '';
    var titulos = Array.prototype.slice.call(g.querySelectorAll('.bloco-mapa-titulo'));
    var espinha = [];
    titulos.forEach(function (t) {
      var c = caixa(t);
      espinha.push(estreito ? { x: c.x + 14, y1: c.y, y2: c.y + c.h } : { x: c.x + c.w / 2, y1: c.y, y2: c.y + c.h });
    });
    for (var i = 0; i < espinha.length - 1; i++) {
      d += '<path class="espinha" d="M' + espinha[i].x + ' ' + espinha[i].y2 + ' L' + espinha[i + 1].x + ' ' + espinha[i + 1].y1 + '"/>';
    }
    g.querySelectorAll('.bloco-mapa').forEach(function (s) {
      var t = caixa(s.querySelector('.bloco-mapa-titulo'));
      s.querySelectorAll('.no').forEach(function (b) {
        var c = caixa(b), op = b.classList.contains('opcional') ? ' opcional' : '';
        var y2 = c.y + c.h / 2, x1, y1, x2;
        if (estreito) {
          x1 = t.x + 14; y1 = t.y + t.h; x2 = c.x;
          d += '<path class="ligacao' + op + '" d="M' + x1 + ' ' + y1 + ' L' + x1 + ' ' + (y2 - 10) + ' Q' + x1 + ' ' + y2 + ' ' + (x1 + 10) + ' ' + y2 + ' L' + x2 + ' ' + y2 + '"/>';
          return;
        }
        var direita = c.x > t.x + t.w / 2;
        x1 = direita ? t.x + t.w : t.x; y1 = t.y + t.h / 2;
        x2 = direita ? c.x : c.x + c.w;
        var meio = (x1 + x2) / 2;
        d += '<path class="ligacao' + op + '" d="M' + x1 + ' ' + y1 + ' C' + meio + ' ' + y1 + ' ' + meio + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
      });
    });
    svg.innerHTML = d;
  }

  /* ---------- painel do tópico ---------- */
  var painel = document.getElementById('painel');
  function abrirNo(id) {
    var n = todosOsNos(atual).filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    if (n.mapa) { location.hash = '#/' + n.mapa; return; }
    var t = topicoDo(n), f = fonte(n);
    var sit = situacao(atual, n);
    var etq = [];
    if (tipoDoNo(atual, n) === 'base') etq.push('<span class="etiqueta">Na trilha Primeiros passos</span>');
    etq.push(n.nivel === 'opcional' ? '<span class="etiqueta ambar">Opcional</span>' : '<span class="etiqueta">Essencial</span>');
    var html = '<div class="painel-in"><div class="painel-topo"><div>' + etq.join(' ') + '</div><button type="button" class="fechar" data-fechar>Fechar</button></div>' +
      '<h2 id="painel-titulo">' + esc(n.titulo) + '</h2><p class="resumo-no">' + fmt(n.resumo) + '</p>';
    if (n.pratica) html += '<div class="pratica"><strong>Para praticar</strong>' + fmt(n.pratica) + '</div>';

    var ako = [];
    if (t) ako.push('<li><a href="../' + f.q + '#/t/' + esc(t.id) + '">Tópico ' + esc(t.titulo) + ', com checklist e desafio</a></li>');
    var licao = n.licao ? { titulo: 'Lição do Ako', url: '../materiais/' + n.licao } : (t && licaoDoTopico(t));
    if (licao) ako.push('<li><a href="' + esc(urlSegura(licao.url)) + '">Lição: ' + esc(licao.titulo) + '</a></li>');
    if (ako.length) html += '<h3>Aprender no Ako</h3><ul class="links-ako">' + ako.join('') + '</ul>';

    var recursos = (n.recursos || []).slice();
    if (!recursos.length && vemDaTrilha(atual, n)) recursos = t.recursos.filter(function (r) { return /^https:/.test(r.url) && /^sim/.test(r.gratuito || ''); }).slice(0, 3);
    if (recursos.length) {
      html += '<h3>Materiais gratuitos</h3><ul class="recursos">' + recursos.map(function (r) {
        return '<li><a href="' + esc(urlSegura(r.url)) + '" target="_blank" rel="noopener">' + esc(r.titulo) + '</a><p>' + esc(r.fonte) + (r.idioma === 'en' ? ', em inglês' : '') + '</p></li>';
      }).join('') + '</ul>';
    }

    html += '<h3>Estudar com IA</h3><p>Copie um prompt pronto e cole na IA que você usa. Ela vai te ensinar perguntando, em vez de entregar a resposta pronta. O prompt leva só este tópico, nada do seu progresso.</p>' +
      '<div class="estado-no ia-acoes"><button type="button" data-ia="copiar">Copiar prompt</button>' +
      (navigator.share ? '<button type="button" data-ia="enviar">Enviar para um app de IA</button>' : '') + '</div>' +
      '<p class="nota-estado" id="ia-msg" aria-live="polite"></p><textarea id="ia-texto" readonly hidden aria-label="Prompt para estudar com IA"></textarea>';

    html += '<h3>Como você está neste tópico?</h3>';
    if (vemDaTrilha(atual, n)) {
      html += '<p>' + (sit === 'feito' ? 'Você concluiu este tópico na trilha.' : sit === 'andamento' ? 'Você já começou este tópico na trilha.' : 'Você ainda não começou este tópico.') + '</p>' +
        '<p class="nota-estado">O progresso deste mapa vem da trilha: conclua o checklist e o desafio do tópico.</p>';
    } else {
      var opcoes = [['', 'Ainda não'], ['andamento', 'Estudando'], ['feito', 'Já estudei']];
      html += '<div class="estado-no" role="group" aria-label="Situação do tópico">' + opcoes.map(function (o) {
        return '<button type="button" data-estado="' + o[0] + '" aria-pressed="' + (sit === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div><p class="nota-estado">Fica salvo só neste navegador.</p>';
    }
    painel.innerHTML = html + '</div>';
    painel.setAttribute('aria-labelledby', 'painel-titulo');
    painel.dataset.no = n.id;
    if (painel.showModal) painel.showModal(); else painel.setAttribute('open', '');
  }
  // Estudar com IA: junta o método da skill estudar-junto (dos Favos) com o conteúdo do nó.
  var PROMPT_URL = 'https://raw.githubusercontent.com/rizzygo/favos/main/prompts/estudar-junto.txt';
  var PROMPT_RESERVA = 'Quero estudar um assunto com você. Siga o método da skill estudar-junto, dos Favos da Rizzygo ' +
    '(https://github.com/rizzygo/favos/blob/main/plugins/favo-estudo/skills/estudar-junto/SKILL.md). ' +
    'Antes de explicar, pergunte o que eu já sei e para que eu preciso. Explique uma ideia por vez, com um exemplo do dia a dia, ' +
    'e depois de cada parte me faça uma pergunta que eu só respondo se entendi. Quando eu errar, pergunte o que me levou àquela resposta. ' +
    'No fim, peça que eu explique com as minhas palavras e deixe um exercício de até 30 minutos. ' +
    'Se eu pedir a resposta direta, dê. Nunca invente fonte, número ou nome de comando.\n\n=== O que eu quero estudar ===\n';
  var promptMetodo = null;
  if (window.fetch) fetch(PROMPT_URL).then(function (r) { return r.ok ? r.text() : null; }).then(function (txt) { if (txt) promptMetodo = txt; }, function () {});
  function semCrase(x) { return String(x).replace(/`/g, ''); }
  function promptDoNo(m, n) {
    var base = 'https://ako.rizzygo.com.br/trilhas/';
    var t = topicoDo(n), f = fonte(n);
    var licao = n.licao ? { url: './materiais/' + n.licao } : (t && licaoDoTopico(t));
    var linhas = [
      'Tópico: ' + n.titulo + ' (mapa ' + m.titulo + ', da Rizzygo Ako)',
      'Página do mapa: ' + base + 'mapas/#/' + m.id,
      '',
      'Resumo: ' + semCrase(n.resumo)
    ];
    if (n.pratica) linhas.push('', 'Para praticar: ' + semCrase(n.pratica));
    if (t) linhas.push('', 'Tópico da trilha com checklist e desafio: ' + base + f.q + '#/t/' + t.id);
    if (licao) linhas.push('', 'Lição do Ako sobre o tópico: ' + base + licao.url.replace(/^(\.\.\/|\.\/)/, ''));
    linhas.push('', 'Comece me perguntando o que eu já sei sobre esse tópico.');
    return (promptMetodo || PROMPT_RESERVA).replace(/\s*$/, '\n') + '\n' + linhas.join('\n') + '\n';
  }
  function estudarComIA(acao) {
    var n = todosOsNos(atual).filter(function (x) { return x.id === painel.dataset.no; })[0];
    if (!n) return;
    var txt = promptDoNo(atual, n), msg = painel.querySelector('#ia-msg'), caixa = painel.querySelector('#ia-texto');
    if (acao === 'enviar') { navigator.share({ title: 'Estudar ' + n.titulo + ' com IA', text: txt }).catch(function () {}); return; }
    function mostrar() {
      caixa.value = txt; caixa.hidden = false; caixa.focus(); caixa.select();
      msg.textContent = 'O navegador não deixou copiar. O prompt está selecionado abaixo: copie e cole na sua IA.';
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) { mostrar(); return; }
    navigator.clipboard.writeText(txt).then(function () {
      caixa.hidden = true; msg.textContent = 'Copiado. Cole no ChatGPT, no Claude, no Gemini ou na IA que você usa.';
    }, mostrar);
  }
  function fecharPainel() { if (painel.close) painel.close(); else painel.removeAttribute('open'); }

  painel.addEventListener('click', function (ev) {
    if (ev.target === painel || ev.target.closest('[data-fechar]')) { fecharPainel(); return; }
    var ia = ev.target.closest('[data-ia]');
    if (ia) { estudarComIA(ia.dataset.ia); return; }
    var b = ev.target.closest('[data-estado]');
    if (!b) return;
    var n = todosOsNos(atual).filter(function (x) { return x.id === painel.dataset.no; })[0];
    if (b.dataset.estado) marcas.nos[chave(atual, n)] = b.dataset.estado;
    else delete marcas.nos[chave(atual, n)];
    salvar();
    painel.querySelectorAll('[data-estado]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var botao = app.querySelector('.no[data-no="' + n.id + '"]');
    if (botao) {
      botao.classList.remove('feito', 'andamento');
      if (b.dataset.estado) botao.classList.add(b.dataset.estado);
    }
    atualizarProgresso();
  });
  painel.addEventListener('close', function () {
    var b = app.querySelector('.no[data-no="' + painel.dataset.no + '"]');
    if (b) b.focus();
  });
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('.no');
    if (b) abrirNo(b.dataset.no);
  });

  /* ---------- rotas ---------- */
  function rotear() {
    var id = location.hash.replace(/^#\/?/, '').split('/')[0];
    var m = id && mapaPorId(id);
    if (painel.open) fecharPainel();
    if (m) viewMapa(m); else { atual = null; viewLista(); }
    window.scrollTo(0, 0);
  }
  var espera;
  window.addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(desenhar, 80); });
  window.addEventListener('hashchange', rotear);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(desenhar);

  Promise.all([
    fetch('../dados/mapas.json').then(function (r) { return r.json(); })
  ].concat(TRILHAS.map(function (x, i) {
    // Se uma trilha extra falhar, os outros mapas abrem mesmo assim.
    var p = fetch(x.dados).then(function (r) { return r.json(); });
    return i === 0 ? p : p.catch(function () { return null; });
  }))).then(function (res) {
    mapas = res[0].mapas;
    TRILHAS.forEach(function (x, i) { x.json = res[i + 1]; });
    trilha = TRILHAS[0].json;
    rotear();
  }).catch(function () {
    app.innerHTML = '<div class="casca"><div class="mapas-cab"><h1>Não consegui carregar os mapas</h1><p class="lead">Confira a conexão e recarregue a página.</p></div></div>';
  });
})();
