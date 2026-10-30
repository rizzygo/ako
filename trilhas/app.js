/* Rizzygo Ako: trilhas de estudo da Iniciativa Ako. HTML, CSS e JS puros, sem build.
   O conteúdo da trilha fica em dados/primeiros-passos.json.
   O progresso fica só no navegador (localStorage), e a pessoa pode exportar e importar. */
(function () {
  'use strict';

  var URL_DADOS = 'dados/primeiros-passos.json';
  var CHAVE = 'rizzygo-trilhas-v1';
  var XP = { checklist: 20, quiz: 30, perfeito: 10, reflexao: 10, ensinei: 20, escolha: 20 };
  var MIN_REFLEXAO = 40;
  var NIVEIS = [
    { n: 1, nome: 'Começando', xp: 0 },
    { n: 2, nome: 'Explorando', xp: 150 },
    { n: 3, nome: 'Praticando', xp: 400 },
    { n: 4, nome: 'Construindo', xp: 800 },
    { n: 5, nome: 'Ensinando', xp: 1200 }
  ];
  var JA_SEI = [
    { id: 'ingles', rotulo: 'Leio documentação em inglês', topicos: ['ingles-para-ti'] },
    { id: 'terminal', rotulo: 'Uso o terminal sem medo', topicos: ['terminal'] },
    { id: 'linux', rotulo: 'Já usei Linux', topicos: ['linux'] },
    { id: 'redes', rotulo: 'Sei o que são IP, DNS e portas', topicos: ['redes'] },
    { id: 'programar', rotulo: 'Já programei em alguma linguagem', topicos: ['logica', 'python'] },
    { id: 'git', rotulo: 'Uso Git no dia a dia', topicos: ['git'] }
  ];

  var dados = null;
  var estado = carregar();
  var app = document.getElementById('conteudo');

  /* ---------- estado ---------- */
  function vazio() {
    return { versao: 1, perfil: null, topicos: {}, dias: [], conquistas: {}, caminho: null, revisoes: [] };
  }
  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (!bruto) return vazio();
      var obj = JSON.parse(bruto);
      return valido(obj) ? normalizar(obj) : vazio();
    } catch (e) { return vazio(); }
  }
  function valido(obj) { return obj && obj.versao === 1 && typeof obj.topicos === 'object'; }
  function normalizar(obj) {
    var base = vazio();
    for (var k in base) if (obj[k] === undefined) obj[k] = base[k];
    return obj;
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* modo privado: segue sem salvar */ }
  }
  function st(id) {
    if (!estado.topicos[id]) estado.topicos[id] = { check: [], quiz: null, reflexao: '', ensinei: false };
    return estado.topicos[id];
  }
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function registrarDia() {
    var h = hoje();
    if (estado.dias.indexOf(h) === -1) estado.dias.push(h);
  }

  /* ---------- regras ---------- */
  function topico(id) { return dados.topicos.filter(function (t) { return t.id === id; })[0]; }
  function etapa(id) { return dados.etapas.filter(function (e) { return e.id === id; })[0]; }
  function topicosDa(etapaId) { return dados.topicos.filter(function (t) { return t.etapa === etapaId; }); }
  function ramificacao(t) { return t.tipo === 'ramificacao'; }
  function checklistCompleto(t) {
    var s = estado.topicos[t.id];
    if (!s) return false;
    for (var i = 0; i < t.checklist.length; i++) if (!s.check[i]) return false;
    return true;
  }
  function concluido(t) {
    if (ramificacao(t)) return !!estado.caminho;
    var s = estado.topicos[t.id];
    return !!(s && s.quiz && s.quiz.aprovado && checklistCompleto(t));
  }
  function iniciado(t) {
    var s = estado.topicos[t.id];
    if (!s) return false;
    return s.check.some(Boolean) || !!s.quiz || (s.reflexao || '').length > 0 || s.ensinei;
  }
  function paraValidar(t) {
    if (!estado.perfil) return false;
    return (estado.perfil.jaSei || []).some(function (j) {
      var item = JA_SEI.filter(function (x) { return x.id === j; })[0];
      return item && item.topicos.indexOf(t.id) !== -1;
    });
  }
  function situacao(t) {
    if (concluido(t)) return 'feito';
    if (iniciado(t)) return 'andamento';
    if (paraValidar(t)) return 'validar';
    return 'novo';
  }
  function xpMax(t) { return ramificacao(t) ? XP.escolha : XP.checklist + XP.quiz + XP.perfeito + XP.reflexao + XP.ensinei; }
  function xpDo(t) {
    if (ramificacao(t)) return estado.caminho ? XP.escolha : 0;
    var s = estado.topicos[t.id];
    if (!s) return 0;
    var x = 0;
    if (checklistCompleto(t)) x += XP.checklist;
    if (s.quiz && s.quiz.aprovado) x += XP.quiz;
    if (s.quiz && s.quiz.primeiraPerfeita) x += XP.perfeito;
    if ((s.reflexao || '').trim().length >= MIN_REFLEXAO) x += XP.reflexao;
    if (s.ensinei) x += XP.ensinei;
    return x;
  }
  function xpTotal() { return dados.topicos.reduce(function (a, t) { return a + xpDo(t); }, 0); }
  function nivelDe(xp) {
    var atual = NIVEIS[0];
    NIVEIS.forEach(function (n) { if (xp >= n.xp) atual = n; });
    var prox = NIVEIS.filter(function (n) { return n.xp > xp; })[0] || null;
    return { atual: atual, prox: prox };
  }
  function proximoTopico() {
    return dados.topicos.filter(function (t) { return !concluido(t); })[0] || null;
  }
  function contarTopicos(fn) { return dados.topicos.filter(fn).length; }

  function conquistasDef() {
    var lista = [
      { id: 'roteiro', nome: 'Roteiro montado', desc: 'Respondeu às perguntas e montou seu roteiro.', ok: function () { return !!estado.perfil; } },
      { id: 'primeiro-passo', nome: 'Primeiro passo', desc: 'Concluiu o primeiro tópico.', ok: function () { return contarTopicos(function (t) { return !ramificacao(t) && concluido(t); }) >= 1; } }
    ];
    dados.etapas.forEach(function (e) {
      lista.push({ id: 'etapa-' + e.id, nome: e.conquista, desc: 'Concluiu a etapa ' + e.titulo + '.', ok: function () { return topicosDa(e.id).every(concluido); } });
    });
    lista.push(
      { id: 'sem-chute', nome: 'Sem chute', desc: 'Acertou tudo de primeira em três desafios.', ok: function () { return contarTopicos(function (t) { var s = estado.topicos[t.id]; return s && s.quiz && s.quiz.primeiraPerfeita; }) >= 3; } },
      { id: 'mao-dupla', nome: 'Mão de duas vias', desc: 'Explicou para outra pessoa o que aprendeu em três tópicos.', ok: function () { return contarTopicos(function (t) { var s = estado.topicos[t.id]; return s && s.ensinei; }) >= 3; } },
      { id: 'questionador', nome: 'Questionador', desc: 'Respondeu a cinco perguntas Ako com suas palavras.', ok: function () { return contarTopicos(function (t) { var s = estado.topicos[t.id]; return s && (s.reflexao || '').trim().length >= MIN_REFLEXAO; }) >= 5; } },
      { id: 'memoria', nome: 'Memória afiada', desc: 'Fez três revisões rápidas com pelo menos 4 acertos de 5.', ok: function () { return estado.revisoes.filter(function (r) { return r.acertos >= 4; }).length >= 3; } },
      { id: 'constancia', nome: 'Constância', desc: 'Estudou em cinco dias diferentes.', ok: function () { return estado.dias.length >= 5; } },
      { id: 'trilha', nome: 'Trilha completa', desc: 'Concluiu todos os tópicos de Primeiros passos em TI.', ok: function () { return dados.topicos.every(concluido); } }
    );
    return lista;
  }

  /* ---------- após cada ação ---------- */
  var nivelAntes = null;
  function depoisDeAgir() {
    registrarDia();
    var novas = [];
    conquistasDef().forEach(function (c) {
      if (c.ok() && !estado.conquistas[c.id]) { estado.conquistas[c.id] = hoje(); novas.push(c.nome); }
    });
    salvar();
    var n = nivelDe(xpTotal()).atual;
    if (nivelAntes && n.n > nivelAntes.n) avisar('Você subiu para o nível ' + n.n + ': ' + n.nome);
    novas.forEach(function (nome) { avisar('Conquista desbloqueada: ' + nome); });
    nivelAntes = n;
    atualizarTopo();
  }
  function atualizarTopo() {
    var xp = xpTotal(), nv = nivelDe(xp);
    var faixa = nv.prox ? (xp - nv.atual.xp) / (nv.prox.xp - nv.atual.xp) : 1;
    document.getElementById('xp-nivel').textContent = 'Nível ' + nv.atual.n + ', ' + xp + ' XP';
    document.getElementById('xp-fill').style.width = Math.round(faixa * 100) + '%';
  }

  var fila = [], ocupado = false;
  function avisar(msg) { fila.push(msg); if (!ocupado) proximoAviso(); }
  function proximoAviso() {
    var t = document.getElementById('toast');
    if (!fila.length) { ocupado = false; return; }
    ocupado = true;
    t.textContent = fila.shift();
    t.classList.add('mostra');
    setTimeout(function () { t.classList.remove('mostra'); setTimeout(proximoAviso, 400); }, 2800);
  }

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function urlSegura(u) { return /^https?:\/\//i.test(u) || /^\.\.?\//.test(u) ? u : '#'; }
  function horasTxt(h) { return h === 1 ? '1 hora' : (String(h).replace('.', ',') + ' horas'); }
  function semanasTxt(n) { return n === 1 ? '1 semana' : n + ' semanas'; }
  function areaPorId(id) { return dados.areas.filter(function (a) { return a.id === id; })[0]; }
  function rotuloSituacao(t) {
    var s = situacao(t);
    if (s === 'feito') return '<span class="etiqueta ambar">Concluído</span>';
    if (s === 'andamento') return '<span class="etiqueta">Em andamento</span>';
    if (s === 'validar') return '<span class="etiqueta certo">Você já sabe? Valide com o desafio</span>';
    return '';
  }
  function paraOSeuCaminho(t) {
    if (!estado.perfil || !t.areas || !t.areas.length) return false;
    return t.areas.some(function (a) { return (estado.perfil.interesses || []).indexOf(a) !== -1; });
  }

  /* ---------- rotas ---------- */
  function rotear() {
    var h = location.hash.replace(/^#\/?/, '');
    var partes = h.split('/');
    var rota = partes[0] || '';
    document.querySelectorAll('.menu > a').forEach(function (a) {
      var alvo = a.getAttribute('href').replace(/^#\/?/, '');
      if (alvo === rota || (rota === 't' && alvo === 'trilha')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var titulo = 'Rizzygo Ako';
    if (rota === 'montar') { viewMontar(); titulo = 'Montar meu roteiro | ' + titulo; }
    else if (rota === 'roteiro') { viewRoteiro(); titulo = 'Seu roteiro | ' + titulo; }
    else if (rota === 'trilha') { viewTrilha(); titulo = dados.titulo + ' | ' + titulo; }
    else if (rota === 't' && topico(partes[1])) { viewTopico(partes[1]); titulo = topico(partes[1]).titulo + ' | ' + titulo; }
    else if (rota === 'revisao') { viewRevisao(); titulo = 'Revisão rápida | ' + titulo; }
    else if (rota === 'conquistas') { viewConquistas(); titulo = 'Conquistas | ' + titulo; }
    else viewInicio();
    document.title = titulo;
  }
  function trocarPagina() {
    rotear();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  /* ---------- início ---------- */
  function miniMapa() {
    var curtos = ['Aprender a aprender', 'O computador', 'A internet', 'Lógica e código', 'Responsabilidade', 'Mão na massa'];
    var prox = proximoTopico();
    var etapaAtual = prox ? dados.etapas.map(function (e) { return e.id; }).indexOf(prox.etapa) : -1;
    var x = 40, ys = [34, 80, 126, 172, 218, 264];
    var s = '<svg class="mini-mapa" viewBox="0 0 330 430" role="img" aria-label="Mapa da trilha: seis etapas que terminam em seis caminhos, um para cada área da TI">';
    dados.etapas.forEach(function (e, i) {
      var feita = topicosDa(e.id).every(concluido);
      if (i < ys.length - 1) s += '<line x1="' + x + '" y1="' + ys[i] + '" x2="' + x + '" y2="' + ys[i + 1] + '" stroke="' + (feita ? 'var(--ambar)' : 'var(--trilho)') + '" stroke-width="7" stroke-linecap="round"/>';
    });
    s += '<line x1="' + x + '" y1="264" x2="' + x + '" y2="300" stroke="var(--trilho)" stroke-width="7" stroke-linecap="round"/>';
    dados.areas.forEach(function (a, i) {
      var y = 300 + i * 22, ex = 128;
      s += '<path d="M' + x + ' 296 C' + x + ' ' + (y + 4) + ' ' + (x + 6) + ' ' + y + ' ' + (x + 40) + ' ' + y + ' L' + ex + ' ' + y + '" stroke="' + a.cor + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<circle cx="' + ex + '" cy="' + y + '" r="5" fill="var(--superficie)" stroke="' + a.cor + '" stroke-width="3"/>';
      s += '<text x="' + (ex + 14) + '" y="' + (y + 4) + '" class="rot-suave">' + esc(a.nome) + '</text>';
    });
    dados.etapas.forEach(function (e, i) {
      var feita = topicosDa(e.id).every(concluido);
      var y = ys[i];
      if (i === etapaAtual) s += '<circle class="voce-aqui" cx="' + x + '" cy="' + y + '" r="11" fill="var(--azul)"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + (feita ? 'var(--ambar)' : 'var(--superficie)') + '" stroke="' + (feita ? 'var(--ambar)' : 'var(--tinta)') + '" stroke-width="5"/>';
      s += '<text x="' + (x + 26) + '" y="' + (y + 5) + '">' + esc(curtos[i] || e.titulo) + '</text>';
      if (i === etapaAtual) s += '<text x="' + (x + 26) + '" y="' + (y + 21) + '" class="rot-suave">você está aqui</text>';
    });
    return s + '</svg>';
  }
  function viewInicio() {
    var prox = proximoTopico();
    var cta = estado.perfil
      ? '<a class="btn" href="#/t/' + (prox ? prox.id : dados.topicos[0].id) + '">Continuar de onde parei</a>' + (revisaoLiberada() ? '<a class="btn btn-sec" href="#/revisao">Revisão rápida</a>' : '<a class="btn btn-sec" href="#/roteiro">Ver meu roteiro</a>')
      : '<a class="btn" href="#/montar">Montar meu roteiro</a><a class="btn btn-sec" href="#/trilha">Ver a trilha completa</a>';
    app.innerHTML =
      '<section class="hero"><div class="casca hero-grade"><div>' +
      '<h1>Sua trilha em TI, montada com você.</h1>' +
      '<p class="lead">Responda quatro perguntas e receba um roteiro de estudos em português. Estude com materiais gratuitos, resolva desafios do dia a dia e ganhe conquistas pelo caminho.</p>' +
      '<div class="acoes">' + cta + '</div></div>' + miniMapa() + '</div></section>' +
      '<section class="secao"><div class="casca"><h2>Como funciona</h2><ol class="passos">' +
      '<li><h3>Monte seu roteiro</h3><p>Conte seu momento, quanto tempo tem por semana e o que já sabe. O roteiro mostra por onde começar e quanto tempo cada etapa leva.</p></li>' +
      '<li><h3>Estude e resolva</h3><p>Cada tópico tem o essencial explicado, materiais gratuitos e um desafio com problemas que aparecem no trabalho.</p></li>' +
      '<li><h3>Ensine alguém</h3><p>Explicar para outra pessoa é o que mais fixa o aprendizado, e também vale pontos. Seu progresso vira nível e conquistas.</p></li>' +
      '</ol></div></section>' +
      '<section class="secao"><div class="casca"><div class="ako"><div class="ako-palavra" aria-hidden="true">Ako</div><div>' +
      '<h2>Quem ensina também aprende</h2>' +
      '<p>Ako é uma filosofia maori que se refere à relação de reciprocidade entre quem ensina e quem aprende. Aqui, ela vira prática: cada tópico pede que você explique o que aprendeu para alguém, e quem já sabe ajuda a melhorar a trilha.</p>' +
      '<p>Esta trilha faz parte da Iniciativa Ako, da Rizzygo. Todo o conteúdo é aberto e qualquer pessoa pode sugerir melhorias no <a href="https://github.com/rizzygo/ako">GitHub</a>.</p>' +
      '</div></div>' +
      '<div class="principios">' +
      '<div><h3>Sem passo a passo único</h3><p>O roteiro é um ponto de partida, não um trilho. Pule o que já sabe, volte quando precisar e questione o caminho.</p></div>' +
      '<div><h3>De graça, de verdade</h3><p>Todo tópico dá para concluir só com materiais gratuitos. Quando vale a pena, indicamos também opções pagas e acessíveis, sempre separadas. E sempre dizemos quando um material está em inglês.</p></div>' +
      '<div><h3>Entender antes de rodar</h3><p>A IA ajuda muito, mas quem responde pelo que roda é você. A trilha treina a base para usar a IA com segurança.</p></div>' +
      '</div></div></section>';
  }

  /* ---------- materiais ---------- */
  function pago(r) { return /^não/.test(r.gratuito || ''); }
  function listaRecursos(lista) {
    return '<ul class="recursos">' + lista.map(function (r) {
      var custo = r.gratuito && r.gratuito !== 'sim' ? ' (' + esc(r.gratuito.replace(/^(sim|não), /, '')) + ')' : '';
      return '<li><a href="' + urlSegura(r.url) + '"' + (/^https?:/.test(r.url) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(r.titulo) + '</a><p>' + esc(r.fonte) + (r.idioma === 'en' ? ', em inglês' : '') + custo + '. ' + esc(r.nota) + '</p></li>';
    }).join('') + '</ul>';
  }

  /* ---------- montar roteiro ---------- */
  function escolha(tipo, nome, valor, titulo, detalhe, marcado) {
    return '<label class="escolha"><input type="' + tipo + '" name="' + nome + '" value="' + esc(valor) + '"' + (marcado ? ' checked' : '') + '><span><strong>' + esc(titulo) + '</strong>' + (detalhe ? '<small>' + esc(detalhe) + '</small>' : '') + '</span></label>';
  }
  function viewMontar() {
    var p = estado.perfil || { interesses: [], jaSei: [] };
    var areas = dados.areas.map(function (a) { return escolha('checkbox', 'interesses', a.id, a.nome, a.descricao, p.interesses.indexOf(a.id) !== -1); }).join('') +
      escolha('checkbox', 'interesses', 'nao-sei', 'Ainda não sei', 'Tudo bem. A trilha ajuda a descobrir.', p.interesses.indexOf('nao-sei') !== -1);
    var jaSei = JA_SEI.map(function (j) { return escolha('checkbox', 'jaSei', j.id, j.rotulo, '', p.jaSei.indexOf(j.id) !== -1); }).join('');
    app.innerHTML =
      '<div class="coluna"><div class="pagina-cab"><h1>Monte seu roteiro</h1><p>Quatro perguntas, uns dois minutos. Dá para mudar as respostas quando quiser.</p></div>' +
      '<form class="form-montar" id="form-montar" novalidate>' +
      '<fieldset><legend>Qual é o seu momento?</legend><div class="opcoes-escolha duas">' +
      escolha('radio', 'momento', 'quero', 'Quero começar', 'Ainda não estudo nem trabalho com TI', p.momento === 'quero') +
      escolha('radio', 'momento', 'comecando', 'Estou começando', 'Já estudo ou trabalho com TI há pouco tempo', p.momento === 'comecando') +
      '</div></fieldset>' +
      '<fieldset><legend>Quanto tempo você tem por semana?</legend><p class="dica">Seja realista. Pouco tempo toda semana rende mais que muito tempo de vez em quando.</p><div class="opcoes-escolha tres">' +
      escolha('radio', 'horas', '3', 'Até 3 horas', 'Uns 25 minutos por dia', String(p.horas) === '3') +
      escolha('radio', 'horas', '5', 'De 4 a 6 horas', 'Uns 45 minutos por dia', String(p.horas) === '5') +
      escolha('radio', 'horas', '8', '7 horas ou mais', 'Uma hora ou mais por dia', String(p.horas) === '8') +
      '</div></fieldset>' +
      '<fieldset><legend>O que mais te atrai?</legend><p class="dica">Marque quantas quiser. Os tópicos que mais ajudam nesses caminhos ficam destacados.</p><div class="opcoes-escolha duas">' + areas + '</div></fieldset>' +
      '<fieldset><legend>O que você já sabe?</legend><p class="dica">Os tópicos que você marcar viram desafios para validar. Acertou, conta como concluído.</p><div class="opcoes-escolha duas">' + jaSei + '</div></fieldset>' +
      '<p class="erro-form" id="erro-form" role="alert"></p>' +
      '<div class="acoes"><button class="btn" type="submit">Montar meu roteiro</button></div>' +
      '</form></div>';
    document.getElementById('form-montar').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var momento = (f.querySelector('input[name=momento]:checked') || {}).value;
      var horas = (f.querySelector('input[name=horas]:checked') || {}).value;
      if (!momento || !horas) {
        document.getElementById('erro-form').textContent = 'Escolha seu momento e quanto tempo você tem por semana para montar o roteiro.';
        return;
      }
      var lista = function (n) { return Array.prototype.map.call(f.querySelectorAll('input[name=' + n + ']:checked'), function (i) { return i.value; }); };
      estado.perfil = { momento: momento, horas: Number(horas), interesses: lista('interesses'), jaSei: lista('jaSei'), criadoEm: estado.perfil ? estado.perfil.criadoEm : hoje() };
      depoisDeAgir();
      location.hash = '#/roteiro';
    });
  }

  /* ---------- roteiro ---------- */
  function horasDoTopico(t) {
    if (concluido(t)) return 0;
    return paraValidar(t) ? 0.5 : t.horas;
  }
  function viewRoteiro() {
    if (!estado.perfil) {
      app.innerHTML = '<div class="coluna"><div class="pagina-cab"><h1>Você ainda não montou seu roteiro</h1><p>Responda quatro perguntas e veja por onde começar e quanto tempo cada etapa leva.</p></div><div class="acoes"><a class="btn" href="#/montar">Montar meu roteiro</a></div></div>';
      return;
    }
    var p = estado.perfil, acumulado = 0, total = 0, validar = 0;
    var itens = dados.etapas.map(function (e) {
      var ts = topicosDa(e.id);
      var h = ts.reduce(function (a, t) { return a + horasDoTopico(t); }, 0);
      var ini = Math.floor(acumulado / p.horas) + 1;
      acumulado += h;
      var fim = Math.max(ini, Math.ceil(acumulado / p.horas));
      total += h;
      var nValidar = ts.filter(function (t) { return paraValidar(t) && !concluido(t); }).length;
      validar += nValidar;
      var feita = ts.every(concluido);
      var quando = feita ? 'Etapa concluída' : (h === 0 ? 'Sem pendências' : (ini === fim ? 'Semana ' + ini : 'Semanas ' + ini + ' a ' + fim));
      return '<li class="' + (feita || h === 0 ? 'toda-validada' : '') + '"><span class="semanas">' + quando + '</span><h3>' + esc(e.titulo) + '</h3><p>' + esc(e.descricao) +
        (nValidar ? ' ' + (nValidar === 1 ? 'Um tópico' : nValidar + ' tópicos') + ' para validar com desafio.' : '') + '</p></li>';
    }).join('');
    var semanas = Math.max(1, Math.ceil(total / p.horas));
    var interesses = (p.interesses || []).filter(function (i) { return i !== 'nao-sei'; }).map(areaPorId).filter(Boolean);
    var caminhoTxt = interesses.length
      ? '<p>Caminhos que você marcou: ' + interesses.map(function (a) { return '<strong>' + esc(a.nome) + '</strong>'; }).join(', ') + '. Os tópicos que mais ajudam neles aparecem com a etiqueta "Para o seu caminho".</p>'
      : '<p>Você ainda não escolheu um caminho, e tudo bem. A primeira etapa apresenta as áreas da TI, e o fim da trilha ajuda a decidir.</p>';
    var prox = proximoTopico();
    app.innerHTML =
      '<div class="coluna"><div class="pagina-cab"><h1>Seu roteiro</h1><p>' + (p.momento === 'quero' ? 'Para quem está chegando: comece pela primeira etapa, com calma, e siga a ordem.' : 'Para quem já começou: valide com os desafios o que você já sabe e foque no que falta.') + '</p></div>' +
      '<div class="resumo-roteiro"><div><b>' + semanasTxt(semanas) + '</b><span>com ' + p.horas + ' horas por semana</span></div><div><b>' + horasTxt(Math.round(total)) + '</b><span>de estudo pela frente</span></div>' +
      (validar ? '<div><b>' + validar + '</b><span>' + (validar === 1 ? 'tópico para validar' : 'tópicos para validar') + '</span></div>' : '') + '</div>' +
      caminhoTxt +
      '<div class="aviso">Este roteiro é um ponto de partida, não um trilho. Pule o que já sabe, volte quando precisar e questione o caminho.</div>' +
      '<ol class="lista-roteiro">' + itens + '</ol>' +
      '<div class="acoes">' + (prox ? '<a class="btn" href="#/t/' + prox.id + '">' + (prox === dados.topicos[0] ? 'Começar pelo primeiro tópico' : 'Continuar de onde parei') + '</a>' : '') +
      '<a class="btn btn-sec" href="#/trilha">Ver a trilha completa</a><a class="btn btn-sec" href="#/montar">Mudar minhas respostas</a></div></div>';
  }

  /* ---------- trilha ---------- */
  function estacao(t, prox) {
    var s = situacao(t);
    var classes = ['estacao', s];
    if (prox && prox.id === t.id) classes.push('proxima');
    var tags = rotuloSituacao(t);
    if (prox && prox.id === t.id) tags += ' <span class="etiqueta">Próximo passo</span>';
    if (paraOSeuCaminho(t)) tags += ' <span class="etiqueta">Para o seu caminho</span>';
    return '<li class="' + classes.join(' ') + '"><span class="ponto" aria-hidden="true"></span><a href="#/t/' + t.id + '"><h3>' + esc(t.titulo) + '</h3>' +
      '<div class="meta"><span>' + horasTxt(t.horas) + '</span><span>' + xpDo(t) + ' de ' + xpMax(t) + ' XP</span>' + (tags ? '<span>' + tags + '</span>' : '') + '</div></a></li>';
  }
  function viewTrilha() {
    var prox = proximoTopico();
    var feitos = contarTopicos(concluido);
    var html = '<div class="coluna"><div class="pagina-cab"><h1>' + esc(dados.titulo) + '</h1><p>' + esc(dados.descricao) + '</p>' +
      '<p><strong>' + feitos + ' de ' + dados.topicos.length + '</strong> tópicos concluídos.' + (estado.perfil ? '' : ' <a href="#/montar">Monte seu roteiro</a> para ver quanto tempo cada etapa leva.') + '</p>' +
      (revisaoLiberada() ? '<div class="acoes" style="margin-top:1rem"><a class="btn btn-sec" href="#/revisao">Fazer uma revisão rápida</a></div>' : '') + '</div>' +
      '<div class="mapa" id="mapa">';
    dados.etapas.forEach(function (e) {
      var ts = topicosDa(e.id);
      var completa = ts.every(concluido);
      html += '<section class="mapa-etapa" data-etapa="' + e.id + '"><div class="etapa-cab' + (completa ? ' completa' : '') + '"><h2>' + esc(e.titulo) + '</h2><p>' + esc(e.descricao) + '</p></div>' +
        '<ol class="estacoes">' + ts.map(function (t) { return estacao(t, prox); }).join('') + '</ol></section>';
    });
    html += '<div class="ramos" id="ramos-mapa" aria-label="Caminhos depois da trilha">' + dados.areas.map(function (a) {
      return '<div class="ramo" style="--cor:' + a.cor + '"><a href="#/t/escolha-caminho" style="display:block;text-decoration:none;color:inherit;background:var(--superficie);border:2px solid var(--linha);border-left:6px solid var(--cor);border-radius:var(--raio-p);padding:.6rem .9rem"><h3>' + esc(a.nome) + (estado.caminho === a.id ? ' <span class="etiqueta ambar">Sua escolha</span>' : '') + '</h3></a></div>';
    }).join('') + '</div></div></div>';
    app.innerHTML = html;
    desenharTrilhos();
    desenharLeque(document.getElementById('ramos-mapa'), true);
  }
  function desenharTrilhos() {
    var mapa = document.getElementById('mapa');
    if (!mapa) return;
    mapa.querySelectorAll('.trilho').forEach(function (n) { n.remove(); });
    var pontos = Array.prototype.slice.call(mapa.querySelectorAll('.etapa-cab, .estacao'));
    var base = mapa.getBoundingClientRect().top;
    function centro(el) {
      var alvo = el.classList.contains('estacao') ? el.querySelector('.ponto') : el;
      var r = alvo.getBoundingClientRect();
      return el.classList.contains('estacao') ? r.top + r.height / 2 - base : r.top - base + 22;
    }
    for (var i = 0; i < pontos.length - 1; i++) {
      var y1 = centro(pontos[i]), y2 = centro(pontos[i + 1]);
      var feito = (pontos[i].classList.contains('feito') || pontos[i].classList.contains('completa')) &&
        (pontos[i + 1].classList.contains('feito') || pontos[i + 1].classList.contains('completa') || pontos[i + 1].classList.contains('andamento'));
      var tr = document.createElement('span');
      tr.className = 'trilho' + (feito ? ' feito' : '');
      tr.style.top = y1 + 'px';
      tr.style.height = (y2 - y1) + 'px';
      mapa.appendChild(tr);
    }
    var ultimo = pontos[pontos.length - 1];
    var ramos = document.getElementById('ramos-mapa');
    if (ultimo && ramos) {
      var yU = centro(ultimo), yR = ramos.getBoundingClientRect().top - base;
      var t2 = document.createElement('span');
      t2.className = 'trilho';
      t2.style.top = yU + 'px';
      t2.style.height = Math.max(0, yR - yU + 2) + 'px';
      mapa.appendChild(t2);
    }
  }
  function desenharLeque(cont, comTronco) {
    if (!cont) return;
    var velho = cont.querySelector('svg.leque');
    if (velho) velho.remove();
    var ramos = Array.prototype.slice.call(cont.querySelectorAll('.ramo'));
    if (!ramos.length) return;
    var esq = parseFloat(getComputedStyle(cont).paddingLeft) || 108;
    var base = cont.getBoundingClientRect().top;
    var x0 = 26, passo = 9, r = 14, y0 = comTronco ? 0 : 10;
    var altura = cont.getBoundingClientRect().height;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'leque');
    svg.setAttribute('width', esq);
    svg.setAttribute('height', altura);
    svg.setAttribute('aria-hidden', 'true');
    ramos.forEach(function (rm, i) {
      var cor = getComputedStyle(rm).getPropertyValue('--cor').trim();
      var box = rm.getBoundingClientRect();
      var y = box.top - base + box.height / 2;
      var xi = x0 + i * passo;
      var d = 'M' + x0 + ' ' + y0 + ' C' + x0 + ' ' + (y0 + 14) + ' ' + xi + ' ' + (y0 + 10) + ' ' + xi + ' ' + (y0 + 24) + ' L' + xi + ' ' + (y - r) + ' Q' + xi + ' ' + y + ' ' + (xi + r) + ' ' + y + ' L' + (esq + 2) + ' ' + y;
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('stroke', cor);
      p.setAttribute('stroke-width', '5');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-linecap', 'round');
      var escolhido = rm.getAttribute('data-area') ? estado.caminho === rm.getAttribute('data-area') : false;
      if (estado.caminho && rm.getAttribute('data-area') && !escolhido) p.setAttribute('opacity', '.3');
      svg.appendChild(p);
    });
    if (!comTronco) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', x0); c.setAttribute('cy', y0); c.setAttribute('r', '9');
      c.setAttribute('fill', 'var(--superficie)'); c.setAttribute('stroke', 'var(--tinta)'); c.setAttribute('stroke-width', '5');
      svg.appendChild(c);
    }
    cont.insertBefore(svg, cont.firstChild);
  }

  /* ---------- tópico ---------- */
  function viewTopico(id) {
    var t = topico(id), e = etapa(t.etapa), s = st(id);
    var idx = dados.topicos.indexOf(t);
    var ant = dados.topicos[idx - 1], prox = dados.topicos[idx + 1];
    var html = '<article class="coluna topico"><div class="pagina-cab"><a class="voltar" href="#/trilha">Voltar para a trilha</a>' +
      '<p>' + esc(e.titulo) + '</p><h1>' + esc(t.titulo) + '</h1>' +
      '<div class="topico-estado" id="topico-estado"></div></div>';
    if (paraValidar(t) && !concluido(t)) html += '<div class="aviso">Você disse que já sabe este assunto. Faça o desafio: acertando, o checklist é marcado para você.</div>';
    html += '<section class="bloco"><h2>Em poucas palavras</h2><p class="resumo-texto">' + fmt(t.resumo) + '</p></section>';
    html += '<section class="bloco"><h2>O essencial</h2><ul class="essencial">' + t.essencial.map(function (x) { return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul></section>';

    if (ramificacao(t)) {
      html += '<section class="bloco"><h2>Escolha um caminho</h2><p class="dica">Sua escolha fica salva e pode mudar quando quiser.</p>' +
        '<div class="ramos" id="ramos-escolha" style="margin-left:0;padding-top:1.6rem;--ramos-esq:96px">' + dados.areas.map(function (a) {
          return '<div class="ramo" data-area="' + a.id + '" style="--cor:' + a.cor + '"><input type="radio" name="caminho" id="c-' + a.id + '" value="' + a.id + '"' + (estado.caminho === a.id ? ' checked' : '') + '>' +
            '<label for="c-' + a.id + '"><h3>' + esc(a.nome) + '</h3><p>' + esc(a.descricao) + '</p><div class="meta"><a href="' + urlSegura(a.roadmap) + '" target="_blank" rel="noopener">Mapa da área no roadmap.sh</a><span>em inglês</span></div></label></div>';
        }).join('') + '</div>' +
        '<p>As próximas trilhas em português ainda estão sendo construídas. Quer ajudar a criar a da sua área? <a href="https://github.com/rizzygo/ako/issues">Abra uma issue no GitHub</a>.</p></section>';
    } else {
      html += '<section class="bloco"><h2>Pratique</h2><p class="dica">Marque o que você já fez. O checklist completo vale ' + XP.checklist + ' XP.</p><ul class="checklist" id="checklist">' +
        t.checklist.map(function (c, i) { return '<li><label><input type="checkbox" data-i="' + i + '"' + (s.check[i] ? ' checked' : '') + '><span>' + fmt(c) + '</span></label></li>'; }).join('') + '</ul></section>';
      var gratis = t.recursos.filter(function (r) { return !pago(r); }), pagos = t.recursos.filter(pago);
      html += '<section class="bloco"><h2>Materiais gratuitos</h2>' + (gratis.length
        ? listaRecursos(gratis)
        : '<p class="vazio">Ainda não temos materiais para este tópico. Conhece um bom e gratuito? Sugira no GitHub.</p>') + '</section>';
      if (pagos.length) html += '<section class="bloco"><h2>Para ir além, se quiser investir</h2><p class="dica">Opcionais. Os materiais gratuitos acima bastam para concluir o tópico. Estes são pagos, acessíveis e bem avaliados.</p>' + listaRecursos(pagos) + '</section>';
      html += '<section class="bloco"><h2>Desafio</h2><p class="dica">Cada tentativa sorteia 3 de ' + t.quiz.length + ' perguntas. Acerte pelo menos 2 para concluir. Vale ' + XP.quiz + ' XP, e mais ' + XP.perfeito + ' se acertar tudo de primeira.</p><div id="quiz"></div></section>';
    }
    html += '<section class="bloco"><h2>Pergunta Ako</h2><p class="resumo-texto">' + fmt(t.pergunta_ako) + '</p>' +
      '<label for="reflexao" class="dica" style="display:block;margin-top:.8rem">Responda com suas palavras. Só você vê, e fica salvo neste navegador.</label>' +
      '<textarea id="reflexao">' + esc(s.reflexao) + '</textarea>' +
      '<div class="acoes" style="margin-top:.6rem"><button class="btn btn-sec" type="button" id="salvar-reflexao">Salvar resposta</button></div><p class="salvo" id="reflexao-msg" aria-live="polite"></p></section>';
    if (!ramificacao(t)) {
      html += '<section class="bloco"><h2>Mão de duas vias</h2><p>Explicar para outra pessoa é a melhor forma de fixar o que aprendeu. Vale um amigo, um grupo de estudo ou um post.</p>' +
        '<label class="ensinei" style="margin-top:.8rem"><input type="checkbox" id="ensinei"' + (s.ensinei ? ' checked' : '') + '><span><strong>Expliquei este assunto para outra pessoa</strong><br>Vale ' + XP.ensinei + ' XP.</span></label></section>';
    }
    html += '<nav class="nav-topicos" aria-label="Tópicos">' + (ant ? '<a class="btn btn-sec" href="#/t/' + ant.id + '">Anterior: ' + esc(ant.titulo) + '</a>' : '<span></span>') +
      (prox ? '<a class="btn" href="#/t/' + prox.id + '">Próximo: ' + esc(prox.titulo) + '</a>' : '<a class="btn" href="#/conquistas">Ver minhas conquistas</a>') + '</nav></article>';
    app.innerHTML = html;
    atualizarEstadoTopico(t);

    if (ramificacao(t)) {
      var cont = document.getElementById('ramos-escolha');
      desenharLeque(cont, false);
      cont.addEventListener('change', function (ev) {
        estado.caminho = ev.target.value;
        depoisDeAgir();
        desenharLeque(cont, false);
        atualizarEstadoTopico(t);
      });
    } else {
      document.getElementById('checklist').addEventListener('change', function (ev) {
        var i = Number(ev.target.getAttribute('data-i'));
        st(id).check[i] = ev.target.checked;
        depoisDeAgir();
        atualizarEstadoTopico(t);
      });
      document.getElementById('ensinei').addEventListener('change', function (ev) {
        st(id).ensinei = ev.target.checked;
        depoisDeAgir();
        atualizarEstadoTopico(t);
      });
      montarQuiz(t);
    }
    document.getElementById('salvar-reflexao').addEventListener('click', function () {
      var txt = document.getElementById('reflexao').value;
      st(id).reflexao = txt;
      depoisDeAgir();
      var msg = document.getElementById('reflexao-msg');
      if (txt.trim().length >= MIN_REFLEXAO) { msg.style.color = ''; msg.textContent = 'Resposta salva. Você ganhou ' + XP.reflexao + ' XP por ela.'; }
      else if (txt.trim().length) { msg.style.color = 'var(--suave)'; msg.textContent = 'Resposta salva. Escreva pelo menos uma ou duas frases (' + MIN_REFLEXAO + ' caracteres) para ganhar os ' + XP.reflexao + ' XP.'; }
      else { msg.style.color = 'var(--suave)'; msg.textContent = 'Resposta apagada.'; }
      atualizarEstadoTopico(t);
    });
  }
  function atualizarEstadoTopico(t) {
    var el = document.getElementById('topico-estado');
    if (!el) return;
    el.innerHTML = '<span class="etiqueta">' + horasTxt(t.horas) + '</span><span class="etiqueta ambar">' + xpDo(t) + ' de ' + xpMax(t) + ' XP</span>' + rotuloSituacao(t);
  }
  var POR_DESAFIO = 3, POR_REVISAO = 5;
  function sortear(lista, n) {
    var c = lista.slice();
    for (var i = c.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = c[i]; c[i] = c[j]; c[j] = x; }
    return c.slice(0, n);
  }
  function htmlQuestoes(lista, comOrigem) {
    return lista.map(function (item, qi) {
      var q = item.q;
      return '<fieldset class="questao" data-q="' + qi + '"><legend>' + (qi + 1) + '. ' + fmt(q.pergunta) + '</legend>' +
        (comOrigem ? '<p class="origem">Do tópico ' + esc(item.t.titulo) + '</p>' : '') +
        (q.codigo ? '<pre><code>' + esc(q.codigo) + '</code></pre>' : '') +
        '<div class="alternativas">' + q.opcoes.map(function (o, oi) {
          return '<label class="alt" data-o="' + oi + '"><input type="radio" name="q' + qi + '" value="' + oi + '"><span>' + fmt(o) + '</span></label>';
        }).join('') + '</div><div class="explicacao-area"></div></fieldset>';
    }).join('');
  }
  function lerRespostas(f, lista) {
    return lista.map(function (_, qi) { var m = f.querySelector('input[name=q' + qi + ']:checked'); return m ? Number(m.value) : null; });
  }
  function corrigir(f, lista, respostas) {
    var erradas = [];
    lista.forEach(function (item, qi) {
      var q = item.q, fs = f.querySelector('[data-q="' + qi + '"]');
      var certo = respostas[qi] === q.correta;
      if (!certo) erradas.push(item);
      fs.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      fs.querySelector('[data-o="' + q.correta + '"]').classList.add('certa');
      if (!certo) fs.querySelector('[data-o="' + respostas[qi] + '"]').classList.add('errada');
      fs.querySelector('.explicacao-area').innerHTML = '<div class="explicacao"><strong>' + (certo ? 'Certo.' : 'Não foi dessa vez.') + '</strong>' + fmt(q.explicacao) + '</div>';
    });
    f.classList.add('quiz-conferido');
    return erradas;
  }
  function montarQuiz(t) {
    var cont = document.getElementById('quiz');
    var s = st(t.id);
    var lista = sortear(t.quiz, POR_DESAFIO).map(function (q) { return { q: q, t: t }; });
    var previo = s.quiz && s.quiz.aprovado
      ? '<p class="resultado-quiz">Você já concluiu este desafio. Melhor resultado: ' + Math.min(s.quiz.melhor, POR_DESAFIO) + ' de ' + POR_DESAFIO + '. Pode refazer quando quiser.</p>' : '';
    cont.innerHTML = previo + '<form id="form-quiz" novalidate>' + htmlQuestoes(lista, false) +
      '<p class="erro-form" id="quiz-erro" role="alert"></p><div class="acoes"><button class="btn" type="submit">Conferir respostas</button></div></form>';
    document.getElementById('form-quiz').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var respostas = lerRespostas(f, lista);
      if (respostas.some(function (r) { return r === null; })) {
        document.getElementById('quiz-erro').textContent = 'Responda às ' + POR_DESAFIO + ' perguntas antes de conferir.';
        return;
      }
      document.getElementById('quiz-erro').textContent = '';
      var acertos = POR_DESAFIO - corrigir(f, lista, respostas).length;
      var tentativas = (s.quiz ? s.quiz.tentativas : 0) + 1;
      var aprovado = acertos >= 2;
      s.quiz = {
        tentativas: tentativas,
        melhor: Math.max(acertos, s.quiz ? s.quiz.melhor : 0),
        aprovado: aprovado || !!(s.quiz && s.quiz.aprovado),
        primeiraPerfeita: (s.quiz && s.quiz.primeiraPerfeita) || (tentativas === 1 && acertos === POR_DESAFIO)
      };
      if (aprovado && paraValidar(t)) t.checklist.forEach(function (_, i) { s.check[i] = true; });
      depoisDeAgir();
      var botao = f.querySelector('button[type=submit]');
      var res = document.createElement('p');
      res.className = 'resultado-quiz';
      res.setAttribute('role', 'status');
      res.textContent = 'Você acertou ' + acertos + ' de ' + POR_DESAFIO + '. ' + (aprovado ? (checklistCompleto(t) ? 'Desafio e tópico concluídos.' : 'Desafio concluído. Complete o checklist para concluir o tópico.') : 'Você precisa de 2 acertos para concluir. Leia as explicações e tente de novo. Cada tentativa faz um novo sorteio.');
      botao.parentNode.parentNode.insertBefore(res, botao.parentNode);
      botao.textContent = 'Tentar de novo';
      botao.type = 'button';
      botao.addEventListener('click', function () { montarQuiz(t); document.getElementById('quiz').scrollIntoView({ block: 'start' }); });
      if (aprovado && paraValidar(t)) {
        document.querySelectorAll('#checklist input').forEach(function (i) { i.checked = true; });
      }
      atualizarEstadoTopico(t);
    });
  }

  /* ---------- revisão rápida ---------- */
  function topicosParaRevisar() {
    return dados.topicos.filter(function (t) { return !ramificacao(t) && (concluido(t) || iniciado(t)); });
  }
  function revisaoLiberada() { return topicosParaRevisar().length >= 2; }
  function viewRevisao() {
    var ts = topicosParaRevisar();
    if (ts.length < 2) {
      app.innerHTML = '<div class="coluna"><div class="pagina-cab"><h1>Revisão rápida</h1><p>A revisão mistura perguntas dos tópicos que você já estudou. Comece pelo menos dois tópicos para liberar.</p></div>' +
        '<div class="acoes"><a class="btn" href="#/trilha">Ir para a trilha</a></div></div>';
      return;
    }
    var pool = [];
    ts.forEach(function (t) { t.quiz.forEach(function (q) { pool.push({ q: q, t: t }); }); });
    var lista = sortear(pool, POR_REVISAO);
    var feitas = estado.revisoes.length;
    app.innerHTML = '<div class="coluna"><div class="pagina-cab"><h1>Revisão rápida</h1><p>' + POR_REVISAO + ' perguntas sorteadas dos ' + ts.length + ' tópicos que você já estudou. Rever o conteúdo em dias diferentes é o que mais ajuda a lembrar dele depois.</p>' +
      '<p class="dica">A revisão não vale XP. Faça 3 revisões com pelo menos 4 acertos para ganhar a conquista Memória afiada.' + (feitas ? ' Você já fez ' + (feitas === 1 ? '1 revisão' : feitas + ' revisões') + '.' : '') + '</p></div>' +
      '<form id="form-revisao" novalidate>' + htmlQuestoes(lista, true) +
      '<p class="erro-form" id="revisao-erro" role="alert"></p><div class="acoes"><button class="btn" type="submit">Conferir respostas</button></div></form></div>';
    document.getElementById('form-revisao').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      if (f.classList.contains('quiz-conferido')) return;
      var respostas = lerRespostas(f, lista);
      if (respostas.some(function (r) { return r === null; })) {
        document.getElementById('revisao-erro').textContent = 'Responda às ' + POR_REVISAO + ' perguntas antes de conferir.';
        return;
      }
      document.getElementById('revisao-erro').textContent = '';
      var erradas = corrigir(f, lista, respostas);
      var acertos = POR_REVISAO - erradas.length;
      estado.revisoes.push({ data: hoje(), acertos: acertos });
      depoisDeAgir();
      var rever = [];
      erradas.forEach(function (item) { if (rever.indexOf(item.t) === -1) rever.push(item.t); });
      var res = document.createElement('div');
      res.className = 'resultado-quiz';
      res.setAttribute('role', 'status');
      res.innerHTML = '<p>Você acertou ' + acertos + ' de ' + POR_REVISAO + '.</p>' + (rever.length
        ? '<p>Vale rever: ' + rever.map(function (t) { return '<a href="#/t/' + t.id + '">' + esc(t.titulo) + '</a>'; }).join(', ') + '.</p>'
        : '<p>Nenhum tópico para rever desta vez.</p>');
      var acoes = f.querySelector('.acoes');
      acoes.parentNode.insertBefore(res, acoes);
      acoes.innerHTML = '<button class="btn" type="button" id="nova-revisao">Fazer outra revisão</button><a class="btn btn-sec" href="#/trilha">Voltar para a trilha</a>';
      document.getElementById('nova-revisao').addEventListener('click', function () { viewRevisao(); window.scrollTo(0, 0); });
    });
  }

  /* ---------- conquistas ---------- */
  function medalha() {
    return '<svg viewBox="0 0 44 44" aria-hidden="true"><path class="medalha" d="M22 2l5.6 4.1 6.9-.2 2.1 6.6 5.6 4.1-2.2 6.5 2.2 6.6-5.6 4-2.1 6.7-6.9-.2L22 44l-5.6-4.1-6.9.2-2.1-6.6-5.6-4.1 2.2-6.5L1.8 16.4l5.6-4.1 2.1-6.6 6.9.2z"/><circle class="medalha-in" cx="22" cy="23" r="9"/></svg>';
  }
  function viewConquistas() {
    var xp = xpTotal(), nv = nivelDe(xp);
    var faixa = nv.prox ? (xp - nv.atual.xp) / (nv.prox.xp - nv.atual.xp) : 1;
    var selos = conquistasDef().map(function (c) {
      var data = estado.conquistas[c.id];
      return '<li class="selo' + (data ? ' ganho' : '') + '">' + medalha() + '<div><h3>' + esc(c.nome) + '</h3><p>' + esc(c.desc) + '</p>' +
        '<p>' + (data ? 'Desbloqueada em ' + data.split('-').reverse().join('/') : 'Ainda bloqueada') + '</p></div></li>';
    }).join('');
    app.innerHTML =
      '<div class="coluna"><div class="pagina-cab"><h1>Suas conquistas</h1><p>XP mede o que você praticou, não só o que leu.</p></div>' +
      '<section class="nivel-atual" aria-label="Seu nível"><h2>Nível ' + nv.atual.n + ': ' + esc(nv.atual.nome) + '</h2><p><strong>' + xp + ' XP</strong>. ' +
      (nv.prox ? 'Faltam ' + (nv.prox.xp - xp) + ' XP para o nível ' + nv.prox.n + ', ' + esc(nv.prox.nome) + '.' : 'Você chegou ao nível mais alto. Que tal ajudar a melhorar a trilha?') + '</p>' +
      '<div class="barra-nivel" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(faixa * 100) + '" aria-label="Progresso até o próximo nível"><i style="width:' + Math.round(faixa * 100) + '%"></i></div>' +
      '<ul class="niveis">' + NIVEIS.map(function (n) { return '<li class="' + (xp >= n.xp ? 'atingido' : '') + '">' + n.n + '. ' + esc(n.nome) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="bloco"><h2>Como ganhar XP em cada tópico</h2><ul class="essencial">' +
      '<li>Completar o checklist de prática: ' + XP.checklist + ' XP</li><li>Concluir o desafio (2 de 3 acertos): ' + XP.quiz + ' XP</li><li>Acertar tudo de primeira: mais ' + XP.perfeito + ' XP</li>' +
      '<li>Responder à pergunta Ako com suas palavras: ' + XP.reflexao + ' XP</li><li>Explicar o assunto para outra pessoa: ' + XP.ensinei + ' XP</li></ul></section>' +
      '<section class="bloco"><h2>Revisão rápida</h2><p>Cinco perguntas sorteadas dos tópicos que você já estudou. Não vale XP, mas três revisões com pelo menos 4 acertos dão a conquista Memória afiada.</p><div class="acoes" style="margin-top:.8rem">' + (revisaoLiberada() ? '<a class="btn btn-sec" href="#/revisao">Fazer uma revisão rápida</a>' : '<span class="dica">Comece pelo menos dois tópicos para liberar a revisão.</span>') + '</div></section>' +
      '<section class="bloco"><h2>Conquistas</h2><ul class="selos">' + selos + '</ul></section>' +
      '<section class="bloco"><h2>Seus dados</h2><div class="dados-acoes">' +
      '<p>O progresso fica só neste navegador. Para levar para outro aparelho, exporte aqui e importe lá.</p>' +
      '<div class="acoes"><button class="btn btn-sec" type="button" id="exportar">Exportar progresso</button>' +
      '<label class="btn btn-sec" for="importar" tabindex="0">Importar progresso</label><input type="file" id="importar" accept="application/json,.json" hidden></div>' +
      '<p class="salvo" id="dados-msg" aria-live="polite"></p>' +
      '<div class="acoes"><button class="btn btn-perigo" type="button" id="apagar">Apagar meu progresso</button></div></div></section></div>';

    document.getElementById('exportar').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(estado, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'progresso-trilhas-rizzygo-' + hoje() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      document.getElementById('dados-msg').textContent = 'Arquivo exportado. Guarde-o para importar em outro aparelho.';
    });
    var rotuloImp = document.querySelector('label[for=importar]');
    rotuloImp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); document.getElementById('importar').click(); } });
    document.getElementById('importar').addEventListener('change', function (ev) {
      var arq = ev.target.files[0];
      if (!arq) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        var msg = document.getElementById('dados-msg');
        try {
          var obj = JSON.parse(leitor.result);
          if (!valido(obj)) throw new Error('formato');
          estado = normalizar(obj);
          salvar();
          nivelAntes = nivelDe(xpTotal()).atual;
          atualizarTopo();
          viewConquistas();
          document.getElementById('dados-msg').textContent = 'Progresso importado.';
        } catch (e) {
          msg.style.color = 'var(--erro)';
          msg.textContent = 'Não deu para importar: o arquivo não é um progresso exportado por este site.';
        }
      };
      leitor.readAsText(arq);
    });
    var apagar = document.getElementById('apagar');
    apagar.addEventListener('click', function () {
      if (!apagar.classList.contains('armado')) {
        apagar.classList.add('armado');
        apagar.textContent = 'Clique de novo para apagar tudo';
        setTimeout(function () { if (apagar.isConnected) { apagar.classList.remove('armado'); apagar.textContent = 'Apagar meu progresso'; } }, 5000);
        return;
      }
      estado = vazio();
      salvar();
      nivelAntes = nivelDe(0).atual;
      atualizarTopo();
      viewConquistas();
      document.getElementById('dados-msg').textContent = 'Progresso apagado.';
    });
  }

  /* ---------- início do app ---------- */
  var redesenho;
  window.addEventListener('resize', function () {
    clearTimeout(redesenho);
    redesenho = setTimeout(function () {
      desenharTrilhos();
      desenharLeque(document.getElementById('ramos-mapa'), true);
      desenharLeque(document.getElementById('ramos-escolha'), false);
    }, 120);
  });
  window.addEventListener('hashchange', trocarPagina);

  app.innerHTML = '<p class="carregando">Carregando a trilha...</p>';
  fetch(URL_DADOS).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) {
    dados = d;
    nivelAntes = nivelDe(xpTotal()).atual;
    atualizarTopo();
    rotear();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      desenharTrilhos();
      desenharLeque(document.getElementById('ramos-mapa'), true);
      desenharLeque(document.getElementById('ramos-escolha'), false);
    });
  }).catch(function () {
    app.innerHTML = '<div class="coluna"><div class="pagina-cab"><h1>Não foi possível carregar a trilha</h1><p>Confira sua conexão e recarregue a página. Se o problema continuar, avise no <a href="https://github.com/rizzygo/ako/issues">GitHub</a>.</p></div></div>';
  });
})();
