// Rotina com a Zumi: timer de blocos, lembretes, checks, pontos e títulos.
// Tudo fica no localStorage deste aparelho (chave rizzygo-rotina-v1). Sem login e sem servidor.
(function () {
  'use strict';

  var CHAVE = 'rizzygo-rotina-v1';
  var MIN = 60000;

  var TITULOS = [
    [0, 'Primeiro zumbido', 'Você chegou na colmeia. Agora é achar o seu ritmo.'],
    [60, 'Primeiro voo', 'Um dia inteiro de rotina. O voo começou.'],
    [200, 'Rota do néctar', 'Você já conhece o caminho. Agora é repetir.'],
    [500, 'Guarda da entrada', 'Você protege o seu foco e também o seu descanso.'],
    [1000, 'Construção do favo', 'Cada dia vira um pedaço da estrutura.'],
    [2000, 'Pote de mel', 'A rotina já rende. Guarde o que funcionou.'],
    [4000, 'Colmeia em ritmo', 'Trabalho, estudo e lazer no mesmo compasso.']
  ];

  var PERGUNTAS = [
    'O que deu certo hoje?',
    'O que tirou o seu foco hoje, e o que dá para mudar amanhã?',
    'Qual momento de hoje valeu a pena, fora do trabalho e do estudo?',
    'O que você aprendeu hoje e já consegue explicar para alguém?',
    'Qual é a primeira coisa que você quer fazer amanhã?',
    'Como está o seu corpo agora: cansado, tenso ou leve?',
    'Pelo que você agradece hoje?'
  ];

  var PAUSAS = [
    'Pausa! Que tal um copo de água?',
    'Pausa! Levanta, alonga e olha pela janela.',
    'Pausa! Respira fundo comigo por um minuto.',
    'Pausa! Tira os olhos da tela um pouco.'
  ];

  var NOMES = { trabalho: 'trabalho', estudo: 'estudo', lazer: 'lazer' };
  var LEMBRETES = {
    agua: { texto: 'Hora de beber um copo de água.', feito: 'Bebi' },
    respirar: { texto: 'Hora de respirar um minuto comigo.', feito: 'Respirar agora' },
    semTela: { texto: 'Hora de um tempo longe da tela.', feito: 'Escolher o tempo' }
  };

  // ---------- Estado ----------
  function padrao() {
    return {
      v: 1,
      config: {
        trabalho: { foco: 50, pausa: 10 },
        estudo: { foco: 25, pausa: 5 },
        lazer: { foco: 60 },
        pausaLonga: 15, ciclos: 4,
        inicio: '08:00', fim: '22:00', som: true, lembrarMetas: true, metaAgua: 8,
        lembretes: { agua: { on: true, min: 45 }, respirar: { on: true, min: 90 }, semTela: { on: true, min: 120 } }
      },
      meus: [], tarefas: [], metas: [],
      timer: { modo: 'estudo', fase: 'foco', ciclo: 1, rodando: false, fimEm: null, restante: null },
      proximos: {}, adiados: {}, tocados: {},
      dias: {}, pontosAntigos: 0,
      criadoEm: chaveDia(), fechadoAte: null, melhor: 0, semTelaAtivo: null
    };
  }

  function carregar() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { s = null; }
    var p = padrao();
    if (!s || s.v !== 1) return p;
    // completa campos que versões novas acrescentarem
    s.config = Object.assign({}, p.config, s.config || {});
    s.config.lembretes = Object.assign({}, p.config.lembretes, s.config.lembretes || {});
    ['meus', 'tarefas', 'metas', 'proximos', 'adiados', 'tocados', 'dias', 'timer'].forEach(function (k) { if (!s[k]) s[k] = p[k]; });
    if (typeof s.pontosAntigos !== 'number') s.pontosAntigos = 0;
    if (!s.criadoEm) s.criadoEm = Object.keys(s.dias).sort()[0] || chaveDia();
    if (typeof s.melhor !== 'number') s.melhor = 0;
    return s;
  }

  var S = carregar();
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) { /* modo privado: segue sem salvar */ } }

  function chaveDia(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dia(k) {
    k = k || chaveDia();
    if (!S.dias[k]) S.dias[k] = { blocos: { trabalho: 0, estudo: 0, lazer: 0 }, minutos: { trabalho: 0, estudo: 0, lazer: 0 }, agua: 0, respirar: 0, semTela: 0, ex: {}, meus: 0, reflexao: '', papel: false, feitas: {}, tarefasPts: 0, metasPts: 0 };
    var d = S.dias[k]; if (!d.feitas) { d.feitas = {}; d.tarefasPts = 0; d.metasPts = 0; }
    return S.dias[k];
  }

  // Guarda só os últimos 60 dias; os pontos dos mais antigos continuam somando.
  function podar() {
    var ks = Object.keys(S.dias).sort();
    while (ks.length > 60) { var k = ks.shift(); S.pontosAntigos += pontosDia(S.dias[k]); delete S.dias[k]; }
  }

  // ---------- Pontos ----------
  // Água: o nível depende da meta de copos. Ruim não vale ponto, Bom vale 10, Excelente vale 20.
  function metaAgua(d) { return (d && d.metaAgua) || S.config.metaAgua || 8; }
  function nivelAgua(d) {
    var r = (d && d.agua || 0) / metaAgua(d);
    return r >= 1 ? 'excelente' : r >= 0.6 ? 'bom' : 'ruim';
  }
  var NIVEIS = { ruim: 'Ruim', bom: 'Bom', excelente: 'Excelente' };
  var PONTOS_AGUA = { ruim: 0, bom: 10, excelente: 20 };
  var TEMPOS_TELA = [[5, 5], [10, 8], [15, 10], [30, 15], [60, 25], [120, 40]];
  function pontosDia(d) { return d ? pontosBrutos(d) - (d.penalidade || 0) : 0; }
  function pontosBrutos(d) {
    if (!d) return 0;
    var b = d.blocos || {};
    var ex = Object.keys(d.ex || {}).filter(function (k) { return d.ex[k]; }).length;
    return 10 * ((b.trabalho || 0) + (b.estudo || 0) + (b.lazer || 0)) +
      PONTOS_AGUA[nivelAgua(d)] + 5 * Math.min(d.respirar || 0, 6) +
      (d.semTelaPts != null ? Math.min(d.semTelaPts, 60) : 5 * Math.min(d.semTela || 0, 4)) +
      20 * ex + ((d.reflexao || d.papel) ? 10 : 0) + 2 * Math.min(d.meus || 0, 10) +
      Math.min(d.tarefasPts || 0, 40) + Math.min(d.metasPts || 0, 50);
  }
  function total() {
    return Math.max(0, S.pontosAntigos + Object.keys(S.dias).reduce(function (s, k) { return s + pontosDia(S.dias[k]); }, 0));
  }
  function indiceTitulo(p) { var i = 0; TITULOS.forEach(function (t, j) { if (p >= t[0]) i = j; }); return i; }
  // O título conquistado não cai, mesmo que os pontos diminuam.
  function tituloAtual() { var i = indiceTitulo(total()); if (i > S.melhor) S.melhor = i; return S.melhor; }
  function ativo(d) { return !!d && (pontosBrutos(d) > 0 || d.agua > 0 || !!d.reflexao); }

  // Fecha os dias que já passaram: guarda pontos e nível da água; dia sem atividade perde 10 pontos.
  function fecharDias() {
    var hoje = chaveDia(), inicio = S.fechadoAte || S.criadoEm, d = new Date(inicio + 'T12:00');
    if (S.fechadoAte) d.setDate(d.getDate() + 1);
    var fechados = [], parados = 0, seguidos = 0;
    while (chaveDia(d) < hoje) {
      var k = chaveDia(d), reg = S.dias[k];
      if (ativo(reg)) { reg.fechado = true; reg.metaAgua = reg.metaAgua || S.config.metaAgua; fechados.push(k); seguidos = 0; }
      else if (k >= S.criadoEm) {
        seguidos++;
        if (seguidos <= 7) { reg = dia(k); reg.fechado = true; reg.penalidade = 10; parados++; }
      }
      d.setDate(d.getDate() + 1);
    }
    var ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    S.fechadoAte = chaveDia(ontem);
    if (S.fechadoAte < S.criadoEm) S.fechadoAte = null;
    salvar();
    return { fechados: fechados, parados: parados };
  }
  function avisarFechamento(r) {
    var ontem = new Date(); ontem.setDate(ontem.getDate() - 1); var k = chaveDia(ontem), reg = S.dias[k];
    if (r.parados) falar('Você ficou ' + (r.parados === 1 ? '1 dia' : r.parados + ' dias') + ' sem atividade: −' + (r.parados * 10) + ' pontos. O título continua seu. Bora retomar com um passo pequeno?', 'ola');
    else if (r.fechados.indexOf(k) >= 0) falar('Ontem fechou com ' + pontosDia(reg) + ' pontos e água ' + NIVEIS[nivelAgua(reg)] + '. Hoje é mais um favo na sua colmeia.', 'comemorando', true);
  }
  function sequencia() {
    var d = new Date(), n = 0;
    if (pontosDia(S.dias[chaveDia(d)]) === 0) d.setDate(d.getDate() - 1);
    while (pontosDia(S.dias[chaveDia(d)]) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // Toda mudança que vale ponto passa por aqui, para a Zumi comemorar quando o título sobe.
  function mudar(fn) {
    var antes = tituloAtual();
    fn(dia());
    var depois = tituloAtual();
    salvar();
    render();
    if (depois > antes) {
      var t = TITULOS[depois];
      falar('Título novo: ' + t[1] + '! ' + t[2], 'comemorando', true);
      notificar('Título novo: ' + t[1], t[2], 'titulo');
    }
  }

  // ---------- Elementos ----------
  function $(id) { return document.getElementById(id); }
  var el = {
    fala: $('fala'), img: $('zumi-img'), escuro: $('zumi-escuro'),
    tNome: $('titulo-nome'), tBarra: $('titulo-barra'), tMeta: $('titulo-meta'),
    rPontos: $('r-pontos'), rFoco: $('r-foco'), rSeq: $('r-sequencia'),
    relogio: $('relogio'), arco: $('arco'), fase: $('fase'), tempo: $('tempo'), ciclo: $('ciclo'),
    iniciar: $('b-iniciar'), pular: $('b-pular'), zerar: $('b-zerar'),
    copos: $('copos'), aguaTxt: $('agua-txt'),
    pergunta: $('pergunta'), reflexao: $('reflexao'), refEstado: $('reflexao-estado'),
    semana: $('semana'), titulos: $('titulos'), meus: $('meus'),
    notifEstado: $('notif-estado'), aviso: $('aviso'), avisoTxt: $('aviso-txt'),
    sobre: $('sobre'), sobreTitulo: $('sobre-titulo'), bolha: $('bolha'), sobreGuia: $('sobre-guia'), sobreTempo: $('sobre-tempo')
  };

  // ---------- Zumi ----------
  function falar(texto, pose, pular) {
    el.fala.textContent = texto;
    if (pose) {
      el.img.src = '/zumi/abelha-' + pose + '.png';
      el.escuro.srcset = '/zumi/abelha-' + pose + '-fundo-escuro.png';
    }
    if (pular) {
      var p = el.img.parentNode; p.classList.remove('pula'); void p.offsetWidth; p.classList.add('pula');
    }
  }
  function saudacao() {
    var h = new Date().getHours();
    var oi = h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';
    if (h >= 20) return oi + ' Que tal fechar o dia com a pergunta lá embaixo?';
    return oi + ' Eu sou a Zumi. Escolha um bloco e vamos começar.';
  }

  // ---------- Som e notificação ----------
  var audio = null;
  function tocar() {
    if (!S.config.som) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 990].forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.22;
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.22);
      });
    } catch (e) { /* sem áudio */ }
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
  }

  var registro = null;
  function notificar(titulo, corpo, tag) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    var op = { body: corpo, icon: '/zumi/abelha-icone.png', badge: '/icones/icone-192.png', tag: tag || 'rotina', renotify: true };
    if (registro && registro.showNotification) registro.showNotification(titulo, op).catch(function () {});
    else { try { new Notification(titulo, op); } catch (e) { /* celular exige o service worker */ } }
  }
  function estadoNotif() {
    var b = $('b-notif');
    if (!('Notification' in window)) { el.notifEstado.textContent = 'Este navegador não mostra notificações. No iPhone, instale o app na tela inicial primeiro.'; b.hidden = true; return; }
    if (Notification.permission === 'granted') { el.notifEstado.textContent = 'Notificações ligadas. A Zumi avisa enquanto o app estiver aberto, mesmo em outra aba ou minimizado.'; b.hidden = true; }
    else if (Notification.permission === 'denied') { el.notifEstado.textContent = 'As notificações estão bloqueadas. Libere nas configurações do navegador para este site.'; b.hidden = true; }
    else { el.notifEstado.textContent = 'Os avisos aparecem só nesta página até você ativar as notificações.'; }
  }

  // ---------- Timer ----------
  function duracao(modo, fase, ciclo) {
    var c = S.config;
    if (modo === 'lazer') return c.lazer.foco * 60;
    if (fase === 'foco') return c[modo].foco * 60;
    return (ciclo % c.ciclos === 0 ? c.pausaLonga : c[modo].pausa) * 60;
  }
  function restante() {
    var t = S.timer;
    if (t.rodando) return Math.max(0, Math.round((t.fimEm - Date.now()) / 1000));
    return t.restante == null ? duracao(t.modo, t.fase, t.ciclo) : t.restante;
  }
  function mmss(s) { var m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  function iniciar() {
    var t = S.timer;
    if (t.rodando) { t.restante = restante(); t.rodando = false; t.fimEm = null; falar('Pausei o relógio. Volta quando quiser.', null); }
    else {
      t.fimEm = Date.now() + restante() * 1000; t.rodando = true;
      if (t.fase === 'foco') falar(t.modo === 'lazer' ? 'Lazer também é rotina. Aproveita, sem culpa.' : 'Foco no ' + NOMES[t.modo] + '. Eu cuido do relógio.', t.modo === 'lazer' ? 'ola' : 'estudando');
      pedirAudio();
    }
    salvar(); renderTimer();
  }
  function pedirAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { } }

  function concluir(pulou) {
    var t = S.timer, modo = t.modo;
    if (t.fase === 'foco') {
      if (!pulou) {
        var minutos = Math.round(duracao(modo, 'foco', t.ciclo) / 60);
        mudar(function (d) { d.blocos[modo]++; d.minutos[modo] += minutos; });
      }
      if (modo === 'lazer') {
        t.fase = 'foco'; t.rodando = false; t.fimEm = null; t.restante = null;
        if (!pulou) { falar('Lazer feito. Voltou com a bateria mais cheia? +10', 'comemorando', true); notificar('Fim do lazer', 'Lazer feito. +10 pontos.', 'timer'); tocar(); }
      } else {
        t.fase = 'pausa'; t.restante = null;
        var frase = PAUSAS[Math.floor(Math.random() * PAUSAS.length)];
        if (!pulou) { frase += ' +10'; tocar(); notificar('Fim do bloco de ' + NOMES[modo], frase, 'timer'); }
        falar(frase, 'ideia', !pulou);
        t.fimEm = Date.now() + duracao(modo, 'pausa', t.ciclo) * 1000; t.rodando = true;
      }
    } else {
      t.fase = 'foco'; t.ciclo = t.ciclo >= S.config.ciclos ? 1 : t.ciclo + 1;
      t.rodando = false; t.fimEm = null; t.restante = null;
      falar('Pausa encerrada. Quando quiser, começa o próximo bloco.', 'ola');
      if (!pulou) { tocar(); notificar('Fim da pausa', 'Quando quiser, começa o próximo bloco.', 'timer'); }
    }
    salvar(); renderTimer();
  }
  function zerar() {
    var t = S.timer; t.fase = 'foco'; t.ciclo = 1; t.rodando = false; t.fimEm = null; t.restante = null;
    salvar(); renderTimer(); falar('Relógio zerado. Escolha um bloco e começa quando quiser.', 'ola');
  }
  function trocarModo(m) {
    var t = S.timer;
    if (m === t.modo) return;
    if (t.rodando && !confirm('Trocar de bloco zera o relógio de agora. Continuar?')) return;
    t.modo = m; t.fase = 'foco'; t.ciclo = 1; t.rodando = false; t.fimEm = null; t.restante = null;
    salvar(); renderTimer();
    falar(m === 'lazer' ? 'Lazer marcado. Descansar também conta ponto.' : 'Bloco de ' + NOMES[m] + '. Ajuste os tempos se precisar.', m === 'lazer' ? 'ola' : 'estudando');
  }

  function renderTimer() {
    var t = S.timer, s = restante(), dur = duracao(t.modo, t.fase, t.ciclo);
    el.tempo.textContent = mmss(s);
    el.arco.style.strokeDashoffset = String(339.3 * (1 - s / dur));
    el.relogio.className = 'relogio' + (t.fase === 'pausa' ? ' pausa' : '') + (t.modo === 'lazer' ? ' lazer' : '');
    el.fase.textContent = t.modo === 'lazer' ? 'Lazer' : t.fase === 'foco' ? 'Foco' : (t.ciclo % S.config.ciclos === 0 ? 'Pausa longa' : 'Pausa');
    el.ciclo.textContent = t.modo === 'lazer' ? 'Sem culpa' : 'Bloco ' + t.ciclo + ' de ' + S.config.ciclos;
    el.iniciar.textContent = t.rodando ? 'Pausar' : (t.restante != null ? 'Continuar' : 'Começar');
    document.querySelectorAll('.modo').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.modo === t.modo)); });
    document.title = (t.rodando ? mmss(s) + ' · ' : '') + 'Rotina com a Zumi';
  }

  // ---------- Lembretes ----------
  function minutosDoDia(hhmm) { var p = (hhmm || '00:00').split(':'); return (+p[0]) * 60 + (+p[1]); }
  function noHorario(d) {
    var m = d.getHours() * 60 + d.getMinutes(), a = minutosDoDia(S.config.inicio), b = minutosDoDia(S.config.fim);
    return a <= b ? (m >= a && m < b) : (m >= a || m < b);
  }
  function lembreteInfo(chave) {
    if (chave === 'metas') return { nome: 'Fim de trimestre: hora de ver como estão as suas metas do ano.', feito: 'Revisar agora' };
    if (LEMBRETES[chave]) return { nome: LEMBRETES[chave].texto, feito: LEMBRETES[chave].feito };
    var m = S.meus.filter(function (x) { return x.id === chave; })[0];
    return m ? { nome: 'Hora de: ' + m.nome + '.', feito: 'Feito', meu: m } : null;
  }

  var fila = [], atual = null;
  function disparar(chave) {
    if (fila.indexOf(chave) >= 0 || atual === chave) return;
    var info = lembreteInfo(chave);
    if (!info) return;
    fila.push(chave);
    notificar('Zumi lembrando', info.nome, 'lem-' + chave);
    tocar();
    mostrarAviso();
  }
  function mostrarAviso() {
    if (atual || !fila.length) return;
    atual = fila.shift();
    var info = lembreteInfo(atual);
    if (!info) { atual = null; return mostrarAviso(); }
    el.avisoTxt.textContent = info.nome;
    $('aviso-sim').textContent = info.feito;
    el.aviso.hidden = false;
  }
  function fecharAviso() { el.aviso.hidden = true; atual = null; setTimeout(mostrarAviso, 300); }

  function agendar(chave, min) { S.proximos[chave] = Date.now() + min * MIN; }

  function checarLembretes() {
    var agora = Date.now(), d = new Date(), hoje = chaveDia(d);
    if (S.config.lembrarMetas && S.tocados.metas !== hoje && noHorario(d) && metasPendentes().length) { S.tocados.metas = hoje; disparar('metas'); }
    Object.keys(S.adiados).forEach(function (k) { if (agora >= S.adiados[k]) { delete S.adiados[k]; disparar(k); } });
    Object.keys(S.config.lembretes).forEach(function (k) {
      var l = S.config.lembretes[k];
      if (!l.on) return;
      if (!S.proximos[k]) agendar(k, l.min);
      else if (agora >= S.proximos[k]) { agendar(k, l.min); if (noHorario(d)) disparar(k); }
    });
    S.meus.forEach(function (m) {
      if (!m.on) return;
      if (m.tipo === 'intervalo') {
        if (!S.proximos[m.id]) agendar(m.id, m.min);
        else if (agora >= S.proximos[m.id]) { agendar(m.id, m.min); if (noHorario(d)) disparar(m.id); }
      } else {
        var alvo = new Date(d); var p = m.hora.split(':'); alvo.setHours(+p[0], +p[1], 0, 0);
        // toca uma vez por dia; se o app abriu até 2 horas depois do horário, ainda avisa
        if (agora >= alvo.getTime() && agora - alvo.getTime() < 120 * MIN && S.tocados[m.id] !== hoje) { S.tocados[m.id] = hoje; disparar(m.id); }
      }
    });
  }

  function textoProximo(ts) {
    if (!ts) return '';
    var m = Math.max(0, Math.round((ts - Date.now()) / MIN));
    return m <= 0 ? 'Próximo aviso: agora' : 'Próximo aviso em ' + (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min');
  }

  function renderMeus() {
    el.meus.innerHTML = '';
    S.meus.forEach(function (m) {
      var li = document.createElement('li');
      var lab = document.createElement('label'); lab.className = 'chave';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = m.on;
      cb.addEventListener('change', function () { m.on = cb.checked; delete S.proximos[m.id]; salvar(); renderLembretes(); });
      var sp = document.createElement('span'); sp.textContent = m.nome;
      lab.appendChild(cb); lab.appendChild(sp);
      var quando = document.createElement('span'); quando.className = 'cada';
      quando.textContent = m.tipo === 'hora' ? 'todo dia às ' + m.hora : 'a cada ' + m.min + ' min';
      var tirar = document.createElement('button'); tirar.type = 'button'; tirar.className = 'link perigo tirar'; tirar.textContent = 'Remover';
      tirar.setAttribute('aria-label', 'Remover o lembrete ' + m.nome);
      tirar.addEventListener('click', function () { S.meus = S.meus.filter(function (x) { return x.id !== m.id; }); delete S.proximos[m.id]; delete S.adiados[m.id]; salvar(); renderMeus(); });
      var prox = document.createElement('small'); prox.dataset.meuProx = m.id;
      li.appendChild(lab); li.appendChild(quando); li.appendChild(tirar); li.appendChild(prox);
      el.meus.appendChild(li);
    });
    renderLembretes();
  }
  function renderLembretes() {
    Object.keys(S.config.lembretes).forEach(function (k) {
      var s = document.querySelector('[data-lem-prox="' + k + '"]');
      if (s) s.textContent = S.config.lembretes[k].on ? textoProximo(S.adiados[k] || S.proximos[k]) : '';
    });
    S.meus.forEach(function (m) {
      var s = document.querySelector('[data-meu-prox="' + m.id + '"]');
      if (s) s.textContent = m.on && m.tipo === 'intervalo' ? textoProximo(S.adiados[m.id] || S.proximos[m.id]) : (S.adiados[m.id] ? textoProximo(S.adiados[m.id]) : '');
    });
  }

  // ---------- Respiração e pausa sem tela ----------
  var sobreTimer = null;
  function abrirSobre(tipo) {
    var fim = Date.now() + (tipo === 'respirar' ? 60 : 300) * 1000, inicio = Date.now();
    el.sobreTitulo.textContent = tipo === 'respirar' ? 'Respirar um minuto' : 'Cinco minutos sem tela';
    el.bolha.className = 'bolha' + (tipo === 'semTela' ? ' verde' : '');
    el.sobre.hidden = false;
    $('sobre-fechar').focus();
    function passo() {
      var falta = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      el.sobreTempo.textContent = mmss(falta);
      if (tipo === 'respirar') {
        var fase = ((Date.now() - inicio) / 1000) % 10; // 4 s inspirando, 6 s soltando
        var cheia = fase < 4;
        el.sobreGuia.textContent = cheia ? 'Inspire pelo nariz' : 'Solte devagar pela boca';
        el.bolha.classList.toggle('cheia', cheia); el.bolha.classList.toggle('solta', !cheia);
      } else {
        el.sobreGuia.textContent = 'Olhe para longe, alongue, beba água. A Zumi chama quando acabar.';
      }
      if (falta <= 0) {
        fecharSobre();
        tocar();
        mudar(function (d) { d[tipo]++; });
        var txt = tipo === 'respirar' ? 'Respiração feita. Mais leve? +5' : 'Cinco minutos longe da tela. Seus olhos agradecem. +5';
        falar(txt, 'comemorando', true);
        notificar('Feito', txt, 'sobre');
      }
    }
    passo(); sobreTimer = setInterval(passo, 250);
  }
  function fecharSobre() { clearInterval(sobreTimer); sobreTimer = null; el.sobre.hidden = true; $('escolha').hidden = true; $('sobre-voltei').hidden = true; el.bolha.hidden = false; el.sobreGuia.hidden = false; el.sobreTempo.hidden = false; $('sobre-acoes').hidden = false; }

  // ---------- Tempo sem tela ----------
  var PARA = [['familia', 'Família'], ['saude', 'Saúde'], ['descanso', 'Descanso'], ['outra', 'Outra coisa']];
  var escolhaMin = 15, escolhaPara = null;
  function chips(id, itens, atual, ao) {
    var box = $(id); box.innerHTML = '';
    itens.forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
      b.textContent = it[1]; b.setAttribute('aria-checked', String(it[0] === atual));
      b.addEventListener('click', function () { ao(it[0] === atual && id === 'chips-para' ? null : it[0]); });
      box.appendChild(b);
    });
  }
  function rotuloMin(m) { return m < 60 ? m + ' min' : (m / 60) + (m === 60 ? ' hora' : ' horas'); }
  function desenharEscolha() {
    chips('chips-tempo', TEMPOS_TELA.map(function (t) { return [t[0], rotuloMin(t[0]) + ' · +' + t[1]]; }), escolhaMin, function (v) { escolhaMin = v; desenharEscolha(); });
    chips('chips-para', PARA, escolhaPara, function (v) { escolhaPara = v; desenharEscolha(); });
  }
  function escolherTela() {
    if (S.semTelaAtivo) return contarTela();
    el.sobreTitulo.textContent = 'Tempo sem tela';
    $('escolha').hidden = false; el.bolha.hidden = true; el.sobreGuia.hidden = true; el.sobreTempo.hidden = true; $('sobre-acoes').hidden = true;
    desenharEscolha();
    el.sobre.hidden = false;
    $('escolha-ir').focus();
  }
  function textoPara(p) { var x = PARA.filter(function (i) { return i[0] === p; })[0]; return x ? x[1].toLowerCase() : ''; }
  function contarTela() {
    var a = S.semTelaAtivo;
    $('escolha').hidden = true; el.bolha.hidden = false; el.sobreGuia.hidden = false; el.sobreTempo.hidden = false; $('sobre-acoes').hidden = false;
    $('sobre-voltei').hidden = false;
    el.sobreTitulo.textContent = rotuloMin(a.min) + ' longe da tela' + (a.para ? ', para ' + textoPara(a.para) : '');
    el.bolha.className = 'bolha verde';
    el.sobreGuia.textContent = 'Pode bloquear o celular. Quando voltar, eu conto o tempo.';
    el.sobre.hidden = false;
    clearInterval(sobreTimer);
    function passo() {
      if (!S.semTelaAtivo) return;
      el.sobreTempo.textContent = mmss(Math.max(0, Math.ceil((S.semTelaAtivo.fimEm - Date.now()) / 1000)));
    }
    passo(); sobreTimer = setInterval(passo, 500);
  }
  function concluirTela(min) {
    var a = S.semTelaAtivo; if (!a) return;
    S.semTelaAtivo = null;
    var pts = (TEMPOS_TELA.filter(function (t) { return t[0] === min; })[0] || [0, 0])[1];
    fecharSobre();
    if (!pts) { salvar(); falar('Tudo bem. Menos de 5 minutos não conta ponto, mas já fez bem.', 'ola'); return; }
    var dTela = S.dias[a.dia] ? a.dia : chaveDia();
    var antes = tituloAtual(), d = dia(dTela);
    d.semTelaMin = (d.semTelaMin || 0) + min; d.semTelaPts = (d.semTelaPts || 0) + pts;
    d.semTelaPara = d.semTelaPara || {}; if (a.para) d.semTelaPara[a.para] = (d.semTelaPara[a.para] || 0) + min;
    tituloAtual(); salvar(); render();
    tocar();
    var txt = rotuloMin(min) + ' longe da tela' + (a.para ? ', com ' + (a.para === 'outra' ? 'outra coisa' : textoPara(a.para)) : '') + '. Isso também é cuidar da vida. +' + pts;
    falar(txt, 'comemorando', true);
    notificar('Tempo sem tela feito', txt, 'sobre');
    if (S.melhor > antes) falar('Título novo: ' + TITULOS[S.melhor][1] + '! ' + TITULOS[S.melhor][2], 'comemorando', true);
  }
  $('escolha-ir').addEventListener('click', function () {
    S.semTelaAtivo = { min: escolhaMin, para: escolhaPara, inicio: Date.now(), fimEm: Date.now() + escolhaMin * MIN, dia: chaveDia() };
    salvar(); contarTela();
    falar('Vai lá. Eu fico de olho no relógio.', 'ola');
  });
  $('escolha-fechar').addEventListener('click', function () { fecharSobre(); });
  $('sobre-voltei').addEventListener('click', function () {
    var a = S.semTelaAtivo; if (!a) return;
    var passou = (Date.now() - a.inicio) / MIN, feito = 0;
    TEMPOS_TELA.forEach(function (t) { if (t[0] <= passou + 0.01) feito = t[0]; });
    concluirTela(feito);
  });

  // Água: histórico dos últimos 14 dias e médias dos 7 e 30 dias já fechados, contando só os dias em que o app foi usado.
  function renderAgua() {
    var hoje = new Date(), lista = $('historico-agua'); lista.innerHTML = '';
    function media(n) {
      var soma = 0, dias = 0;
      for (var j = 1; j <= n; j++) { var x = new Date(hoje); x.setDate(x.getDate() - j); var r = S.dias[chaveDia(x)]; if (r && !r.penalidade) { soma += r.agua || 0; dias++; } }
      return dias ? (soma / dias).toFixed(1).replace('.', ',') : '0';
    }
    $('agua-media7').textContent = media(7); $('agua-media30').textContent = media(30);
    for (var j = 0; j < 14; j++) {
      var x = new Date(hoje); x.setDate(x.getDate() - j); var r = S.dias[chaveDia(x)];
      if (!r) continue;
      var li = document.createElement('li'), nv = nivelAgua(r);
      var nome = document.createElement('span'); nome.textContent = j === 0 ? 'Hoje' : j === 1 ? 'Ontem' : x.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
      var q = document.createElement('span'); q.textContent = (r.agua || 0) + ' de ' + metaAgua(r);
      var n = document.createElement('span'); n.className = 'nivel ' + (r.penalidade ? 'parado' : nv); n.textContent = r.penalidade ? 'Sem atividade' : NIVEIS[nv];
      li.appendChild(nome); li.appendChild(q); li.appendChild(n); lista.appendChild(li);
    }
  }

  // ---------- Render geral ----------
  function render() {
    var d = dia(), p = total(), i = tituloAtual(), t = TITULOS[i], prox = TITULOS[i + 1];
    el.tNome.textContent = t[1];
    el.tBarra.style.width = prox ? Math.max(0, 100 * (p - t[0]) / (prox[0] - t[0])).toFixed(1) + '%' : '100%';
    el.tMeta.textContent = p + ' pontos' + (prox ? ' · faltam ' + (prox[0] - p) + ' para ' + prox[1] : ' · título máximo');
    el.rPontos.textContent = pontosDia(d);
    el.rFoco.textContent = d.minutos.trabalho + d.minutos.estudo;
    el.rSeq.textContent = sequencia();

    // água
    el.copos.innerHTML = '';
    var meta = metaAgua(d), nv = nivelAgua(d);
    for (var c = 0; c < Math.max(meta, d.agua); c++) { var ic = document.createElement('i'); if (c < d.agua) ic.className = 'cheio'; el.copos.appendChild(ic); }
    el.aguaTxt.textContent = d.agua + ' de ' + meta + ' copos';
    var niv = $('agua-nivel'); niv.textContent = NIVEIS[nv]; niv.className = 'nivel ' + nv;
    var paraBom = Math.ceil(meta * 0.6) - d.agua, paraEx = meta - d.agua;
    $('agua-falta').textContent = nv === 'excelente' ? 'Meta batida. +20' : nv === 'bom' ? '+10 agora. Faltam ' + paraEx + ' para Excelente' : 'Faltam ' + paraBom + ' para Bom';
    renderAgua();

    // checks
    $('c-respirar').textContent = d.respirar ? d.respirar + 'x hoje · +5' : '+5 pontos';
    $('c-semTela').textContent = d.semTelaMin ? d.semTelaMin + ' min hoje · +' + Math.min(d.semTelaPts, 60) : 'De 5 minutos a 2 horas';
    document.querySelector('[data-acao="respirar"]').setAttribute('aria-pressed', String(d.respirar > 0));
    document.querySelector('[data-acao="semTela"]').setAttribute('aria-pressed', String(d.semTelaMin > 0 || d.semTela > 0));
    document.querySelectorAll('[data-ex]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!d.ex[b.dataset.ex])); });

    // reflexão
    var hojeN = Math.floor(new Date(chaveDia() + 'T12:00').getTime() / 86400000);
    el.pergunta.textContent = PERGUNTAS[hojeN % PERGUNTAS.length];
    if (document.activeElement !== el.reflexao) el.reflexao.value = d.reflexao || '';
    el.refEstado.textContent = d.reflexao ? 'Reflexão de hoje salva. +10' : d.papel ? 'Respondida no papel. +10' : '';

    // semana
    el.semana.innerHTML = '';
    var dias = [], max = 1;
    for (var j = 6; j >= 0; j--) { var dd = new Date(); dd.setDate(dd.getDate() - j); var pts = pontosDia(S.dias[chaveDia(dd)]); dias.push([dd, pts, j === 0]); if (pts > max) max = pts; }
    dias.forEach(function (x) {
      var li = document.createElement('li');
      var b = document.createElement('b'); b.textContent = x[1]; if (x[1] < 0) b.className = 'menos';
      var col = document.createElement('span'); col.className = 'col' + (x[2] ? ' hoje' : ''); col.style.height = Math.max(4, 100 * x[1] / max * 0.72) + '%';
      var nome = document.createElement('span'); nome.textContent = x[2] ? 'Hoje' : x[0].toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      li.setAttribute('aria-label', (x[2] ? 'Hoje' : x[0].toLocaleDateString('pt-BR', { weekday: 'long' })) + ': ' + x[1] + ' pontos');
      li.appendChild(b); li.appendChild(col); li.appendChild(nome);
      el.semana.appendChild(li);
    });

    // títulos
    el.titulos.innerHTML = '';
    TITULOS.forEach(function (tt, k) {
      var li = document.createElement('li');
      li.className = (k <= i ? 'feito' : '') + (k === i ? ' atual' : '');
      li.innerHTML = '<span class="favo" aria-hidden="true"></span><span><strong></strong><small></small></span>';
      li.querySelector('strong').textContent = tt[1];
      li.querySelector('small').textContent = (tt[0] ? tt[0] + ' pontos. ' : 'Começo. ') + tt[2];
      el.titulos.appendChild(li);
    });
    renderLembretes();
    renderTarefas(); renderMetas();
  }

  // ---------- Configurações nos campos ----------
  function lerCfg(caminho) { return caminho.split('.').reduce(function (o, k) { return o[k]; }, S.config); }
  function gravarCfg(caminho, v) { var ks = caminho.split('.'), o = S.config; ks.slice(0, -1).forEach(function (k) { o = o[k]; }); o[ks[ks.length - 1]] = v; }

  document.querySelectorAll('[data-cfg]').forEach(function (inp) {
    var c = inp.dataset.cfg, v = lerCfg(c);
    if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v;
    inp.addEventListener('change', function () {
      var nv = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? Math.min(+inp.max, Math.max(+inp.min, Math.round(+inp.value || +inp.min))) : inp.value;
      if (inp.type === 'number') inp.value = nv;
      gravarCfg(c, nv);
      if (!S.timer.rodando) S.timer.restante = null;
      salvar(); renderTimer();
    });
  });
  document.querySelectorAll('[data-lem]').forEach(function (inp) {
    var k = inp.dataset.lem; inp.checked = S.config.lembretes[k].on;
    inp.addEventListener('change', function () { S.config.lembretes[k].on = inp.checked; delete S.proximos[k]; checarLembretes(); salvar(); renderLembretes(); });
  });
  document.querySelectorAll('[data-lem-min]').forEach(function (inp) {
    var k = inp.dataset.lemMin; inp.value = S.config.lembretes[k].min;
    inp.addEventListener('change', function () {
      var nv = Math.min(+inp.max, Math.max(+inp.min, Math.round(+inp.value || +inp.min))); inp.value = nv;
      S.config.lembretes[k].min = nv; agendar(k, nv); salvar(); renderLembretes();
    });
  });

  // ---------- Eventos ----------
  el.iniciar.addEventListener('click', iniciar);
  el.pular.addEventListener('click', function () { concluir(true); });
  el.zerar.addEventListener('click', zerar);
  document.querySelectorAll('.modo').forEach(function (b) { b.addEventListener('click', function () { trocarModo(b.dataset.modo); }); });

  $('agua-mais').addEventListener('click', function () {
    mudar(function (d) { d.agua++; });
    var dd = dia(), n = dd.agua, nv = nivelAgua(dd), meta = metaAgua(dd);
    if (n === meta) falar('Meta de água batida: Excelente! +20 no dia.', 'comemorando', true);
    else if (n === Math.ceil(meta * 0.6)) falar('Água no nível Bom. +10. Mais ' + (meta - n) + ' e chega no Excelente.', 'ola', true);
    else falar('Copo ' + n + ' do dia. Água: ' + NIVEIS[nv] + '.', null);
    if (S.config.lembretes.agua.on) agendar('agua', S.config.lembretes.agua.min);
  });
  $('agua-menos').addEventListener('click', function () { if (dia().agua > 0) mudar(function (d) { d.agua--; }); });
  document.querySelectorAll('[data-acao]').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.acao === 'semTela') escolherTela(); else abrirSobre('respirar'); }); });
  document.querySelectorAll('[data-ex]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.ex, liga = !dia().ex[k];
      mudar(function (d) { d.ex[k] = liga; });
      if (liga) falar('Corpo em movimento, cabeça mais leve. +20', 'comemorando', true);
    });
  });

  $('sobre-fechar').addEventListener('click', function () { var tela = !!S.semTelaAtivo; S.semTelaAtivo = null; salvar(); fecharSobre(); falar(tela ? 'Tempo sem tela cancelado. Tenta de novo quando der.' : 'Tudo bem parar. Tenta de novo mais tarde.', 'ola'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.sobre.hidden && !S.semTelaAtivo) fecharSobre(); });

  $('aviso-sim').addEventListener('click', function () {
    var k = atual, info = lembreteInfo(k);
    fecharAviso();
    if (k === 'agua') { $('agua-mais').click(); }
    else if (k === 'respirar') abrirSobre(k);
    else if (k === 'semTela') escolherTela();
    else if (k === 'metas') { $('metas-secao').scrollIntoView({ behavior: 'smooth' }); }
    else if (info && info.meu) { mudar(function (d) { d.meus++; }); falar('Feito: ' + info.meu.nome + '. +2', 'comemorando', true); }
  });
  $('aviso-depois').addEventListener('click', function () { S.adiados[atual] = Date.now() + 10 * MIN; salvar(); fecharAviso(); renderLembretes(); });

  $('b-refletir').addEventListener('click', function () {
    var txt = el.reflexao.value.trim();
    if (!txt) { el.refEstado.textContent = 'Escreva uma linha ou toque em "Respondi no papel".'; el.reflexao.focus(); return; }
    mudar(function (d) { d.reflexao = txt; });
    falar('Reflexão guardada. Descansa bem, até amanhã!', 'comemorando', true);
  });
  $('b-papel').addEventListener('click', function () { mudar(function (d) { d.papel = true; }); falar('Papel e caneta, longe da tela. Ótima escolha. +10', 'comemorando', true); });

  // novo lembrete
  var tipos = document.querySelectorAll('[name="novo-tipo"]');
  tipos.forEach(function (r) {
    r.addEventListener('change', function () {
      var hora = document.querySelector('[name="novo-tipo"]:checked').value === 'hora';
      document.querySelector('.novo-hora').hidden = !hora; document.querySelector('.novo-intervalo').hidden = hora;
    });
  });
  $('novo').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('novo-nome').value.trim(); if (!nome) return;
    var tipo = document.querySelector('[name="novo-tipo"]:checked').value;
    var m = { id: 'm' + Date.now().toString(36), nome: nome, tipo: tipo, hora: $('novo-hora').value || '08:00', min: Math.max(15, +$('novo-min').value || 120), on: true };
    // um horário que já passou hoje só toca amanhã
    if (tipo === 'hora' && minutosDoDia(m.hora) <= new Date().getHours() * 60 + new Date().getMinutes()) S.tocados[m.id] = chaveDia();
    S.meus.push(m); salvar(); renderMeus();
    $('novo-nome').value = '';
    var semNotif = 'Notification' in window && Notification.permission === 'default';
    falar('Anotado. Eu lembro você de: ' + nome + '.' + (semNotif ? ' Ative as notificações para eu avisar com o app em segundo plano.' : ''), 'ideia', true);
  });

  $('b-notif').addEventListener('click', function () {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function () { estadoNotif(); if (Notification.permission === 'granted') falar('Notificações ligadas. Agora eu aviso com o app em segundo plano.', 'comemorando', true); });
  });
  $('b-apagar').addEventListener('click', function () {
    if (!confirm('Apagar pontos, títulos, reflexões e lembretes deste aparelho? Não tem como desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { }
    S = padrao(); location.reload();
  });

  // instalar (Android e computador)
  var pedidoInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); pedidoInstalar = e;
    if ($('b-instalar')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'b-instalar'; b.textContent = 'Instalar o app';
    b.addEventListener('click', function () { pedidoInstalar.prompt(); pedidoInstalar.userChoice.finally(function () { b.remove(); }); });
    var w = document.createElement('div'); w.className = 'acoes'; w.appendChild(b);
    document.querySelector('.instalar h2').after(w);
  });

  // ---------- Tarefas e rotinas ----------
  function amanhaChave() { var d = new Date(); d.setDate(d.getDate() + 1); return chaveDia(d); }
  function novoId(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function feitaHoje(t) { return t.rotina ? !!dia().feitas[t.id] : t.feita === chaveDia(); }
  function visiveisHoje() {
    var hoje = chaveDia();
    return S.tarefas.filter(function (t) { return t.rotina || (t.dia <= hoje && (!t.feita || t.feita === hoje)); })
      .sort(function (a, b) { return (feitaHoje(a) - feitaHoje(b)) || (b.prio - a.prio) || (a.rotina - b.rotina); });
  }
  function marcarTarefa(t) {
    var hoje = chaveDia(), liga = !feitaHoje(t), pts = t.prio ? 5 : 3;
    mudar(function (d) {
      if (t.rotina) { if (liga) d.feitas[t.id] = pts; else { pts = d.feitas[t.id] || pts; delete d.feitas[t.id]; } }
      else { t.feita = liga ? hoje : null; if (liga) d.feitas[t.id] = pts; else { pts = d.feitas[t.id] || 0; delete d.feitas[t.id]; } }
      d.tarefasPts = Math.max(0, d.tarefasPts + (liga ? pts : -pts));
    });
    if (liga) {
      var faltam = visiveisHoje().filter(function (x) { return x.prio && !feitaHoje(x); }).length;
      falar(t.prio ? (faltam ? 'Prioridade feita. Faltam ' + faltam + '. +5' : 'Todas as prioridades de hoje feitas! +5') : 'Feito: ' + t.texto + '. +3', faltam || !t.prio ? 'ola' : 'comemorando', !faltam && t.prio);
    }
  }
  function linhaTarefa(t, opcoes) {
    var li = document.createElement('li'), feita = opcoes.amanha ? false : feitaHoje(t), hoje = chaveDia();
    li.className = 'tarefa' + (feita ? ' feita' : '') + (t.prio ? ' prio' : '');
    if (!opcoes.amanha) {
      var cb = document.createElement('button'); cb.type = 'button'; cb.className = 'marca-tarefa';
      cb.setAttribute('aria-pressed', String(feita)); cb.setAttribute('aria-label', (feita ? 'Desmarcar: ' : 'Concluir: ') + t.texto);
      cb.addEventListener('click', function () { marcarTarefa(t); });
      li.appendChild(cb);
    }
    var txt = document.createElement('span'); txt.className = 'tarefa-txt'; txt.textContent = t.texto;
    if (t.rotina) { var r = document.createElement('small'); r.textContent = 'Rotina'; txt.appendChild(r); }
    else if (!opcoes.amanha && t.dia < hoje) { var v = document.createElement('small'); v.textContent = 'Veio de antes'; txt.appendChild(v); }
    li.appendChild(txt);
    var pr = document.createElement('button'); pr.type = 'button'; pr.className = 'prio-bt'; pr.textContent = t.prio ? '★' : '☆';
    pr.setAttribute('aria-pressed', String(!!t.prio)); pr.setAttribute('aria-label', 'Prioridade: ' + t.texto);
    pr.title = t.prio ? 'Tirar a prioridade' : 'Marcar como prioridade';
    pr.addEventListener('click', function () { t.prio = !t.prio; salvar(); render(); });
    li.appendChild(pr);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'tirar-bt'; x.textContent = '×';
    x.setAttribute('aria-label', 'Remover: ' + t.texto);
    x.addEventListener('click', function () { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); salvar(); render(); });
    li.appendChild(x);
    return li;
  }
  function renderTarefas() {
    var lista = visiveisHoje(), feitas = lista.filter(feitaHoje), hoje = chaveDia(), am = amanhaChave();
    var ul = $('tarefas'); ul.innerHTML = '';
    lista.forEach(function (t) { ul.appendChild(linhaTarefa(t, {})); });
    var prios = lista.filter(function (t) { return t.prio; });
    $('tarefas-resumo').textContent = lista.length
      ? feitas.length + ' de ' + lista.length + ' feitas' + (prios.length ? ', ' + prios.filter(feitaHoje).length + ' de ' + prios.length + ' prioridades.' : '.') + ' Toque na estrela para mudar a prioridade.'
      : 'Nada na lista. Tarefa some quando você conclui. Rotina volta todo dia.';

    // revisão do fim do dia
    $('revisao-resumo').textContent = lista.length
      ? 'Você concluiu ' + feitas.length + ' de ' + lista.length + ' itens hoje.' + (feitas.length === lista.length ? ' Dia fechado.' : ' O que ficou, vai para amanhã ou sai da lista?')
      : 'Sem tarefas hoje. Quer deixar algo pronto para amanhã?';
    var pend = $('pendentes'); pend.innerHTML = '';
    lista.filter(function (t) { return !t.rotina && !feitaHoje(t); }).forEach(function (t) {
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = (t.prio ? '★ ' : '') + t.texto;
      var a = document.createElement('button'); a.type = 'button'; a.className = 'btn btn-sec'; a.textContent = 'Amanhã';
      a.addEventListener('click', function () { t.dia = am; salvar(); render(); falar('Combinado: "' + t.texto + '" fica para amanhã.', 'ideia'); });
      var r = document.createElement('button'); r.type = 'button'; r.className = 'link perigo'; r.textContent = 'Tirar';
      r.addEventListener('click', function () { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); salvar(); render(); });
      li.appendChild(sp); li.appendChild(a); li.appendChild(r); pend.appendChild(li);
    });
    var ula = $('amanha'); ula.innerHTML = '';
    S.tarefas.filter(function (t) { return !t.rotina && t.dia > hoje; }).forEach(function (t) { ula.appendChild(linhaTarefa(t, { amanha: true })); });
  }
  function addTarefa(texto, prio, rotina, quando) {
    S.tarefas.push({ id: novoId('t'), texto: texto, prio: prio, rotina: rotina, dia: quando, feita: null });
    salvar(); render();
  }
  $('nova-tarefa').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('tarefa-txt').value.trim(); if (!txt) return;
    addTarefa(txt, $('tarefa-prio').checked, $('tarefa-rotina').checked, chaveDia());
    falar($('tarefa-rotina').checked ? 'Rotina criada. Ela volta todo dia.' : ($('tarefa-prio').checked ? 'Prioridade anotada. Começa por ela?' : 'Anotado na lista de hoje.'), 'ideia');
    $('tarefa-txt').value = ''; $('tarefa-prio').checked = false; $('tarefa-rotina').checked = false;
  });
  $('nova-amanha').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('amanha-txt').value.trim(); if (!txt) return;
    addTarefa(txt, $('amanha-prio').checked, false, amanhaChave());
    $('amanha-txt').value = ''; $('amanha-prio').checked = false;
    falar('Anotado para amanhã. Agora pode descansar.', 'ideia');
  });

  // ---------- Metas do ano ----------
  var STATUS = [['caminho', 'No caminho'], ['atrasada', 'Atrasada'], ['parada', 'Parada'], ['concluida', 'Concluída']];
  function trimestre(d) { return Math.floor(d.getMonth() / 3) + 1; }
  function fimTrimestre(ano, t) { return new Date(ano, t * 3, 0); }
  // Revisão pendente: nos últimos 15 dias do trimestre, ou nos primeiros 30 dias do seguinte se a anterior ficou sem resposta.
  function metasPendentes() {
    var d = new Date(), ano = d.getFullYear(), t = trimestre(d), out = [];
    var hoje0 = new Date(ano, d.getMonth(), d.getDate());
    var fim = fimTrimestre(ano, t), diasFim = Math.round((fim - hoje0) / 86400000);
    var ini = new Date(ano, (t - 1) * 3, 1), diasIni = Math.round((hoje0 - ini) / 86400000);
    var antT = t === 1 ? 4 : t - 1, antAno = t === 1 ? ano - 1 : ano, antFim = chaveDia(fimTrimestre(antAno, antT));
    S.metas.forEach(function (m) {
      if (m.ano === antAno && diasIni < 30 && m.criada <= antFim && !m.checkins[antAno + '-T' + antT] && !m.checkins.fim) out.push({ meta: m, chave: antAno + '-T' + antT, rotulo: 'T' + antT + (antAno !== ano ? ' de ' + antAno : '') });
      if (m.ano === ano && diasFim <= 15 && !m.checkins[ano + '-T' + t] && !m.checkins.fim) out.push({ meta: m, chave: ano + '-T' + t, rotulo: 'T' + t });
    });
    return out;
  }
  function revisarMeta(m, chave, status) {
    var nova = !m.checkins[chave];
    mudar(function (d) {
      m.checkins[chave] = status;
      if (status === 'concluida') m.checkins.fim = chave;
      else if (m.checkins.fim === chave) delete m.checkins.fim;
      if (nova) d.metasPts += 10;
    });
    var falas = { caminho: 'Meta no caminho. Segue assim.', atrasada: 'Atrasou, acontece. Qual é o menor passo para destravar esta semana?', parada: 'Parada também é resposta. Vale ajustar a meta ou largar de vez?', concluida: 'Meta concluída! Isso merece comemoração.' };
    falar(falas[status] + (nova ? ' +10' : ''), status === 'concluida' ? 'comemorando' : 'ideia', status === 'concluida');
  }
  var abertas = {};
  function renderMetas() {
    var d = new Date(), ano = d.getFullYear(), tAtual = trimestre(d), pend = metasPendentes();
    $('metas-ano').textContent = ano;
    var aviso = $('metas-aviso');
    aviso.hidden = !pend.length;
    aviso.textContent = pend.length ? 'Hora da revisão: ' + pend.length + (pend.length === 1 ? ' meta espera' : ' metas esperam') + ' a sua resposta.' : '';
    var ul = $('metas'); ul.innerHTML = '';
    S.metas.filter(function (m) { return m.ano === ano || pend.some(function (p) { return p.meta === m; }); }).forEach(function (m) {
      var li = document.createElement('li'); li.className = 'meta' + (m.checkins.fim ? ' concluida' : '');
      var topo = document.createElement('div'); topo.className = 'meta-topo';
      var nome = document.createElement('strong'); nome.textContent = m.texto; topo.appendChild(nome);
      var tri = document.createElement('ol'); tri.className = 'trimestres'; tri.setAttribute('aria-label', 'Revisões por trimestre');
      for (var t = 1; t <= 4; t++) {
        var st = m.checkins[m.ano + '-T' + t], it = document.createElement('li');
        it.className = (st || '') + (m.ano === ano && t === tAtual ? ' agora' : '');
        it.textContent = 'T' + t;
        it.title = st ? STATUS.filter(function (x) { return x[0] === st; })[0][1] : (m.ano === ano && t > tAtual ? 'Ainda não chegou' : 'Sem revisão');
        it.setAttribute('aria-label', 'T' + t + ': ' + it.title);
        tri.appendChild(it);
      }
      topo.appendChild(tri); li.appendChild(topo);
      var minha = pend.filter(function (p) { return p.meta === m; });
      var alvo = minha.length ? minha[0] : (abertas[m.id] && m.ano === ano ? { chave: ano + '-T' + tAtual, rotulo: 'T' + tAtual } : null);
      if (alvo) {
        var box = document.createElement('div'); box.className = 'meta-revisar';
        var q = document.createElement('p'); q.textContent = 'Como está esta meta no ' + alvo.rotulo + '?'; box.appendChild(q);
        var bts = document.createElement('div'); bts.className = 'status-bts';
        STATUS.forEach(function (s2) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'status-bt ' + s2[0]; b.textContent = s2[1];
          b.setAttribute('aria-pressed', String(m.checkins[alvo.chave] === s2[0]));
          b.addEventListener('click', function () { abertas[m.id] = false; revisarMeta(m, alvo.chave, s2[0]); });
          bts.appendChild(b);
        });
        box.appendChild(bts); li.appendChild(box);
      }
      var acoes = document.createElement('div'); acoes.className = 'meta-acoes';
      if (!minha.length && m.ano === ano) {
        var rv = document.createElement('button'); rv.type = 'button'; rv.className = 'link';
        rv.textContent = abertas[m.id] ? 'Fechar' : (m.checkins[ano + '-T' + tAtual] ? 'Mudar a revisão do T' + tAtual : 'Revisar agora');
        rv.addEventListener('click', function () { abertas[m.id] = !abertas[m.id]; renderMetas(); });
        acoes.appendChild(rv);
      }
      var x = document.createElement('button'); x.type = 'button'; x.className = 'link perigo'; x.textContent = 'Remover';
      x.addEventListener('click', function () { if (confirm('Remover a meta "' + m.texto + '"?')) { S.metas = S.metas.filter(function (y) { return y.id !== m.id; }); salvar(); render(); } });
      acoes.appendChild(x); li.appendChild(acoes);
      ul.appendChild(li);
    });
  }
  $('nova-meta').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('meta-txt').value.trim(); if (!txt) return;
    S.metas.push({ id: novoId('g'), texto: txt, ano: new Date().getFullYear(), criada: chaveDia(), checkins: {} });
    $('meta-txt').value = ''; salvar(); render();
    falar(S.metas.length > 5 ? 'Meta anotada. Dica: com mais de cinco metas, o foco se espalha.' : 'Meta anotada. No fim do trimestre eu pergunto como ela está.', 'ideia', true);
  });

  // ---------- Relógio central ----------
  var ultimoDia = chaveDia();
  function tick() {
    if (S.timer.rodando && Date.now() >= S.timer.fimEm) concluir(false);
    checarLembretes();
    renderTimer();
    if (S.semTelaAtivo && Date.now() >= S.semTelaAtivo.fimEm) concluirTela(S.semTelaAtivo.min);
    if (chaveDia() !== ultimoDia) { ultimoDia = chaveDia(); var r = fecharDias(); podar(); salvar(); render(); falar(saudacao(), 'ola'); avisarFechamento(r); }
  }
  var lento = 0;
  setInterval(function () { tick(); if (++lento % 30 === 0) { salvar(); renderLembretes(); } }, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); render(); } });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/rotina/sw.js', { scope: '/rotina/' }).then(function (r) { registro = r; return navigator.serviceWorker.ready; }).then(function (r) { registro = r; }).catch(function () {});
  }

  var fechamento = fecharDias();
  podar(); dia(); salvar();
  falar(saudacao(), S.timer.rodando ? 'estudando' : 'ola');
  avisarFechamento(fechamento);
  if (S.semTelaAtivo) { if (Date.now() >= S.semTelaAtivo.fimEm) concluirTela(S.semTelaAtivo.min); else contarTela(); }
  estadoNotif(); renderMeus(); render(); renderTimer();
})();
