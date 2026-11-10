// Rotina com a Zumi: timer de blocos, lembretes, checks, pontos e títulos.
// Tudo fica no localStorage deste aparelho (chave rizzygo-rotina-v1). Sem login e sem servidor.
// Quem quiser liga a cópia na nuvem pelo botão Entrar do topo ou em Ajustes (/conta.js e /nuvem.js); o aparelho segue sendo a fonte.
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

  // Como a Zumi aparece em cada título: selo, cor do anel e pose de descanso.
  var VISUAL = [
    { ic: '🌱', cor: '#7CB98F', pose: 'ola' },
    { ic: '🌤️', cor: '#5B9BE6', pose: 'ola' },
    { ic: '🌼', cor: '#F2C94C', pose: 'estudando' },
    { ic: '🛡️', cor: '#3F7BE0', pose: 'estudando' },
    { ic: '🏗️', cor: '#E8902A', pose: 'estudando' },
    { ic: '🍯', cor: '#F5A524', pose: 'comemorando' },
    { ic: '👑', cor: '#F5A524', pose: 'comemorando' }
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
    agua: { texto: 'Hora de beber água.', feito: 'Bebi' },
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
        pausas: { trabalho: true, estudo: true }, somTipo: 'zumi',
        inicio: '08:00', fim: '22:00', som: true, somLembretes: true, somVitoria: true, lembrarMetas: true,
        lembretes: { agua: { on: true, min: 45 }, respirar: { on: true, min: 90 }, semTela: { on: true, min: 120 } }
      },
      meus: [], tarefas: [], metas: [], diario: {}, grupos: gruposPadrao(),
      timer: { modo: 'estudo', fase: 'foco', ciclo: 1, rodando: false, fimEm: null, restante: null },
      proximos: {}, adiados: {}, tocados: {},
      dias: {}, pontosAntigos: 0,
      criadoEm: chaveDia(), fechadoAte: null, melhor: 0, semTelaAtivo: null
    };
  }

  // Grupos da lista Sem data. Os três primeiros vêm prontos; a pessoa muda, apaga ou cria outros.
  function gruposPadrao() {
    return [
      { id: 'g-viagem', nome: 'Viagem', emoji: '✈️' },
      { id: 'g-mercado', nome: 'Mercado', emoji: '🛒' },
      { id: 'g-internet', nome: 'Comprar na internet', emoji: '📦' }
    ];
  }

  function carregar() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { s = null; }
    var p = padrao();
    if (!s || s.v !== 1) return p;
    // completa campos que versões novas acrescentarem
    s.config = Object.assign({}, p.config, s.config || {});
    s.config.lembretes = Object.assign({}, p.config.lembretes, s.config.lembretes || {});
    s.config.pausas = Object.assign({}, p.config.pausas, s.config.pausas || {});
    ['meus', 'tarefas', 'metas', 'diario', 'grupos', 'proximos', 'adiados', 'tocados', 'dias', 'timer'].forEach(function (k) { if (!s[k]) s[k] = p[k]; });
    if (typeof s.pontosAntigos !== 'number') s.pontosAntigos = 0;
    if (!s.criadoEm) s.criadoEm = Object.keys(s.dias).sort()[0] || chaveDia();
    if (typeof s.melhor !== 'number') s.melhor = 0;
    return s;
  }

  var S = carregar();
  var nuvem = null; // módulo da nuvem, só quando a pessoa liga
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) { /* modo privado: segue sem salvar */ } if (nuvem) nuvem.mudou(); }

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
    while (ks.length > 60) {
      var k = ks.shift(), d = S.dias[k];
      S.pontosAntigos += pontosDia(d);
      // o histórico pessoal (como foi o dia) fica guardado mesmo depois dos 60 dias
      if (d.humor || d.reflexao || d.papel) S.diario[k] = { humor: d.humor || 0, texto: d.reflexao || '', papel: !!d.papel };
      delete S.dias[k];
    }
    // tarefa concluída há mais de 60 dias sai da lista guardada (os pontos dela já ficaram no dia)
    var limite = new Date(); limite.setDate(limite.getDate() - 60); limite = chaveDia(limite);
    S.tarefas = S.tarefas.filter(function (t) { return t.rotina || !t.feita || t.feita >= limite; });
  }

  // ---------- Pontos ----------
  // Água: a pessoa marca como foi o dia (sem contar copos). Ruim não vale ponto, Bom vale 10, Excelente vale 20.
  function nivelAgua(d) {
    if (!d) return null;
    if (d.aguaNivel) return d.aguaNivel;
    if (d.agua > 0) { var r = d.agua / (d.metaAgua || 8); return r >= 1 ? 'excelente' : r >= 0.6 ? 'bom' : 'ruim'; } // dados da versão com copos
    return null;
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
      (PONTOS_AGUA[nivelAgua(d)] || 0) + 5 * Math.min(d.respirar || 0, 6) +
      (d.semTelaPts != null ? Math.min(d.semTelaPts, 60) : 5 * Math.min(d.semTela || 0, 4)) +
      20 * ex + ((d.reflexao || d.papel || d.refOculta || d.humor) ? 10 : 0) + 2 * Math.min(d.meus || 0, 10) +
      Math.min(d.tarefasPts || 0, 40) + Math.min(d.metasPts || 0, 50);
  }
  function total() {
    return Math.max(0, S.pontosAntigos + Object.keys(S.dias).reduce(function (s, k) { return s + pontosDia(S.dias[k]); }, 0));
  }
  // Abaixo do título: os pontos caíram (dias parados), mas o título conquistado continua. Só o brilho apaga.
  function abaixoDoTitulo() { return total() < TITULOS[tituloAtual()][0]; }
  function indiceTitulo(p) { var i = 0; TITULOS.forEach(function (t, j) { if (p >= t[0]) i = j; }); return i; }
  // O título conquistado não cai, mesmo que os pontos diminuam.
  function tituloAtual() { var i = indiceTitulo(total()); if (i > S.melhor) S.melhor = i; return S.melhor; }
  function ativo(d) { return !!d && (pontosBrutos(d) > 0 || !!nivelAgua(d) || !!d.reflexao || !!d.refOculta || !!d.humor); }

  // Fecha os dias que já passaram: guarda pontos e nível da água; dia sem atividade perde 10 pontos.
  function fecharDias() {
    var hoje = chaveDia(), inicio = S.fechadoAte || S.criadoEm, d = new Date(inicio + 'T12:00');
    if (S.fechadoAte) d.setDate(d.getDate() + 1);
    var fechados = [], parados = 0, seguidos = 0;
    // a parada pode ter começado antes: conta os dias parados que já foram fechados
    var antes = new Date(d); antes.setDate(antes.getDate() - 1);
    while (chaveDia(antes) >= S.criadoEm && S.dias[chaveDia(antes)] && !ativo(S.dias[chaveDia(antes)])) { seguidos++; antes.setDate(antes.getDate() - 1); }
    while (chaveDia(d) < hoje) {
      var k = chaveDia(d), reg = S.dias[k];
      if (ativo(reg)) { reg.fechado = true; fechados.push(k); seguidos = 0; }
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
  // Dias seguidos sem atividade até ontem, e o primeiro dia dessa parada.
  function parada() {
    var d = new Date(), n = 0, inicio = null; d.setDate(d.getDate() - 1);
    while (chaveDia(d) >= S.criadoEm && !ativo(S.dias[chaveDia(d)])) { n++; inicio = chaveDia(d); d.setDate(d.getDate() - 1); }
    return { dias: n, inicio: inicio };
  }
  // Mais de 7 dias parados: a Zumi pergunta se a pessoa quer zerar e começar de novo (uma vez por parada).
  function perguntarRecomeco() {
    var p = parada();
    if (p.dias <= 7 || S.recomecoVisto === p.inicio) return false;
    $('recomeco-txt').textContent = 'Faz ' + p.dias + ' dias que a gente não se vê. Quer zerar a colmeia e começar de novo, ou continuar de onde parou?';
    $('recomeco').hidden = false;
    $('recomeco').dataset.inicio = p.inicio;
    falar('Que bom ter você de volta!', 'ola', true);
    return true;
  }
  function avisarFechamento(r) {
    if (perguntarRecomeco()) return;
    var ontem = new Date(); ontem.setDate(ontem.getDate() - 1); var k = chaveDia(ontem), reg = S.dias[k];
    if (r.parados) falar('Você ficou ' + (r.parados === 1 ? '1 dia' : r.parados + ' dias') + ' sem atividade: −' + (r.parados * 10) + ' pontos. O título continua seu. Bora retomar com um passo pequeno?', 'ola');
    else if (r.fechados.indexOf(k) >= 0) falar('Ontem fechou com ' + pontosDia(reg) + ' pontos' + (nivelAgua(reg) ? ' e água ' + NIVEIS[nivelAgua(reg)] : '') + '. Hoje é mais um favo na sua colmeia.', 'comemorando', true);
  }
  function sequencia() {
    var d = new Date(), n = 0;
    if (pontosDia(S.dias[chaveDia(d)]) === 0) d.setDate(d.getDate() - 1);
    while (pontosDia(S.dias[chaveDia(d)]) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // Toda mudança que vale ponto passa por aqui, para a Zumi comemorar quando o título sobe.
  function mudar(fn) {
    var antes = tituloAtual(), apagado = abaixoDoTitulo();
    fn(dia());
    var depois = tituloAtual();
    salvar();
    render();
    if (apagado && !abaixoDoTitulo() && depois === antes) { falar('O brilho de ' + TITULOS[depois][1] + ' voltou! Bom te ver de volta.', 'comemorando', true); vitoria(); }
    if (depois > antes) {
      var t = TITULOS[depois];
      vitoria(true);
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
    pergunta: $('pergunta'), reflexao: $('reflexao'), refEstado: $('reflexao-estado'),
    semana: $('semana'), titulos: $('titulos'), meus: $('meus'),
    notifEstado: $('notif-estado'), aviso: $('aviso'), avisoTxt: $('aviso-txt'),
    sobre: $('sobre'), sobreTitulo: $('sobre-titulo'), bolha: $('bolha'), sobreGuia: $('sobre-guia'), sobreTempo: $('sobre-tempo')
  };

  // ---------- Zumi ----------
  function falar(texto, pose, pular) {
    el.fala.textContent = texto;
    // "olá" é a pose neutra: ela muda conforme o título (a Zumi evolui com os pontos)
    if (pose === 'ola') pose = VISUAL[abaixoDoTitulo() ? indiceTitulo(total()) : tituloAtual()].pose;
    if (pose) {
      el.img.src = '/zumi/abelha-' + pose + '.png';
      el.escuro.srcset = '/zumi/abelha-' + pose + '-fundo-escuro.png';
    }
    if (pular) {
      var p = el.img.closest('.guia-zumi'); p.classList.remove('pula'); void p.offsetWidth; p.classList.add('pula');
    }
  }
  function saudacao() {
    var h = new Date().getHours();
    var oi = h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';
    if (abaixoDoTitulo()) return oi + ' Senti sua falta. Faltam ' + (TITULOS[tituloAtual()][0] - total()) + ' pontos para o brilho do seu título voltar.';
    if (h >= 20) return oi + ' Que tal fechar o dia com a pergunta lá embaixo?';
    return oi + ' Eu sou a Zumi. Escolha um bloco e vamos começar.';
  }

  // ---------- Som e notificação ----------
  // Dois sons feitos na hora, sem arquivo: a Zumi (zumbido curto e um sino) ou só o sino.
  var audio = null;
  function zumbido(ctx, t, dur) {
    var o = ctx.createOscillator(), lfo = ctx.createOscillator(), prof = ctx.createGain();
    var trem = ctx.createOscillator(), tremG = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), amp = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(205, t); o.frequency.linearRampToValueAtTime(245, t + dur * 0.5); o.frequency.linearRampToValueAtTime(215, t + dur);
    lfo.frequency.value = 11; prof.gain.value = 9; lfo.connect(prof); prof.connect(o.frequency);
    trem.frequency.value = 23; tremG.gain.value = 0.35; trem.connect(tremG); tremG.connect(amp.gain); amp.gain.value = 0.65;
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.setValueAtTime(0.16, t + dur - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(amp); amp.connect(g); g.connect(ctx.destination);
    [o, lfo, trem].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }
  function sino(ctx, t, base, forca) {
    // Parciais de sino: a fundamental e harmônicos "tortos", que somem em tempos diferentes.
    [[1, 1, 2.2], [2.0, 0.5, 1.6], [2.76, 0.35, 1.1], [5.4, 0.18, 0.6], [8.93, 0.08, 0.35]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(), v = 0.22 * p[1] * (forca || 1);
      o.type = 'sine'; o.frequency.value = base * p[0];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + p[2] + 0.05);
    });
  }
  // tipo 'lembrete' usa a chave própria e um som mais curto; forcar toca mesmo desligado (botão Ouvir).
  function tocar(forcar, tipo) {
    var lembrete = tipo === 'lembrete';
    if (!forcar && !(lembrete ? S.config.somLembretes : S.config.som)) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var t = audio.currentTime + 0.05;
      if (S.config.somTipo !== 'sino') { zumbido(audio, t, lembrete ? 0.4 : 0.7); t += lembrete ? 0.45 : 0.75; }
      sino(audio, t, 1046.5); if (!lembrete) sino(audio, t + 0.45, 784, 0.8);
    } catch (e) { /* sem áudio */ }
    if (navigator.vibrate && !forcar) navigator.vibrate([120, 80, 120]);
  }
  // Som de vitória (/vitoria.js): meta do dia batida, meta do ano concluída, título novo.
  function vitoria(forte, forcar) {
    if ((!forcar && !S.config.somVitoria) || !window.AkoVitoria) return;
    pedirAudio(); window.AkoVitoria.tocar(forte, audio);
    if (navigator.vibrate && !forcar) navigator.vibrate(forte ? [80, 60, 80, 60, 220] : [80, 60, 160]);
  }
  // Metas do dia comemoram uma vez por dia, mesmo que a pessoa desmarque e marque de novo.
  function vitoriaDoDia(qual) {
    var k = 'vitoria-' + qual, hoje = chaveDia();
    if (S.tocados[k] === hoje) return false;
    S.tocados[k] = hoje; salvar(); vitoria();
    return true;
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
    if (!('Notification' in window)) { el.notifEstado.textContent = 'Este navegador não mostra notificações. No iPhone, crie o atalho na tela inicial primeiro (veja Ajustes).'; b.hidden = true; return; }
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
      } else if (!S.config.pausas[modo]) {
        // Pausa desligada: o bloco conta, o ciclo avança e o próximo espera a pessoa.
        t.ciclo = t.ciclo >= S.config.ciclos ? 1 : t.ciclo + 1;
        t.rodando = false; t.fimEm = null; t.restante = null;
        if (!pulou) { tocar(); notificar('Fim do bloco de ' + NOMES[modo], 'Bloco feito. +10', 'timer'); }
        falar(pulou ? 'Pulei o bloco. Quando quiser, começa o próximo.' : 'Bloco feito, sem pausa como você pediu. +10. Quando quiser, começa o próximo.', pulou ? 'ola' : 'comemorando', !pulou);
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
    el.ciclo.textContent = t.modo === 'lazer' ? 'Sem culpa' : S.config.pausas[t.modo] ? 'Bloco ' + t.ciclo + ' de ' + S.config.ciclos : 'Bloco ' + t.ciclo + ', sem pausa';
    el.iniciar.textContent = t.rodando ? 'Pausar' : (t.restante != null ? 'Continuar' : 'Começar');
    $('h-tempo').textContent = mmss(s); $('h-fase').textContent = el.fase.textContent;
    $('h-modo').textContent = { trabalho: 'Trabalho', estudo: 'Estudo', lazer: 'Lazer' }[t.modo];
    $('h-iniciar').textContent = el.iniciar.textContent;
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
    tocar(false, 'lembrete');
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
      } else if (!m.semana || m.semana.indexOf(d.getDay()) >= 0) {
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
      quando.textContent = m.tipo === 'hora' ? textoDias(m.semana) + ' às ' + m.hora : 'a cada ' + m.min + ' min';
      var tirar = document.createElement('button'); tirar.type = 'button'; tirar.className = 'btn btn-perigo tirar'; tirar.textContent = 'Remover';
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
    if (S.melhor > antes) { falar('Título novo: ' + TITULOS[S.melhor][1] + '! ' + TITULOS[S.melhor][2], 'comemorando', true); vitoria(true); }
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

  // Água: botões de nível, histórico editável dos últimos 7 dias e média dos dias marcados.
  var NOTA = { ruim: 1, bom: 2, excelente: 3 };
  function botoesNivel(box, k) {
    box.innerHTML = '';
    var atual = nivelAgua(S.dias[k]);
    ['ruim', 'bom', 'excelente'].forEach(function (nv) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nivel-bt ' + nv; b.setAttribute('role', 'radio');
      b.textContent = NIVEIS[nv]; b.setAttribute('aria-checked', String(atual === nv));
      b.addEventListener('click', function () { definirAgua(k, atual === nv ? null : nv); });
      box.appendChild(b);
    });
  }
  function definirAgua(k, nv) {
    var antes = tituloAtual(), apagado = abaixoDoTitulo(), d = dia(k), tirouPerda = false;
    d.aguaNivel = nv || null; if (!nv) delete d.agua;
    if (nv && d.penalidade) { delete d.penalidade; tirouPerda = true; }
    var depois = tituloAtual(); salvar(); render();
    var hoje = k === chaveDia();
    if (!nv) falar('Marcação da água apagada.', null);
    else if (tirouPerda) falar('Água marcada e aquele dia saiu do vermelho. +10 de volta' + (PONTOS_AGUA[nv] ? ' e +' + PONTOS_AGUA[nv] + ' da água.' : '.'), 'comemorando', true);
    else if (hoje) {
      falar(nv === 'excelente' ? 'Água excelente hoje! Meta da água batida. +20' : nv === 'bom' ? 'Água boa hoje. +10' : 'Dia fraco de água. Os lembretes ajudam amanhã.', nv === 'ruim' ? 'ideia' : 'comemorando', nv !== 'ruim');
      if (nv === 'excelente') vitoriaDoDia('agua');
    }
    else falar('Água de ' + new Date(k + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' }) + ' corrigida: ' + NIVEIS[nv] + '.', null);
    if (depois > antes) { falar('Título novo: ' + TITULOS[depois][1] + '! ' + TITULOS[depois][2], 'comemorando', true); vitoria(true); }
    else if (apagado && !abaixoDoTitulo()) { falar('O brilho de ' + TITULOS[depois][1] + ' voltou! Bom te ver de volta.', 'comemorando', true); vitoria(); }
  }
  function mediaAgua(n) {
    var soma = 0, dias = 0, hoje = new Date();
    for (var j = 1; j <= n; j++) { var x = new Date(hoje); x.setDate(x.getDate() - j); var nv = nivelAgua(S.dias[chaveDia(x)]); if (nv) { soma += NOTA[nv]; dias++; } }
    if (!dias) return ['-', 'nenhum dia marcado nos últimos ' + n];
    var m = soma / dias, nome = m >= 2.5 ? 'Excelente' : m >= 1.5 ? 'Bom' : 'Ruim';
    return [nome, 'média de ' + dias + (dias === 1 ? ' dia marcado' : ' dias marcados') + ' nos últimos ' + n];
  }
  function renderAgua() {
    botoesNivel($('agua-hoje'), chaveDia());
    var nv = nivelAgua(dia());
    $('agua-falta').textContent = nv ? (nv === 'ruim' ? 'Marcado como Ruim. Dá para mudar até o fim do dia.' : 'Marcado como ' + NIVEIS[nv] + '. +' + PONTOS_AGUA[nv] + ' no dia.') : 'Marque como foi. Bom vale 10 pontos e Excelente vale 20.';
    var m7 = mediaAgua(7), m30 = mediaAgua(30);
    $('agua-media7').textContent = m7[0]; $('agua-media7-txt').textContent = m7[1];
    $('agua-media30').textContent = m30[0]; $('agua-media30-txt').textContent = m30[1];
    var lista = $('historico-agua'); lista.innerHTML = '';
    for (var j = 1; j <= 7; j++) {
      var x = new Date(); x.setDate(x.getDate() - j); var k = chaveDia(x);
      if (k < S.criadoEm && !S.dias[k]) continue;
      var li = document.createElement('li'), r = S.dias[k];
      var nome = document.createElement('span'); nome.className = 'dia-nome';
      nome.textContent = j === 1 ? 'Ontem' : x.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
      if (r && r.penalidade) { var sm = document.createElement('small'); sm.textContent = 'Sem atividade'; nome.appendChild(sm); }
      var box = document.createElement('div'); box.className = 'niveis pequenos'; box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', 'Água de ' + nome.firstChild.textContent);
      botoesNivel(box, k);
      li.appendChild(nome); li.appendChild(box); lista.appendChild(li);
    }
  }

  // ---------- Render geral ----------
  function render() {
    var d = dia(), p = total(), i = tituloAtual(), t = TITULOS[i], prox = TITULOS[i + 1];
    var v = VISUAL[i], zn = $('zumi-nivel');
    $('titulo-txt').textContent = t[1]; $('titulo-ic').textContent = v.ic;
    $('titulo-frase').textContent = t[2];
    $('titulo-nivel').textContent = 'nível ' + (i + 1) + ' de ' + TITULOS.length;
    $('zumi-selo').textContent = v.ic;
    if (zn.dataset.nivel !== String(i)) { zn.dataset.nivel = String(i); el.img.alt = 'A Zumi, no título ' + t[1]; }
    zn.style.setProperty('--nivel-cor', v.cor);
    var apagado = p < t[0];
    zn.classList.toggle('apagada', apagado);
    $('titulo-atual').classList.toggle('apagado', apagado);
    if (apagado) {
      // o anel mostra o caminho de volta até o ponto do título
      var base = TITULOS[indiceTitulo(p)][0], pct = Math.max(0, Math.min(100, 100 * (p - base) / (t[0] - base)));
      zn.style.setProperty('--prog', pct.toFixed(1));
      el.tBarra.style.width = pct.toFixed(1) + '%';
      el.tMeta.textContent = p + ' pontos · faltam ' + (t[0] - p) + ' para o brilho voltar';
      $('titulo-frase').textContent = 'O título continua seu. Os pontos caíram com os dias parados; volte e o brilho acende de novo.';
    } else {
      zn.style.setProperty('--prog', prox ? Math.max(0, Math.min(100, 100 * (p - t[0]) / (prox[0] - t[0]))).toFixed(1) : '100');
      el.tBarra.style.width = prox ? Math.max(0, 100 * (p - t[0]) / (prox[0] - t[0])).toFixed(1) + '%' : '100%';
      el.tMeta.textContent = p + ' pontos' + (prox ? ' · faltam ' + (prox[0] - p) + ' para ' + prox[1] : ' · título máximo');
    }
    el.rPontos.textContent = pontosDia(d);
    el.rFoco.textContent = d.minutos.trabalho + d.minutos.estudo;
    el.rSeq.textContent = sequencia();

    // água
    renderAgua();

    // checks
    $('c-respirar').textContent = d.respirar ? d.respirar + 'x hoje · +5' : '+5 pontos';
    $('c-semTela').textContent = d.semTelaMin ? d.semTelaMin + ' min hoje · +' + Math.min(d.semTelaPts, 60) : 'De 5 minutos a 2 horas';
    document.querySelectorAll('[data-acao="respirar"]').forEach(function (b) { b.setAttribute('aria-pressed', String(d.respirar > 0)); });
    document.querySelectorAll('[data-acao="semTela"]').forEach(function (b) { b.setAttribute('aria-pressed', String(d.semTelaMin > 0 || d.semTela > 0)); });
    document.querySelectorAll('[data-ex]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!d.ex[b.dataset.ex])); });

    // reflexão
    var hojeN = Math.floor(new Date(chaveDia() + 'T12:00').getTime() / 86400000);
    el.pergunta.textContent = PERGUNTAS[hojeN % PERGUNTAS.length];
    if (document.activeElement !== el.reflexao) el.reflexao.value = d.reflexao || '';
    el.refEstado.textContent = d.reflexao ? 'Salvo no seu histórico. +10' : d.papel ? 'Respondido no papel. +10' : d.humor ? 'Marcado como ' + HUMORES[d.humor][1] + '. +10' : '';
    document.querySelectorAll('[data-humor]').forEach(function (b) { b.setAttribute('aria-checked', String(+b.dataset.humor === (d.humor || 0))); });
    renderAmanhaFim();
    if (!$('historico').hidden) renderHistorico();

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

    // títulos: trilha com os 7 níveis e um cartão para cada um
    el.titulos.innerHTML = '';
    var trilha = $('titulos-trilha'); trilha.innerHTML = '';
    var real = indiceTitulo(p);
    // linha preenchida até onde os pontos chegaram (entre um nível e o próximo, proporcional)
    var passo = real + (TITULOS[real + 1] ? Math.max(0, Math.min(1, (p - TITULOS[real][0]) / (TITULOS[real + 1][0] - TITULOS[real][0]))) : 0);
    trilha.style.setProperty('--trilha', (100 * passo / (TITULOS.length - 1)).toFixed(1) + '%');
    TITULOS.forEach(function (tt, k) {
      var vis = VISUAL[k], conq = k <= i, atual = k === i, apag = atual && p < tt[0];
      var no = document.createElement('span'); no.className = 'no' + (conq ? ' feito' : '') + (atual ? ' atual' : '');
      no.style.setProperty('--cor', vis.cor); no.textContent = vis.ic; no.title = tt[1];
      trilha.appendChild(no);

      var li = document.createElement('li');
      li.className = 'titulo-cartao' + (conq ? ' feito' : ' trancado') + (atual ? ' atual' : '') + (apag ? ' apagado' : '');
      li.style.setProperty('--cor', vis.cor);
      li.innerHTML = '<div class="tc-topo"><span class="tc-ic" aria-hidden="true"></span><span class="tc-nivel"></span><span class="tc-estado"></span></div><strong></strong><p></p><div class="tc-pts"></div>';
      li.querySelector('.tc-ic').textContent = vis.ic;
      li.querySelector('.tc-nivel').textContent = 'Nível ' + (k + 1);
      li.querySelector('strong').textContent = tt[1];
      li.querySelector('p').textContent = tt[2];
      var est = li.querySelector('.tc-estado'), pts = li.querySelector('.tc-pts');
      if (apag) { est.textContent = 'Brilho apagado'; pts.textContent = 'Faltam ' + (tt[0] - p) + ' pts para voltar'; }
      else if (atual) {
        est.textContent = 'Você está aqui';
        var nx = TITULOS[k + 1];
        if (nx) {
          var pc = Math.max(0, Math.min(100, 100 * (p - tt[0]) / (nx[0] - tt[0])));
          pts.innerHTML = '<span class="tc-barra"><i></i></span><small></small>';
          pts.querySelector('i').style.width = pc.toFixed(1) + '%';
          pts.querySelector('small').textContent = (nx[0] - p) + ' pts para ' + nx[1];
        } else pts.textContent = 'Título máximo. A colmeia está em ritmo.';
      }
      else if (conq) { est.textContent = '✓ Conquistado'; pts.textContent = tt[0] ? tt[0] + ' pts' : 'Começo'; }
      else { est.textContent = '🔒'; est.setAttribute('aria-label', 'Ainda não conquistado'); pts.textContent = tt[0] + ' pts · faltam ' + (tt[0] - p); }
      el.titulos.appendChild(li);
    });
    renderLembretes();
    renderTarefas(); renderMetas(); renderHoje();
  }

  // ---------- Configurações nos campos ----------
  function lerCfg(caminho) { return caminho.split('.').reduce(function (o, k) { return o[k]; }, S.config); }
  function gravarCfg(caminho, v) { var ks = caminho.split('.'), o = S.config; ks.slice(0, -1).forEach(function (k) { o = o[k]; }); o[ks[ks.length - 1]] = v; }

  // Depois de trazer a rotina da nuvem, os campos mostram os valores novos.
  function preencherAjustes() {
    document.querySelectorAll('[data-cfg]').forEach(function (inp) { var v = lerCfg(inp.dataset.cfg); if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v; });
    document.querySelectorAll('[data-lem]').forEach(function (inp) { inp.checked = S.config.lembretes[inp.dataset.lem].on; });
    document.querySelectorAll('[data-lem-min]').forEach(function (inp) { inp.value = S.config.lembretes[inp.dataset.lemMin].min; });
    estadoTempos();
  }

  document.querySelectorAll('[data-cfg]').forEach(function (inp) {
    var c = inp.dataset.cfg, v = lerCfg(c);
    if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v;
    inp.addEventListener('change', function () {
      var nv = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? Math.min(+inp.max, Math.max(+inp.min, Math.round(+inp.value || +inp.min))) : inp.value;
      if (inp.type === 'number') inp.value = nv;
      gravarCfg(c, nv);
      document.querySelectorAll('[data-cfg="' + c + '"]').forEach(function (o) { if (o !== inp) { if (o.type === 'checkbox') o.checked = !!nv; else o.value = nv; } });
      if (!S.timer.rodando) S.timer.restante = null;
      salvar(); renderTimer(); estadoTempos();
    });
  });

  // Botões − e + ao lado dos minutos, tempos prontos e a escolha do som.
  document.querySelectorAll('.passo button').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = b.parentNode.querySelector('input');
      if (inp.disabled) return;
      try { if (+b.dataset.passo > 0) inp.stepUp(); else inp.stepDown(); } catch (e) { inp.value = +inp.value + (+b.dataset.passo) * (+inp.step || 1); }
      inp.dispatchEvent(new Event('change'));
    });
  });
  document.querySelectorAll('[data-pronto]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.dataset.pronto;
      S.config[m].foco = +b.dataset.foco; S.config[m].pausa = +b.dataset.pausa; S.config.pausas[m] = true;
      if (!S.timer.rodando) S.timer.restante = null;
      salvar(); preencherAjustes(); renderTimer();
      falar(NOMES[m].charAt(0).toUpperCase() + NOMES[m].slice(1) + ' em ' + b.dataset.foco + ' min de foco e ' + b.dataset.pausa + ' de pausa.', 'estudando');
    });
  });
  document.querySelectorAll('[data-som]').forEach(function (b) {
    b.addEventListener('click', function () { S.config.somTipo = b.dataset.som; salvar(); estadoTempos(); tocar(true); });
  });
  $('b-ouvir').addEventListener('click', function () { tocar(true); });
  $('b-ouvir-lem').addEventListener('click', function () { tocar(true, 'lembrete'); });
  $('b-ouvir-vit').addEventListener('click', function () { vitoria(false, true); });
  function estadoTempos() {
    ['trabalho', 'estudo'].forEach(function (m) {
      var on = !!S.config.pausas[m], cx = document.querySelector('[data-modo-cfg="' + m + '"] .linha-tempo:nth-of-type(2)');
      cx.classList.toggle('desligada', !on);
      cx.querySelectorAll('.passo input,.passo button').forEach(function (x) { x.disabled = !on; });
      document.querySelectorAll('[data-pronto="' + m + '"]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(on && S.config[m].foco === +b.dataset.foco && S.config[m].pausa === +b.dataset.pausa));
      });
    });
    var longa = S.config.pausas.trabalho || S.config.pausas.estudo, cl = document.querySelector('[data-modo-cfg="longa"]');
    cl.classList.toggle('desligada', !longa);
    cl.querySelectorAll('input,button').forEach(function (x) { x.disabled = !longa; });
    document.querySelectorAll('[data-som]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.som === (S.config.somTipo || 'zumi'))); b.disabled = !S.config.som; });
    $('nota-pausa').hidden = S.config.pausas.trabalho && S.config.pausas.estudo;
  }
  estadoTempos();
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
    if (k === 'agua') { falar('Boa! No fim do dia, marque como foi a água.', 'ola'); }
    else if (k === 'respirar') abrirSobre(k);
    else if (k === 'semTela') escolherTela();
    else if (k === 'metas') { irPara('metas'); }
    else if (info && info.meu) { mudar(function (d) { d.meus++; }); falar('Feito: ' + info.meu.nome + '. +2', 'comemorando', true); }
  });
  $('recomeco-zerar').addEventListener('click', function () {
    var p = padrao();
    ['dias', 'pontosAntigos', 'melhor', 'criadoEm', 'fechadoAte', 'timer', 'semTelaAtivo', 'tocados'].forEach(function (k) { S[k] = p[k]; });
    S.recomecoVisto = null; dia(); salvar();
    $('recomeco').hidden = true;
    render(); renderTimer();
    falar('Colmeia nova, do zero. Um passo pequeno hoje já conta: que tal marcar a água ou fazer um bloco?', 'comemorando', true);
  });
  $('recomeco-seguir').addEventListener('click', function () {
    S.recomecoVisto = $('recomeco').dataset.inicio; salvar();
    $('recomeco').hidden = true;
    falar('Seguimos de onde parou. A perda parou nos 7 primeiros dias e o título continua seu. Bora retomar?', 'ola');
  });
  $('aviso-depois').addEventListener('click', function () { S.adiados[atual] = Date.now() + 10 * MIN; salvar(); fecharAviso(); renderLembretes(); });

  $('b-refletir').addEventListener('click', function () {
    var txt = el.reflexao.value.trim();
    if (!txt && !dia().humor) { el.refEstado.textContent = 'Escolha uma carinha, escreva uma linha ou toque em "Respondi no papel".'; el.reflexao.focus(); return; }
    mudar(function (d) { d.reflexao = txt; });
    falar(txt ? 'Guardei no seu histórico. Descansa bem, até amanhã!' : 'Guardado. Descansa bem, até amanhã!', 'comemorando', true);
  });
  document.querySelectorAll('[data-humor]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = +b.dataset.humor, antes = dia().humor;
      mudar(function (d) { d.humor = antes === n ? 0 : n; });
      if (antes === n) return;
      falar(n <= 2 ? 'Obrigada por contar. Dia pesado passa. Se quiser, escreva o que pesou: ajuda a soltar.' : n === 3 ? 'Dia normal também conta. Quer anotar algo que valeu?' : 'Que bom! Anota o que deu certo, para repetir amanhã.', n <= 2 ? 'ola' : 'comemorando', !antes);
    });
  });
  $('b-historico').addEventListener('click', function () {
    var h = $('historico'), abre = h.hidden;
    h.hidden = !abre; this.setAttribute('aria-expanded', String(abre));
    if (abre) { renderHistorico(); h.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  $('b-amanha').addEventListener('click', function () {
    var f = $('fim-amanha'), abre = f.hidden;
    f.hidden = !abre; this.setAttribute('aria-expanded', String(abre));
    if (abre) $('fim-amanha-txt').focus();
  });
  $('fim-amanha').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('fim-amanha-txt').value.trim(); if (!txt) return;
    addTarefa(txt, $('fim-amanha-prio').checked, false, amanhaChave());
    $('fim-amanha-txt').value = ''; $('fim-amanha-prio').checked = false; $('fim-amanha-txt').focus();
    falar('Anotado para amanhã. Agora pode descansar.', 'ideia');
  });
  $('b-papel').addEventListener('click', function () { mudar(function (d) { d.papel = true; }); falar('Papel e caneta, longe da tela. Ótima escolha. +10', 'comemorando', true); });

  // novo lembrete
  var tipos = document.querySelectorAll('[name="novo-tipo"]');
  tipos.forEach(function (r) {
    r.addEventListener('change', function () {
      var hora = document.querySelector('[name="novo-tipo"]:checked').value === 'hora';
      document.querySelectorAll('.novo-hora').forEach(function (x) { x.hidden = !hora; }); document.querySelector('.novo-intervalo').hidden = hora;
    });
  });
  $('novo').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('novo-nome').value.trim(); if (!nome) return;
    var tipo = document.querySelector('[name="novo-tipo"]:checked').value;
    var sem = diasEscolhidos();
    if (tipo === 'hora' && !sem.length) { falar('Escolha pelo menos um dia da semana para o lembrete.', 'ideia'); return; }
    var m = { id: 'm' + Date.now().toString(36), nome: nome, tipo: tipo, hora: $('novo-hora').value || '08:00', min: Math.max(15, +$('novo-min').value || 120), on: true };
    if (tipo === 'hora' && sem.length < 7) m.semana = sem;
    // um horário que já passou hoje só toca amanhã
    if (tipo === 'hora' && minutosDoDia(m.hora) <= new Date().getHours() * 60 + new Date().getMinutes()) S.tocados[m.id] = chaveDia();
    S.meus.push(m); salvar(); renderMeus();
    $('novo-nome').value = ''; marcarDias(null);
    var semNotif = 'Notification' in window && Notification.permission === 'default';
    falar('Anotado. Eu lembro você de: ' + nome + '.' + (semNotif ? ' Ative as notificações para eu avisar com o app em segundo plano.' : ''), 'ideia', true);
  });

  // Dias da semana do lembrete no horário: "Todos os dias" liga e desliga todos de uma vez.
  var botoesDia = document.querySelectorAll('.dias-semana [data-dia]'), botaoTodos = document.querySelector('.dias-semana [data-todos]');
  function diasEscolhidos() { return Array.prototype.filter.call(botoesDia, function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return +b.dataset.dia; }).sort(); }
  function marcarDias(lista) {
    botoesDia.forEach(function (b) { b.setAttribute('aria-pressed', String(!lista || lista.indexOf(+b.dataset.dia) >= 0)); });
    botaoTodos.setAttribute('aria-pressed', String(diasEscolhidos().length === 7));
  }
  botoesDia.forEach(function (b) {
    b.addEventListener('click', function () {
      var todos = diasEscolhidos().length === 7;
      // com todos marcados, o primeiro toque escolhe só aquele dia
      if (todos) marcarDias([+b.dataset.dia]);
      else { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); marcarDias(diasEscolhidos()); }
    });
  });
  botaoTodos.addEventListener('click', function () { marcarDias(diasEscolhidos().length === 7 ? [] : null); });
  function textoDias(sem) {
    if (!sem || sem.length === 7) return 'todo dia';
    var k = sem.slice().sort().join(',');
    if (k === '1,2,3,4,5') return 'de segunda a sexta';
    if (k === '0,6') return 'no fim de semana';
    var nomes = [1, 2, 3, 4, 5, 6, 0].filter(function (d) { return sem.indexOf(d) >= 0; }).map(function (d) { return DSEM[d]; });
    return nomes.length === 1 ? 'toda ' + nomes[0] : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
  }

  $('b-notif').addEventListener('click', function () {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function () { estadoNotif(); if (Notification.permission === 'granted') falar('Notificações ligadas. Agora eu aviso com o app em segundo plano.', 'comemorando', true); });
  });
  $('b-apagar').addEventListener('click', function () {
    if (!confirm('Apagar pontos, títulos, reflexões e lembretes deste aparelho? Não tem como desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { }
    S = padrao(); location.reload();
  });


  // ---------- Nuvem (opcional) ----------
  var CHAVE_NUVEM = 'rizzygo-nuvem-rotina-v1';
  var LOCAIS = ['timer', 'proximos', 'adiados', 'tocados', 'semTelaAtivo']; // ficam só no aparelho
  var metaNuvem = (function () { try { return JSON.parse(localStorage.getItem(CHAVE_NUVEM)) || {}; } catch (e) { return {}; } })();
  if (!metaNuvem.aceites) metaNuvem.aceites = { saude: false, reflexoes: false };
  var carregandoNuvem = null;
  function salvarMeta() { try { localStorage.setItem(CHAVE_NUVEM, JSON.stringify(metaNuvem)); } catch (e) { } }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function paraNuvem(est, aceites) {
    var c = copia(est);
    LOCAIS.forEach(function (k) { delete c[k]; });
    if (!aceites.saude) c.meus = [];
    if (!aceites.reflexoes) {
      Object.keys(c.dias || {}).forEach(function (k) { var d = c.dias[k]; if (d.reflexao || d.humor) { d.reflexao = ''; d.humor = 0; d.refOculta = true; } });
      c.diario = {};
    }
    return c;
  }
  function daNuvem(rem, loc, aceites) {
    var r = copia(rem);
    LOCAIS.forEach(function (k) { r[k] = loc[k]; });
    if (!aceites.saude) r.meus = loc.meus;
    Object.keys(r.dias || {}).forEach(function (k) {
      var l = loc.dias && loc.dias[k];
      if (l && l.reflexao && !r.dias[k].reflexao) r.dias[k].reflexao = l.reflexao;
      if (l && l.humor && !r.dias[k].humor) r.dias[k].humor = l.humor;
    });
    r.diario = Object.assign({}, loc.diario || {}, r.diario || {});
    return r;
  }
  function temDados(est) {
    return est.tarefas.length > 0 || est.metas.length > 0 || est.meus.length > 0 ||
      Object.keys(est.dias).some(function (k) { return ativo(est.dias[k]); });
  }
  function aplicarNuvem(est, avisar) {
    try { localStorage.setItem(CHAVE, JSON.stringify(est)); } catch (e) { }
    S = carregar(); podar(); dia();
    renderMeus(); render(); renderTimer(); preencherAjustes();
    if (avisar) falar('Trouxe sua rotina da nuvem.', 'comemorando', true);
  }
  function perguntarNuvem(quando) {
    return new Promise(function (ok) {
      var box = $('nuvem-pergunta');
      var data = quando ? new Date(quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
      $('nuvem-pergunta-txt').textContent = 'Sua conta já tem uma rotina salva na nuvem' + (data ? ', de ' + data : '') + '. Este aparelho também tem uma. Qual delas você quer manter? A outra será substituída.';
      box.hidden = false; $('nuvem-usar-nuvem').focus();
      function fim(v) { box.hidden = true; ok(v); }
      $('nuvem-usar-nuvem').onclick = function () { fim('nuvem'); };
      $('nuvem-usar-aparelho').onclick = function () { fim('aparelho'); };
    });
  }
  function mostrarNuvem(st) {
    var dentro = !!(st && st.usuario && metaNuvem.ligado);
    $('nuvem-fora').hidden = dentro; $('nuvem-entrar-box').hidden = dentro;
    $('nuvem-dentro').hidden = !dentro; $('nuvem-acoes').hidden = !dentro; $('nuvem-apagar-box').hidden = !dentro;
    $('nuvem-saude').checked = !!metaNuvem.aceites.saude; $('nuvem-reflexoes').checked = !!metaNuvem.aceites.reflexoes;
    if (dentro) {
      $('nuvem-quem').textContent = 'Salvando na nuvem com a conta ' + (st.usuario.email || st.usuario.nome || 'Google') + '.';
      $('nuvem-quando').textContent = metaNuvem.sincronizadoEm ? 'Última cópia: ' + new Date(metaNuvem.sincronizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '.' : 'Enviando a primeira cópia.';
    }
    $('nuvem-estado').textContent = (st && st.falha) || metaNuvem.erro || '';
  }
  function abrirNuvem() {
    if (nuvem) return Promise.resolve(nuvem);
    if (!carregandoNuvem) carregandoNuvem = import('/nuvem.js').then(function (m) {
      nuvem = m.criar({
        app: 'rotina', meta: metaNuvem, salvarMeta: salvarMeta,
        ler: function () { return S; }, temDados: temDados, aplicar: aplicarNuvem,
        paraNuvem: paraNuvem, daNuvem: daNuvem, perguntar: perguntarNuvem, aoMudar: mostrarNuvem
      });
      return nuvem;
    }).catch(function () {
      carregandoNuvem = null;
      $('nuvem-estado').textContent = 'Não deu para carregar a nuvem agora. Confira a internet e tente de novo.';
      return null;
    });
    return carregandoNuvem;
  }
  function aceitesTela() { return { saude: $('nuvem-saude').checked, reflexoes: $('nuvem-reflexoes').checked }; }
  // Entrar abre a mesma janela do topo (/conta.js): aceite, Google ou e-mail e senha. As caixas daqui valem para a Rotina.
  $('nuvem-entrar').addEventListener('click', function () {
    metaNuvem.aceites = aceitesTela(); salvarMeta();
    if (window.AkoConta) window.AkoConta.abrir();
    else $('nuvem-estado').textContent = 'Recarregue a página e tente de novo.';
  });
  ['nuvem-saude', 'nuvem-reflexoes'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      if (nuvem && metaNuvem.ligado) nuvem.mudarAceites(aceitesTela());
      else { metaNuvem.aceites = aceitesTela(); salvarMeta(); }
    });
  });
  function baixar() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
    a.download = 'rotina-rizzygo-' + chaveDia() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  }
  $('nuvem-baixar').addEventListener('click', baixar);
  $('nuvem-baixar2').addEventListener('click', baixar);
  $('nuvem-sair').addEventListener('click', function () {
    if (nuvem) nuvem.sair().then(function () { falar('Saiu da conta. A rotina segue neste aparelho.', 'ola', true); });
  });
  $('nuvem-apagar').addEventListener('click', function () {
    if (!nuvem || !confirm('Apagar sua conta e todos os dados do Ako na nuvem? A rotina deste aparelho continua aqui. Não tem como desfazer.')) return;
    nuvem.apagarConta(window.AkoConta && window.AkoConta.pedirSenha).then(function (ok) { if (ok) falar('Conta e dados da nuvem apagados. A rotina segue neste aparelho.', 'ola', true); })
      .catch(function (e) { $('nuvem-estado').textContent = e && /Senha/.test(e.message || '') ? e.message : 'Não deu para apagar agora. Tente de novo em instantes.'; });
  });
  mostrarNuvem(null);
  function contaLigada() { try { var c = JSON.parse(localStorage.getItem('rizzygo-conta-v1') || 'null'); return !!(c && c.ligado); } catch (e) { return false; } }
  if (metaNuvem.ligado || contaLigada()) abrirNuvem();
  // Entrou pelo botão do topo (/conta.js): a Rotina liga junto, com os mesmos cuidados de saúde e reflexões.
  window.addEventListener('rizzygo-conta', function (ev) {
    if (!ev.detail || !ev.detail.usuario) return;
    abrirNuvem().then(function () { falar('Pronto. Sua rotina agora tem uma cópia na sua conta.', 'comemorando', true); }, function () { });
  });

  // Passo a passo do atalho: mostra o do sistema da pessoa e deixa trocar.
  (function () {
    var bA = $('so-android'), bI = $('so-iphone');
    if (!bA || !bI) return;
    function mostrar(ios) {
      bA.setAttribute('aria-pressed', String(!ios)); bI.setAttribute('aria-pressed', String(ios));
      $('passos-android').hidden = ios; $('passos-iphone').hidden = !ios;
    }
    var ua = navigator.userAgent || '';
    mostrar(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1));
    bA.addEventListener('click', function () { mostrar(false); });
    bI.addEventListener('click', function () { mostrar(true); });
  })();

  // instalar (Android e computador)
  var pedidoInstalar = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); pedidoInstalar = e;
    if ($('b-instalar')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'b-instalar'; b.textContent = 'Criar atalho na tela inicial';
    b.addEventListener('click', function () { pedidoInstalar.prompt(); pedidoInstalar.userChoice.finally(function () { b.remove(); }); });
    var w = document.createElement('div'); w.className = 'acoes'; w.appendChild(b);
    document.querySelector('.instalar h2').after(w);
  });

  // ---------- Como foi o dia: histórico pessoal ----------
  var HUMORES = [null, ['😣', 'Difícil'], ['😕', 'Pesado'], ['😐', 'Normal'], ['🙂', 'Bom'], ['😄', 'Ótimo']];
  var DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function dataCurta(k) { var d = new Date(k + 'T12:00'); return DSEM[d.getDay()] + ', ' + k.slice(8, 10) + '/' + k.slice(5, 7) + (k.slice(0, 4) !== String(new Date().getFullYear()) ? '/' + k.slice(0, 4) : ''); }
  function renderHistorico() {
    var itens = {};
    Object.keys(S.diario || {}).forEach(function (k) { itens[k] = S.diario[k]; });
    Object.keys(S.dias).forEach(function (k) { var d = S.dias[k]; if (d.humor || d.reflexao || d.papel || d.refOculta) itens[k] = { humor: d.humor || 0, texto: d.reflexao || '', papel: !!d.papel, oculta: !!d.refOculta && !d.reflexao }; });
    var ks = Object.keys(itens).sort().reverse(), ul = $('historico-lista'); ul.innerHTML = '';
    ks.forEach(function (k) {
      var it = itens[k], li = document.createElement('li');
      var cab = document.createElement('div'); cab.className = 'hist-cab';
      var em = document.createElement('span'); em.className = 'hist-humor'; em.textContent = it.humor ? HUMORES[it.humor][0] : '·';
      if (it.humor) em.title = HUMORES[it.humor][1];
      var dt = document.createElement('strong'); dt.textContent = k === chaveDia() ? 'Hoje' : dataCurta(k);
      cab.appendChild(em); cab.appendChild(dt);
      if (it.humor) { var hs = document.createElement('small'); hs.textContent = HUMORES[it.humor][1]; cab.appendChild(hs); }
      li.appendChild(cab);
      var p = document.createElement('p');
      p.textContent = it.texto || (it.oculta ? 'Escrito em outro aparelho.' : it.papel ? 'Respondido no papel.' : 'Sem texto.');
      if (!it.texto) p.className = 'nota';
      li.appendChild(p); ul.appendChild(li);
    });
    var ult = ks.slice(0, 7).filter(function (k) { return itens[k].humor; });
    var media = ult.length ? ult.reduce(function (a, k) { return a + itens[k].humor; }, 0) / ult.length : 0;
    $('historico-resumo').textContent = !ks.length ? 'Ainda vazio. O que você marcar no fim do dia aparece aqui, só neste aparelho (ou na sua conta, se você permitir as reflexões).'
      : ks.length + (ks.length === 1 ? ' dia registrado.' : ' dias registrados.') + (media ? ' Nos últimos registros, a média foi ' + HUMORES[Math.round(media)][0] + ' ' + HUMORES[Math.round(media)][1].toLowerCase() + '.' : '');
  }
  function renderAmanhaFim() {
    var am = amanhaChave(), ul = $('fim-amanha-lista'); ul.innerHTML = '';
    S.tarefas.filter(function (t) { return !t.rotina && t.dia === am; }).forEach(function (t) { ul.appendChild(linhaTarefa(t, { amanha: true })); });
    var n = ul.children.length;
    $('b-amanha').textContent = n ? '📝 Amanhã: ' + n + (n === 1 ? ' tarefa' : ' tarefas') + '. Mais alguma?' : '📝 Tem algo para amanhã?';
  }

  // ---------- Tarefas e rotinas ----------
  function amanhaChave() { var d = new Date(); d.setDate(d.getDate() + 1); return chaveDia(d); }
  function novoId(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function feitaHoje(t) { return t.rotina ? !!dia().feitas[t.id] : t.feita === chaveDia(); }
  function visiveisHoje() {
    var hoje = chaveDia();
    return S.tarefas.filter(function (t) { return t.rotina || (!!t.dia && t.dia <= hoje && (!t.feita || t.feita === hoje)); })
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
      var lista = visiveisHoje(), tudo = lista.length > 0 && lista.every(feitaHoje);
      if (tudo) { falar('Tudo feito por hoje! Meta do dia batida. +' + pts, 'comemorando', true); vitoriaDoDia('tarefas'); }
      else falar(t.prio ? (faltam ? 'Prioridade feita. Faltam ' + faltam + '. +5' : 'Todas as prioridades de hoje feitas! +5') : 'Feito: ' + t.texto + '. +3', faltam || !t.prio ? 'ola' : 'comemorando', !faltam && t.prio);
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
    if (!opcoes.curta) li.appendChild(x);
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
    // antes das 18h a revisão só conta como vai o dia; a pergunta do que fica vem no fim do dia
    var pendentes = lista.filter(function (t) { return !t.rotina && !feitaHoje(t); }), fimDoDia = new Date().getHours() >= 18;
    $('revisao-resumo').textContent = !lista.length ? 'Sem tarefas hoje. Quer deixar algo pronto para outro dia? Use a Agenda ou a lista Sem data.'
      : 'Você concluiu ' + feitas.length + ' de ' + lista.length + (lista.length === 1 ? ' item' : ' itens') + ' hoje.' +
        (feitas.length === lista.length ? ' Dia fechado.' : !pendentes.length ? '' : fimDoDia || revisaoAberta ? ' O que ficou vai para amanhã, fica sem data ou sai da lista?' : ' No fim do dia eu pergunto o que fica para depois.');
    var pend = $('pendentes'); pend.innerHTML = '';
    $('revisao-agora').hidden = fimDoDia || revisaoAberta || !pendentes.length;
    if (fimDoDia || revisaoAberta) pendentes.forEach(function (t) {
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = (t.prio ? '★ ' : '') + t.texto;
      var a = document.createElement('button'); a.type = 'button'; a.className = 'btn btn-sec'; a.textContent = 'Amanhã';
      a.addEventListener('click', function () { t.dia = am; salvar(); render(); falar('Combinado: "' + t.texto + '" fica para amanhã.', 'ideia'); });
      var sd = document.createElement('button'); sd.type = 'button'; sd.className = 'btn btn-sec'; sd.textContent = 'Sem data';
      sd.addEventListener('click', function () { t.dia = null; t.criada = hoje; salvar(); render(); falar('"' + t.texto + '" foi para a lista Sem data. Fica guardada, sem cobrança.', 'ideia'); });
      var r = document.createElement('button'); r.type = 'button'; r.className = 'btn btn-perigo'; r.textContent = 'Tirar';
      r.addEventListener('click', function () { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); salvar(); render(); });
      li.appendChild(sp); li.appendChild(a); li.appendChild(sd); li.appendChild(r); pend.appendChild(li);
    });
    renderAgenda();
    renderSemData();
  }
  var revisaoAberta = false;
  $('revisao-agora').addEventListener('click', function () { revisaoAberta = true; renderTarefas(); });

  // Agenda: calendário do mês; o dia escolhido recebe as tarefas novas.
  var calDia = null, calMes = null;
  function chaveMes(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function renderAgenda() {
    var hoje = chaveDia(), am = amanhaChave();
    if (!calDia || calDia < hoje) calDia = am;
    if (!calMes) calMes = chaveMes(new Date(calDia + 'T12:00'));
    var nomeMes = calMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('cal-mes').textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    $('cal-ant').disabled = calMes <= chaveMes(new Date());
    var conta = {};
    S.tarefas.forEach(function (t) { if (!t.rotina && !t.feita && t.dia && t.dia >= hoje) conta[t.dia] = (conta[t.dia] || 0) + 1; });
    var box = $('cal-dias'); box.innerHTML = '';
    for (var i = 0; i < calMes.getDay(); i++) box.appendChild(document.createElement('span'));
    var ultimo = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 0).getDate();
    for (var n = 1; n <= ultimo; n++) {
      var k = chaveDia(new Date(calMes.getFullYear(), calMes.getMonth(), n));
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cal-d'; b.dataset.dia = k;
      b.textContent = n;
      if (k < hoje) b.disabled = true;
      if (k === hoje) b.classList.add('hoje');
      if (conta[k]) { b.classList.add('tem'); b.setAttribute('aria-label', dataCurta(k) + ', ' + conta[k] + (conta[k] === 1 ? ' tarefa' : ' tarefas')); }
      else b.setAttribute('aria-label', dataCurta(k));
      b.setAttribute('aria-pressed', String(k === calDia));
      box.appendChild(b);
    }
    $('cal-titulo').textContent = calDia === hoje ? 'Hoje' : calDia === am ? 'Amanhã, ' + dataCurta(calDia) : dataCurta(calDia).replace(/^./, function (c) { return c.toUpperCase(); });
    var ul = $('cal-lista'); ul.innerHTML = '';
    var doDia = calDia === hoje ? visiveisHoje().filter(function (t) { return !t.rotina; }) : S.tarefas.filter(function (t) { return !t.rotina && t.dia === calDia; });
    doDia.forEach(function (t) { ul.appendChild(linhaTarefa(t, calDia === hoje ? {} : { amanha: true })); });
    $('cal-vazio').hidden = doDia.length > 0;
    $('cal-add').textContent = calDia === hoje ? 'Adicionar hoje' : 'Adicionar em ' + dataCurta(calDia).split(',')[1].trim();
  }
  $('cal-dias').addEventListener('click', function (e) {
    var b = e.target.closest('.cal-d'); if (!b || b.disabled) return;
    calDia = b.dataset.dia; renderAgenda();
  });
  $('cal-ant').addEventListener('click', function () { calMes = new Date(calMes.getFullYear(), calMes.getMonth() - 1, 1); renderAgenda(); });
  $('cal-prox').addEventListener('click', function () { calMes = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 1); renderAgenda(); });
  $('cal-nova').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('cal-txt').value.trim(); if (!txt) return;
    var quando = calDia;
    addTarefa(txt, $('cal-prio').checked, false, quando);
    $('cal-txt').value = ''; $('cal-prio').checked = false;
    falar(quando === chaveDia() ? 'Anotado na lista de hoje.' : 'Anotado para ' + dataCurta(quando) + '. Nesse dia ela aparece na sua lista.', 'ideia');
  });
  function addTarefa(texto, prio, rotina, quando, grupo) {
    var t = { id: novoId('t'), texto: texto, prio: prio, rotina: rotina, dia: quando, feita: null };
    if (!quando) { t.grupo = grupo || null; t.criada = chaveDia(); }
    S.tarefas.push(t);
    salvar(); render();
  }
  $('nova-tarefa').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('tarefa-txt').value.trim(); if (!txt) return;
    addTarefa(txt, $('tarefa-prio').checked, $('tarefa-rotina').checked, chaveDia());
    falar($('tarefa-rotina').checked ? 'Rotina criada. Ela volta todo dia.' : ($('tarefa-prio').checked ? 'Prioridade anotada. Começa por ela?' : 'Anotado na lista de hoje.'), 'ideia');
    $('tarefa-txt').value = ''; $('tarefa-prio').checked = false; $('tarefa-rotina').checked = false;
  });

  // ---------- Sem data ----------
  // Tarefa sem dia: fica guardada até a pessoa puxar para hoje, escolher um dia ou concluir. Pode estar num grupo.
  var EMOJIS = ['✈️', '🛒', '📦', '🏠', '🎁', '📚', '💊', '🐶', '🚗', '🔧', '💡', '🎬', '🎵', '🍳', '👕', '💰', '🧾', '📞', '💻', '🌱', '🏋️', '🎮', '🧹', '🎂', '❤️', '⭐', '📌', '🧳', '🛍️', '✏️'];
  var filtroGrupo = 'todos', grupoEditando = null, emojiEscolhido = EMOJIS[0];
  function semData() {
    var hoje = chaveDia();
    return S.tarefas.filter(function (t) { return !t.rotina && !t.dia && (!t.feita || t.feita === hoje); });
  }
  function grupoDe(id) { return S.grupos.filter(function (g) { return g.id === id; })[0] || null; }
  function nomeGrupo(g) { return g.emoji + ' ' + g.nome; }
  function dias(desde) { return Math.round((new Date(chaveDia() + 'T12:00') - new Date(desde + 'T12:00')) / 86400000); }
  function ordemSemData(a, b) { return (feitaHoje(a) - feitaHoje(b)) || (b.prio - a.prio); }

  // Linha compacta: concluir, texto, Hoje, estrela e "Mais" (escolher dia, mudar de grupo, remover).
  // Assim a lista fica leve no celular e as ações menos usadas não ocupam espaço.
  var semDataAberta = null;
  function linhaSemData(t) {
    var li = linhaTarefa(t, {}), hoje = chaveDia();
    li.classList.add('semdata');
    var tirar = li.querySelector('.tirar-bt'); if (tirar) tirar.remove();
    if (t.criada && dias(t.criada) > 30 && !t.feita) {
      var v = document.createElement('small'); v.className = 'faz-tempo'; v.textContent = 'Faz tempo';
      v.title = 'Guardada há ' + dias(t.criada) + ' dias. Ainda quer?';
      li.querySelector('.tarefa-txt').appendChild(v);
    }
    if (t.feita) return li;
    var pr = li.querySelector('.prio-bt');
    var h = document.createElement('button'); h.type = 'button'; h.className = 'btn btn-sec btn-mini hoje-bt'; h.textContent = 'Hoje';
    h.setAttribute('aria-label', 'Fazer hoje: ' + t.texto); h.title = 'Levar para a lista de hoje';
    h.addEventListener('click', function () { t.dia = hoje; salvar(); render(); falar('"' + t.texto + '" entrou na lista de hoje.', 'ideia'); });
    li.insertBefore(h, pr);
    var aberta = semDataAberta === t.id;
    var mais = document.createElement('button'); mais.type = 'button'; mais.className = 'mais-bt'; mais.textContent = '⋯';
    mais.setAttribute('aria-expanded', String(aberta)); mais.setAttribute('aria-label', 'Mais opções: ' + t.texto);
    mais.addEventListener('click', function () { semDataAberta = aberta ? null : t.id; renderSemData(); });
    li.appendChild(mais);
    var ac = document.createElement('div'); ac.className = 'semdata-acoes'; ac.hidden = !aberta;
    var lb = document.createElement('label'); lb.className = 'btn btn-sec btn-mini escolher-dia';
    var sp = document.createElement('span'); sp.textContent = '📅 Escolher dia'; lb.appendChild(sp);
    var inp = document.createElement('input'); inp.type = 'date'; inp.min = amanhaChave();
    inp.setAttribute('aria-label', 'Escolher dia para: ' + t.texto);
    inp.addEventListener('change', function () {
      if (!inp.value) return;
      t.dia = inp.value; semDataAberta = null; salvar(); render();
      falar('"' + t.texto + '" vai aparecer na sua lista em ' + dataCurta(inp.value) + '.', 'ideia');
    });
    lb.appendChild(inp); ac.appendChild(lb);
    var sel = document.createElement('select'); sel.className = 'grupo-sel';
    sel.setAttribute('aria-label', 'Grupo de: ' + t.texto);
    opcoesGrupo(sel, t.grupo || '');
    sel.addEventListener('change', function () { t.grupo = sel.value || null; salvar(); render(); });
    ac.appendChild(sel);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-perigo btn-mini'; x.textContent = 'Remover';
    x.setAttribute('aria-label', 'Remover: ' + t.texto);
    x.addEventListener('click', function () { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); semDataAberta = null; salvar(); render(); });
    ac.appendChild(x);
    li.appendChild(ac);
    return li;
  }
  function opcoesGrupo(sel, atual) {
    sel.innerHTML = '';
    var o = document.createElement('option'); o.value = ''; o.textContent = 'Sem grupo'; sel.appendChild(o);
    S.grupos.forEach(function (g) { var x = document.createElement('option'); x.value = g.id; x.textContent = nomeGrupo(g); sel.appendChild(x); });
    sel.value = grupoDe(atual) ? atual : '';
  }

  function renderSemData() {
    var todas = semData(), abertas = todas.filter(function (t) { return !t.feita; });
    var noGrupo = function (id) { return todas.filter(function (t) { return (grupoDe(t.grupo) ? t.grupo : '') === id; }); };
    if (filtroGrupo !== 'todos' && filtroGrupo !== '' && !grupoDe(filtroGrupo)) filtroGrupo = 'todos';

    // filtro por grupo
    var fx = $('grupos-filtro'); fx.innerHTML = '';
    var chips = [['todos', 'Todos', abertas.length]];
    S.grupos.forEach(function (g) { chips.push([g.id, nomeGrupo(g), noGrupo(g.id).filter(function (t) { return !t.feita; }).length]); });
    var soltas = noGrupo('').filter(function (t) { return !t.feita; }).length;
    if (soltas || filtroGrupo === '') chips.push(['', 'Sem grupo', soltas]);
    chips.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip-grupo';
      b.setAttribute('aria-pressed', String(filtroGrupo === c[0]));
      b.textContent = c[1] + (c[2] ? ' · ' + c[2] : '');
      b.addEventListener('click', function () {
        filtroGrupo = c[0];
        if (c[0] !== 'todos') $('semdata-grupo').value = c[0];
        renderSemData();
      });
      fx.appendChild(b);
    });

    // lista, separada por grupo
    var box = $('semdata-lista'); box.innerHTML = '';
    var blocos = filtroGrupo === 'todos' ? S.grupos.map(function (g) { return g.id; }).concat(['']) : [filtroGrupo];
    var mostrou = 0;
    blocos.forEach(function (id) {
      var itens = noGrupo(id).sort(ordemSemData);
      if (!itens.length) return;
      mostrou += itens.length;
      var sec = document.createElement('div'); sec.className = 'grupo-bloco';
      if (filtroGrupo === 'todos') {
        var h = document.createElement('h3'); h.textContent = id ? nomeGrupo(grupoDe(id)) : 'Sem grupo';
        sec.appendChild(h);
      }
      var ul = document.createElement('ul'); ul.className = 'tarefas';
      itens.forEach(function (t) { ul.appendChild(linhaSemData(t)); });
      sec.appendChild(ul); box.appendChild(sec);
    });
    var vazio = $('semdata-vazio'); vazio.hidden = mostrou > 0;
    if (!mostrou) vazio.textContent = filtroGrupo === 'todos'
      ? 'Nada guardado aqui. Anote o que você não quer esquecer, como a lista do mercado ou o que levar na viagem.'
      : 'Nada em ' + (filtroGrupo ? nomeGrupo(grupoDe(filtroGrupo)) : 'Sem grupo') + ' ainda.';

    var n = $('parte-semdata-n'); n.hidden = !abertas.length; n.textContent = abertas.length;
    var sel = $('semdata-grupo'), atual = sel.value;
    opcoesGrupo(sel, atual);
    renderGrupos();
  }

  $('semdata-nova').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('semdata-txt').value.trim(); if (!txt) return;
    var g = grupoDe($('semdata-grupo').value);
    addTarefa(txt, $('semdata-prio').checked, false, null, g ? g.id : null);
    $('semdata-txt').value = ''; $('semdata-prio').checked = false; $('semdata-txt').focus();
    falar(g ? 'Guardado em ' + nomeGrupo(g) + '. Sem prazo e sem cobrança.' : 'Guardado sem data. Quando der, puxe para hoje.', 'ideia');
  });

  // Grupos: criar, editar e apagar. Apagar um grupo não apaga as tarefas: elas ficam em Sem grupo.
  function renderGrupos() {
    var ul = $('grupos-lista'); ul.innerHTML = '';
    S.grupos.forEach(function (g) {
      var n = S.tarefas.filter(function (t) { return !t.dia && !t.feita && t.grupo === g.id; }).length;
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = nomeGrupo(g) + (n ? ' · ' + n : ''); li.appendChild(sp);
      var ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn btn-sec btn-mini'; ed.textContent = 'Editar';
      ed.setAttribute('aria-label', 'Editar o grupo ' + g.nome);
      ed.addEventListener('click', function () { editarGrupo(g); });
      var ap = document.createElement('button'); ap.type = 'button'; ap.className = 'btn btn-perigo btn-mini'; ap.textContent = 'Apagar';
      ap.setAttribute('aria-label', 'Apagar o grupo ' + g.nome);
      ap.addEventListener('click', function () {
        S.grupos = S.grupos.filter(function (x) { return x.id !== g.id; });
        S.tarefas.forEach(function (t) { if (t.grupo === g.id) t.grupo = null; });
        if (grupoEditando === g.id) limparGrupoForm();
        salvar(); render();
        falar('Grupo ' + g.nome + ' apagado.' + (n ? ' As tarefas dele continuam na lista, em Sem grupo.' : ''), 'ideia');
      });
      li.appendChild(ed); li.appendChild(ap); ul.appendChild(li);
    });
  }
  function renderEmojis() {
    var box = $('grupo-emojis'); box.innerHTML = '';
    EMOJIS.forEach(function (em) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'emoji-bt'; b.textContent = em;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(em === emojiEscolhido && !$('grupo-emoji-outro').value.trim()));
      b.setAttribute('aria-label', em);
      b.addEventListener('click', function () { emojiEscolhido = em; $('grupo-emoji-outro').value = ''; renderEmojis(); });
      box.appendChild(b);
    });
  }
  function editarGrupo(g) {
    grupoEditando = g.id;
    $('grupo-form-titulo').textContent = 'Editar ' + g.nome;
    $('grupo-nome').value = g.nome;
    if (EMOJIS.indexOf(g.emoji) >= 0) { emojiEscolhido = g.emoji; $('grupo-emoji-outro').value = ''; } else $('grupo-emoji-outro').value = g.emoji;
    $('grupo-salvar').textContent = 'Salvar grupo'; $('grupo-cancelar').hidden = false;
    renderEmojis(); $('grupo-nome').focus();
  }
  function limparGrupoForm() {
    grupoEditando = null; emojiEscolhido = EMOJIS[0];
    $('grupo-form-titulo').textContent = 'Novo grupo';
    $('grupo-nome').value = ''; $('grupo-emoji-outro').value = '';
    $('grupo-salvar').textContent = 'Criar grupo'; $('grupo-cancelar').hidden = true;
    renderEmojis();
  }
  $('grupo-emoji-outro').addEventListener('input', renderEmojis);
  $('grupo-cancelar').addEventListener('click', limparGrupoForm);
  $('grupo-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('grupo-nome').value.trim(); if (!nome) return;
    var emoji = $('grupo-emoji-outro').value.trim() || emojiEscolhido;
    var g = grupoDe(grupoEditando);
    if (g) { g.nome = nome; g.emoji = emoji; }
    else { g = { id: novoId('g'), nome: nome, emoji: emoji }; S.grupos.push(g); filtroGrupo = g.id; $('semdata-grupo').value = g.id; }
    var novo = !grupoEditando;
    limparGrupoForm(); salvar(); render();
    if (novo) $('semdata-grupo').value = g.id;
    falar(novo ? 'Grupo ' + nomeGrupo(g) + ' criado. Agora é só guardar as coisas nele.' : 'Grupo ' + nomeGrupo(g) + ' atualizado.', 'ideia');
  });
  renderEmojis();

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
    if (status === 'concluida') vitoria(true);
  }
  var abertas = {};
  // Ano das metas: do atual até 2033 (sempre pelo menos 5 anos à frente), para planejar os próximos anos.
  var ULTIMO_ANO = 2033, anoMetas = new Date().getFullYear();
  function anosMetas() {
    var atual = new Date().getFullYear(), fim = Math.max(ULTIMO_ANO, atual + 5), out = [];
    S.metas.forEach(function (m) { if (m.ano < atual && out.indexOf(m.ano) === -1 && !m.checkins.fim) out.push(m.ano); });
    for (var a = atual; a <= fim; a++) out.push(a);
    return out.sort();
  }
  function renderAnos() {
    var box = $('metas-anos'); box.innerHTML = '';
    anosMetas().forEach(function (a) {
      var n = S.metas.filter(function (m) { return m.ano === a; }).length;
      var b = document.createElement('button'); b.type = 'button'; b.textContent = a;
      b.setAttribute('aria-pressed', String(a === anoMetas));
      b.setAttribute('aria-label', a + (n ? ', ' + n + (n === 1 ? ' meta' : ' metas') : ', sem metas'));
      if (n) { var c = document.createElement('small'); c.textContent = n; c.setAttribute('aria-hidden', 'true'); b.appendChild(c); }
      b.addEventListener('click', function () { anoMetas = a; abertas = {}; renderMetas(); });
      box.appendChild(b);
    });
  }
  function renderMetas() {
    var d = new Date(), ano = d.getFullYear(), tAtual = trimestre(d), pend = metasPendentes();
    var futuro = anoMetas > ano;
    $('metas-ano').textContent = anoMetas;
    renderAnos();
    $('metas-nota').textContent = futuro
      ? 'Planeje com calma. As revisões por trimestre começam quando ' + anoMetas + ' chegar.'
      : 'Poucas metas, revisadas a cada trimestre. No fim de cada trimestre a Zumi pergunta como cada uma está.';
    $('meta-txt').placeholder = futuro ? 'Ex.: Virar especialista em plataforma' : 'Ex.: Tirar uma certificação de cloud';
    var aviso = $('metas-aviso');
    aviso.hidden = !pend.length;
    aviso.textContent = pend.length ? 'Hora da revisão: ' + pend.length + (pend.length === 1 ? ' meta espera' : ' metas esperam') + ' a sua resposta.' : '';
    var ul = $('metas'); ul.innerHTML = '';
    S.metas.filter(function (m) { return m.ano === anoMetas || (anoMetas === ano && pend.some(function (p) { return p.meta === m; })); }).forEach(function (m) {
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
      var x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-perigo'; x.textContent = 'Remover';
      x.addEventListener('click', function () { if (confirm('Remover a meta "' + m.texto + '"?')) { S.metas = S.metas.filter(function (y) { return y.id !== m.id; }); salvar(); render(); } });
      acoes.appendChild(x); li.appendChild(acoes);
      ul.appendChild(li);
    });
  }
  $('nova-meta').addEventListener('submit', function (e) {
    e.preventDefault();
    var txt = $('meta-txt').value.trim(); if (!txt) return;
    S.metas.push({ id: novoId('g'), texto: txt, ano: anoMetas, criada: chaveDia(), checkins: {} });
    $('meta-txt').value = ''; salvar(); render();
    var doAno = S.metas.filter(function (m) { return m.ano === anoMetas; }).length;
    falar(doAno > 5 ? 'Meta anotada. Dica: com mais de cinco metas no mesmo ano, o foco se espalha.'
      : anoMetas > new Date().getFullYear() ? 'Meta de ' + anoMetas + ' anotada. Quando o ano chegar, eu pergunto como ela está a cada trimestre.'
      : 'Meta anotada. No fim do trimestre eu pergunto como ela está.', 'ideia', true);
  });

  // ---------- Painel Hoje ----------
  function renderHoje() {
    // até 3 itens: prioridades primeiro, depois o resto, sem os já feitos
    var lista = visiveisHoje().filter(function (t) { return !feitaHoje(t); }), ul = $('h-tarefas'); ul.innerHTML = '';
    lista.slice(0, 3).forEach(function (t) { ul.appendChild(linhaTarefa(t, { curta: true })); });
    var todas = visiveisHoje().length;
    $('h-tarefas-vazio').hidden = lista.length > 0;
    $('h-tarefas-vazio').textContent = todas ? 'Tudo feito por hoje. Boa!' : 'Nada na lista ainda.';
    $('h-tarefas-mais').hidden = !todas; $('h-tarefas-mais').textContent = 'Ver todas (' + todas + ')';
    // com a lista de hoje vazia ou toda feita, a Zumi lembra do que está guardado sem data
    var sd = semData().filter(function (t) { return !t.feita; }).length;
    $('h-semdata').hidden = lista.length > 0 || !sd;
    $('h-semdata-txt').textContent = sd === 1 ? '📌 Tem 1 coisa sem data. Puxa para hoje?' : '📌 Tem ' + sd + ' coisas sem data. Puxa uma para hoje?';
    botoesNivel($('h-agua'), chaveDia());
    var nv = nivelAgua(dia());
    $('h-agua-txt').textContent = nv ? 'Marcado como ' + NIVEIS[nv] + (PONTOS_AGUA[nv] ? '. +' + PONTOS_AGUA[nv] : '.') : 'Bom vale 10 pontos e Excelente vale 20.';
    var pend = metasPendentes();
    $('h-metas').hidden = !pend.length;
    $('h-metas-txt').textContent = pend.length ? 'Fim de trimestre: ' + pend.length + (pend.length === 1 ? ' meta espera' : ' metas esperam') + ' a sua revisão.' : '';
    var d = dia();
    $('h-fechar').hidden = new Date().getHours() < 18 || !!(d.reflexao || d.papel);
  }
  $('h-iniciar').addEventListener('click', function () { el.iniciar.click(); });
  // Botões que levam a outra aba (e, se pedir, já põem o cursor no campo)
  document.querySelectorAll('[data-vai]').forEach(function (b) {
    b.addEventListener('click', function () {
      irPara(b.dataset.vai);
      if (b.dataset.foco) setTimeout(function () { var c = $(b.dataset.foco); if (c) { c.focus(); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 60);
    });
  });

  // ---------- Abas ----------
  var ABAS = ['hoje', 'foco', 'tarefas', 'bem-estar', 'metas', 'evolucao', 'ajustes'];
  var PARTES = ['hoje', 'agenda', 'sem-data'];
  function abaDaUrl() { var h = location.hash.replace(/^#\/?/, '').split('/')[0]; return ABAS.indexOf(h) >= 0 ? h : 'hoje'; }
  // A aba Tarefas mostra uma parte por vez: #/tarefas (hoje), #/tarefas/agenda e #/tarefas/sem-data.
  function parteDaUrl() { var p = location.hash.replace(/^#\/?/, '').split('/')[1]; return PARTES.indexOf(p) >= 0 ? p : 'hoje'; }
  function mostrarParte() {
    var p = parteDaUrl();
    document.querySelectorAll('[data-parte]').forEach(function (s) { s.hidden = s.dataset.parte !== p; });
    document.querySelectorAll('[data-parte-ir]').forEach(function (l) { if (l.dataset.parteIr === p) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
  }
  function mostrarAba(rolar) {
    if (location.hash && location.hash.indexOf('#/') !== 0) return; // âncoras comuns (#conteudo, #fim-do-dia) não trocam de aba
    var a = abaDaUrl();
    document.querySelectorAll('.aba').forEach(function (s) { s.hidden = s.dataset.aba !== a; });
    document.body.dataset.aba = a;
    mostrarParte();
    document.querySelectorAll('[data-ir]').forEach(function (l) { if (l.dataset.ir === a) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
    if (rolar) { var nav = document.querySelector('.abas-app'); if (nav.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 }); }
  }
  function irPara(a) { location.hash = a === 'hoje' ? '#/' : '#/' + a; }
  window.addEventListener('hashchange', function () { mostrarAba(true); });
  mostrarAba(false);

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
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { tick(); render(); if (nuvem) nuvem.puxar(); } else if (nuvem) { salvar(); nuvem.agora(); }
  });

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
