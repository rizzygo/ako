/* Mapas das áreas da Iniciativa Ako, em grafo. HTML, CSS e JS puros, sem build.
   O conteúdo fica em ../dados/mapas.json. O mapa da trilha Primeiros passos sai de ../dados/primeiros-passos.json.
   O que a pessoa marca nos mapas fica só no navegador, em rizzygo-mapas-v1. O progresso da trilha é só lido. */
(function () {
  'use strict';

  var CHAVE = 'rizzygo-mapas-v1';
  var CHAVE_TRILHA = 'rizzygo-trilhas-v1';
  var app = document.getElementById('conteudo');
  var trilha = null, mapas = null, atual = null;
  var marcas = carregar(CHAVE, { versao: 1, nos: {} });
  var progressoTrilha = carregar(CHAVE_TRILHA, { topicos: {} });

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
  function area(id) { return trilha.areas.filter(function (a) { return a.id === id; })[0]; }
  function topicoConcluido(t) {
    var s = (progressoTrilha.topicos || {})[t.id];
    if (!s || !s.quiz || !s.quiz.aprovado) return false;
    for (var i = 0; i < (t.checklist || []).length; i++) if (!(s.check || [])[i]) return false;
    return true;
  }
  function topicoIniciado(t) {
    var s = (progressoTrilha.topicos || {})[t.id];
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

  /* O mapa da trilha é montado a partir das etapas e tópicos dela. */
  function mapaDaTrilha() {
    var secoes = trilha.etapas.map(function (e) {
      return {
        titulo: e.titulo,
        nos: trilha.topicos.filter(function (t) { return t.etapa === e.id && t.tipo !== 'ramificacao'; }).map(function (t) {
          return { id: t.id, titulo: t.titulo, topico: t.id, resumo: primeiraFrase(t.resumo), daTrilha: true };
        })
      };
    });
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
    if (id === 'primeiros-passos') return mapaDaTrilha();
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
      var t = topico(n.topico);
      return topicoConcluido(t) ? 'feito' : (topicoIniciado(t) ? 'andamento' : '');
    }
    return marcas.nos[chave(m, n)] || '';
  }
  /* Na trilha e na primeira seção de cada mapa, o tópico é o mesmo da trilha e o progresso vem dela. */
  function vemDaTrilha(m, n) {
    return !!(n.topico && topico(n.topico) && (n.daTrilha || m.secoes[0].nos.indexOf(n) !== -1));
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
    app.innerHTML = '<div class="casca"><div class="mapas-cab"><a class="voltar" href="../#/trilha">Voltar para a trilha</a>' +
      '<h1>Mapas das áreas da TI</h1><p class="lead">Cada mapa mostra, em ordem, o que estudar numa área: do que a trilha Primeiros passos já ensina até o nível de quem procura a primeira vaga. Clique num tópico para ver o resumo, um exercício e os materiais.</p></div>' +
      '<ul class="lista-mapas">' + card(pp, 'destaque') + mapas.map(function (m) { return card(mapaPorId(m.id)); }).join('') + '</ul></div>';
    document.title = 'Mapas das áreas | Rizzygo Ako';
  }

  function viewMapa(m) {
    atual = m;
    var html = '<div class="casca"><div class="mapas-cab"><a class="voltar" href="#/">Todos os mapas</a>' +
      '<h1>' + esc(m.titulo) + '</h1><p class="lead">' + esc(m.resumo) + '</p>' +
      '<div class="legenda" aria-label="Legenda"><span><i></i>Essencial</span><span><i class="l-opcional"></i>Opcional, para depois</span>' +
      (m.trilha ? '' : '<span><i class="l-base"></i>Já está na trilha Primeiros passos</span>') +
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
    html += '</div><p class="fim-grafo">' + (m.trilha
      ? 'A trilha termina na escolha de um caminho. Cada caminho tem o seu mapa.'
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
    var t = n.topico && topico(n.topico);
    var sit = situacao(atual, n);
    var etq = [];
    if (tipoDoNo(atual, n) === 'base') etq.push('<span class="etiqueta">Na trilha Primeiros passos</span>');
    etq.push(n.nivel === 'opcional' ? '<span class="etiqueta ambar">Opcional</span>' : '<span class="etiqueta">Essencial</span>');
    var html = '<div class="painel-in"><div class="painel-topo"><div>' + etq.join(' ') + '</div><button type="button" class="fechar" data-fechar>Fechar</button></div>' +
      '<h2 id="painel-titulo">' + esc(n.titulo) + '</h2><p class="resumo-no">' + fmt(n.resumo) + '</p>';
    if (n.pratica) html += '<div class="pratica"><strong>Para praticar</strong>' + fmt(n.pratica) + '</div>';

    var ako = [];
    if (t) ako.push('<li><a href="../#/t/' + esc(t.id) + '">Tópico ' + esc(t.titulo) + ', com checklist e desafio</a></li>');
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
  function fecharPainel() { if (painel.close) painel.close(); else painel.removeAttribute('open'); }

  painel.addEventListener('click', function (ev) {
    if (ev.target === painel || ev.target.closest('[data-fechar]')) { fecharPainel(); return; }
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
    fetch('../dados/primeiros-passos.json').then(function (r) { return r.json(); }),
    fetch('../dados/mapas.json').then(function (r) { return r.json(); })
  ]).then(function (res) {
    trilha = res[0];
    mapas = res[1].mapas;
    rotear();
  }).catch(function () {
    app.innerHTML = '<div class="casca"><div class="mapas-cab"><h1>Não consegui carregar os mapas</h1><p class="lead">Confira a conexão e recarregue a página.</p></div></div>';
  });
})();
