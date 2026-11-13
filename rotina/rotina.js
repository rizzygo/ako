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
        inicio: '08:00', fim: '22:00', som: true, somLembretes: true, somVitoria: true, lembrarMetas: false, avisosDesligados: true,
        lembretes: { agua: { on: false, min: 45 }, respirar: { on: false, min: 90 }, semTela: { on: false, min: 120 } }
      },
      meus: [], tarefas: [], metas: [], diario: {}, grupos: gruposPadrao(),
      timer: { modo: 'estudo', fase: 'foco', ciclo: 1, rodando: false, fimEm: null, restante: null },
      proximos: {}, adiados: {}, tocados: {},
      dias: {}, pontosAntigos: 0,
      zumi: { op: null, mes: null },
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
    // Avisos passaram a vir desligados (12/11/2026): quem já usava também começa com eles desligados, uma vez só.
    // Depois disso, o que a pessoa ligar em Ajustes fica ligado.
    var desligarAvisos = !(s.config && s.config.avisosDesligados);
    // completa campos que versões novas acrescentarem
    s.config = Object.assign({}, p.config, s.config || {});
    s.config.lembretes = Object.assign({}, p.config.lembretes, s.config.lembretes || {});
    s.config.pausas = Object.assign({}, p.config.pausas, s.config.pausas || {});
    if (desligarAvisos) {
      Object.keys(s.config.lembretes).forEach(function (k) { s.config.lembretes[k].on = false; });
      s.config.lembrarMetas = false;
    }
    ['meus', 'tarefas', 'metas', 'diario', 'grupos', 'proximos', 'adiados', 'tocados', 'dias', 'timer', 'zumi'].forEach(function (k) { if (!s[k]) s[k] = p[k]; });
    if (typeof s.pontosAntigos !== 'number') s.pontosAntigos = 0;
    if (!s.criadoEm) s.criadoEm = Object.keys(s.dias).sort()[0] || chaveDia();
    if (typeof s.melhor !== 'number') s.melhor = 0;
    darPosicoes(s.tarefas);
    return s;
  }

  var S = carregar();
  var nuvem = null; // módulo da nuvem, só quando a pessoa liga
  // Duas cópias da Rotina abertas no mesmo aparelho (duas abas, ou a aba e o atalho na tela inicial)
  // gravam no mesmo lugar. "gravado" é o que esta cópia leu ou escreveu por último: se o aparelho tem
  // outro texto, a outra cópia mudou algo, e esta junta as mudanças em vez de apagar as da outra.
  var gravado = null;
  function textoGuardado() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function deOutraAba() { var t = textoGuardado(); return gravado !== null && t !== null && t !== gravado; }
  function juntarOutraAba() {
    var base = null, outra = null;
    try { base = JSON.parse(gravado); outra = JSON.parse(textoGuardado()); } catch (e) { return; }
    if (!outra || outra.v !== 1 || !window.RizzygoMesclar) return;
    var junto = ajustarJunto(window.RizzygoMesclar(base, outra, JSON.parse(JSON.stringify(S))));
    try { localStorage.setItem(CHAVE, JSON.stringify(junto)); } catch (e) { return; }
    S = carregar();
  }
  function salvar() {
    if (deOutraAba()) juntarOutraAba();
    try { gravado = JSON.stringify(S); localStorage.setItem(CHAVE, gravado); } catch (e) { /* modo privado: segue sem salvar */ }
    if (nuvem) nuvem.mudou();
    sincronizarPush();
  }
  // Depois de juntar: dia que ficou com atividade não perde os 10 pontos de dia parado.
  function ajustarJunto(est) {
    Object.keys(est.dias || {}).forEach(function (k) { var d = est.dias[k]; if (d.penalidade && ativo(d)) delete d.penalidade; });
    return est;
  }
  // A outra cópia gravou: relê e redesenha (antes de a pessoa mexer aqui).
  function releSeMudou() {
    if (!deOutraAba()) return false;
    S = carregar(); gravado = textoGuardado();
    dia(); renderMeus(); render(); renderTimer(); preencherAjustes();
    if (nuvem) nuvem.mudou();
    return true;
  }

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
    if (!('Notification' in window) || Notification.permission !== 'granted' || push.notifOff || !document.hidden) return;
    var op = { body: corpo, icon: '/zumi/abelha-icone.png', badge: '/icones/icone-192.png', tag: tag || 'rotina', renotify: true };
    if (registro && registro.showNotification) registro.showNotification(titulo, op).catch(function () {});
    else { try { new Notification(titulo, op); } catch (e) { /* celular exige o service worker */ } }
  }
  // Como liberar de novo quando o navegador bloqueou: o site não consegue pedir outra vez, só a pessoa, no sistema.
  function comoLiberar() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'No iPhone: Ajustes, Notificações, Rotina, e ligue "Permitir Notificações".';
    if (/Android/.test(ua)) return 'No Android: toque no cadeado ao lado do endereço, depois em Permissões ou Configurações do site, Notificações, e escolha Permitir.';
    return 'No computador: clique no cadeado ao lado do endereço, procure Notificações e escolha Permitir.';
  }
  function estadoNotif() {
    var cb = $('notif-on');
    if (!('Notification' in window)) { el.notifEstado.textContent = 'Este navegador não mostra notificações. No iPhone, crie o atalho na tela inicial primeiro (veja Ajustes).'; cb.checked = false; cb.disabled = true; return; }
    cb.disabled = false;
    cb.checked = Notification.permission === 'granted' && !push.notifOff;
    if (Notification.permission === 'denied') el.notifEstado.textContent = 'As notificações estão bloqueadas neste aparelho. O site não consegue pedir de novo: ' + comoLiberar() + ' Depois, volte aqui e ligue a chave.';
    else if (Notification.permission === 'granted') el.notifEstado.textContent = push.notifOff
      ? 'Desligadas na Rotina. Ligue a chave quando quiser receber de novo.'
      : 'Ligadas. A Zumi avisa enquanto o app estiver aberto, mesmo em outra aba ou minimizado.';
    else el.notifEstado.textContent = 'Os avisos aparecem só nesta página até você ligar as notificações.';
  }

  // ---------- Push: avisar com o app fechado ----------
  // O Worker de /push guarda só os horários (sem os nomes) e manda o push na hora. O nome fica neste aparelho,
  // no cache 'zumi-push', que o service worker lê para montar a notificação. Detalhes em /push/README.md.
  var PUSH_API = 'https://rotina-push.rizzygo.com.br';
  var CHAVE_PUSH = 'rizzygo-rotina-push-v1'; // só deste aparelho: não vai para a nuvem
  var push = (function () { try { return JSON.parse(localStorage.getItem(CHAVE_PUSH)) || {}; } catch (e) { return {}; } })();
  var pushChave = null, pushEnviado = '', pushTimer = null;
  function salvarPush() { try { localStorage.setItem(CHAVE_PUSH, JSON.stringify(push)); } catch (e) { /* modo privado */ } }
  function pushPossivel() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function idNovo() { var b = new Uint8Array(16); crypto.getRandomValues(b); return btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function chaveBytes(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return Uint8Array.from(atob(t), function (c) { return c.charCodeAt(0); }); }
  function pedirPush(caminho, corpo) {
    var op = corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) } : {};
    return fetch(PUSH_API + caminho, op).then(function (r) { if (!r.ok) throw new Error('push ' + r.status); return r.json(); });
  }
  function buscarChave() {
    if (pushChave) return Promise.resolve(pushChave);
    return pedirPush('/chave').then(function (j) { pushChave = j.chave; return pushChave; });
  }
  function agendaPush() {
    var lem = [];
    Object.keys(S.config.lembretes).forEach(function (k) { var l = S.config.lembretes[k]; if (l.on) lem.push({ k: k, tipo: 'intervalo', min: l.min, prox: S.proximos[k] || null }); });
    S.meus.forEach(function (m) {
      if (!m.on) return;
      if (m.tipo === 'intervalo') lem.push({ k: m.id, tipo: 'intervalo', min: m.min, prox: S.proximos[m.id] || null });
      else { var x = { k: m.id, tipo: 'hora', hora: m.hora }; if (m.semana) x.semana = m.semana; lem.push(x); }
    });
    var ad = {};
    lem.forEach(function (l) { if (S.adiados[l.k]) ad[l.k] = S.adiados[l.k]; });
    return { inicio: S.config.inicio, fim: S.config.fim, lembretes: lem, adiados: ad };
  }
  function guardarNomes(agenda) {
    if (!('caches' in window)) return Promise.resolve();
    var nomes = {};
    agenda.lembretes.forEach(function (l) { var i = lembreteInfo(l.k); if (i) nomes[l.k] = i.nome; });
    var corpo = JSON.stringify({ api: PUSH_API, id: push.id, nomes: nomes });
    return caches.open('zumi-push').then(function (c) { return c.put('/rotina/__push', new Response(corpo, { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
  }
  function enviarAgenda(forcar) {
    if (!push.on || !registro || !registro.pushManager) return Promise.resolve();
    var agenda = agendaPush(), txt = JSON.stringify(agenda);
    guardarNomes(agenda);
    if (!forcar && txt === pushEnviado) return Promise.resolve();
    return registro.pushManager.getSubscription().then(function (sub) {
      return sub || buscarChave().then(function (ch) { return registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(ch) }); });
    }).then(function (sub) {
      return pedirPush('/aparelho', { id: push.id, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone, assinatura: sub.toJSON(), agenda: agenda });
    }).then(function () { pushEnviado = txt; });
  }
  // Chamado a cada salvar(): manda a agenda só quando ela muda, e no máximo uma vez a cada 3 s.
  function sincronizarPush() {
    if (!push || !push.on) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { enviarAgenda(false).catch(function () {}); }, 3000);
  }
  function estadoPush(msg) {
    var bloco = $('push-bloco');
    if (!pushPossivel()) {
      // No iPhone o Safari não tem push: só o atalho na tela inicial tem (iOS 16.4+). Em vez de esconder, explica.
      var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios) {
        var instalado = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
        $('push-on').checked = false; $('push-on').disabled = true;
        $('push-estado').textContent = instalado
          ? 'O seu iPhone precisa do iOS 16.4 ou mais novo para avisar com o app fechado. Atualize o iOS em Ajustes, Geral, Atualização de Software.'
          : 'No iPhone, esta opção só funciona abrindo a Rotina pelo ícone na tela inicial. No Safari, toque em Compartilhar, depois em Adicionar à Tela de Início, e abra a Rotina por esse ícone. Precisa do iOS 16.4 ou mais novo.';
        bloco.hidden = false;
      } else bloco.hidden = true;
      return;
    }
    $('push-on').disabled = false;
    $('push-on').checked = !!push.on;
    if (msg) $('push-estado').textContent = msg;
    buscarChave().then(function () {
      bloco.hidden = false;
      if (!msg) $('push-estado').textContent = push.on ? 'Ligado neste aparelho. A Zumi avisa mesmo com a Rotina fechada.' : '';
    }).catch(function () {
      bloco.hidden = !push.on;
      if (push.on) $('push-estado').textContent = 'O serviço de avisos não respondeu agora. Com o app aberto, os lembretes continuam.';
    });
  }
  // Fecha a notificação do sistema de um lembrete que já foi resolvido no app.
  function fecharNotif(k) {
    if (registro && registro.getNotifications) registro.getNotifications({ tag: 'lem-' + k }).then(function (ns) { ns.forEach(function (n) { n.close(); }); }).catch(function () {});
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
  // Toda ação no relógio marca mudouEm. Com a conta ligada, o relógio vai para a nuvem na hora, e o outro
  // aparelho fica com o que mudou por último (/mesclar.js). O restante sai sempre de fimEm (hora em que o
  // bloco acaba), então os dois aparelhos mostram o mesmo tempo, sem cada um contar o seu.
  function marcarTimer(quando) { S.timer.mudouEm = quando || Date.now(); }
  function salvarTimer() { salvar(); if (nuvem) nuvem.agora(); }
  function mmss(s) { var m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  function iniciar() {
    var t = S.timer;
    if (t.rodando) { t.restante = restante(); t.rodando = false; t.fimEm = null; falar('Pausei o relógio. Volta quando quiser.', null); }
    else {
      t.fimEm = Date.now() + restante() * 1000; t.rodando = true;
      if (t.fase === 'foco') falar(t.modo === 'lazer' ? 'Lazer também é rotina. Aproveita, sem culpa.' : 'Foco no ' + NOMES[t.modo] + '. Eu cuido do relógio.', t.modo === 'lazer' ? 'ola' : 'estudando');
      pedirAudio();
    }
    marcarTimer(); salvarTimer(); renderTimer();
  }
  function pedirAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { } }

  // quando: hora em que o bloco acabou (fimEm). Se o app estava fechado, a conta parte dessa hora, como no
  // outro aparelho, e um fim que já passou há mais de 1 min não toca som nem notificação de novo.
  function concluir(pulou, quando) {
    var t = S.timer, modo = t.modo;
    quando = quando || Date.now();
    var tarde = Date.now() - quando > 60000;
    function som() { if (!tarde) tocar(); }
    function aviso(titulo, corpo) { if (!tarde) notificar(titulo, corpo, 'timer'); }
    if (t.fase === 'foco') {
      if (!pulou) {
        var minutos = Math.round(duracao(modo, 'foco', t.ciclo) / 60);
        mudar(function (d) { d.blocos[modo]++; d.minutos[modo] += minutos; });
      }
      if (modo === 'lazer') {
        t.fase = 'foco'; t.rodando = false; t.fimEm = null; t.restante = null;
        if (!pulou) { falar('Lazer feito. Voltou com a bateria mais cheia? +10', 'comemorando', true); aviso('Fim do lazer', 'Lazer feito. +10 pontos.'); som(); }
      } else if (!S.config.pausas[modo]) {
        // Pausa desligada: o bloco conta, o ciclo avança e o próximo espera a pessoa.
        t.ciclo = t.ciclo >= S.config.ciclos ? 1 : t.ciclo + 1;
        t.rodando = false; t.fimEm = null; t.restante = null;
        if (!pulou) { som(); aviso('Fim do bloco de ' + NOMES[modo], 'Bloco feito. +10'); }
        falar(pulou ? 'Pulei o bloco. Quando quiser, começa o próximo.' : 'Bloco feito, sem pausa como você pediu. +10. Quando quiser, começa o próximo.', pulou ? 'ola' : 'comemorando', !pulou);
      } else {
        t.fase = 'pausa'; t.restante = null;
        var frase = PAUSAS[Math.floor(Math.random() * PAUSAS.length)];
        if (!pulou) { frase += ' +10'; som(); aviso('Fim do bloco de ' + NOMES[modo], frase); }
        falar(frase, 'ideia', !pulou);
        t.fimEm = quando + duracao(modo, 'pausa', t.ciclo) * 1000; t.rodando = true;
      }
    } else {
      t.fase = 'foco'; t.ciclo = t.ciclo >= S.config.ciclos ? 1 : t.ciclo + 1;
      t.rodando = false; t.fimEm = null; t.restante = null;
      falar('Pausa encerrada. Quando quiser, começa o próximo bloco.', 'ola');
      if (!pulou) { som(); aviso('Fim da pausa', 'Quando quiser, começa o próximo bloco.'); }
    }
    marcarTimer(quando); salvarTimer(); renderTimer();
  }
  function zerar() {
    var t = S.timer; t.fase = 'foco'; t.ciclo = 1; t.rodando = false; t.fimEm = null; t.restante = null;
    marcarTimer(); salvarTimer(); renderTimer(); falar('Relógio zerado. Escolha um bloco e começa quando quiser.', 'ola');
  }
  function trocarModo(m) {
    var t = S.timer;
    if (m === t.modo) return;
    if (t.rodando && !confirm('Trocar de bloco zera o relógio de agora. Continuar?')) return;
    t.modo = m; t.fase = 'foco'; t.ciclo = 1; t.rodando = false; t.fimEm = null; t.restante = null;
    marcarTimer(); salvarTimer(); renderTimer();
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
    if (!push.on) notificar('Zumi lembrando', info.nome, 'lem-' + chave); // com o push ligado, quem notifica é o service worker
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
      lab.appendChild(cb);
      var chave = 'lembrete:' + m.id, campo = campoEdicao(chave, m.nome, 40, function (v) { m.nome = v; }, renderMeus);
      if (campo) li.className = 'editando';
      lab.appendChild(campo || sp);
      var quando = document.createElement('span'); quando.className = 'cada';
      quando.textContent = m.tipo === 'hora' ? textoDias(m.semana) + ' às ' + m.hora : 'a cada ' + m.min + ' min';
      var tirar = document.createElement('button'); tirar.type = 'button'; tirar.className = 'btn btn-perigo tirar'; tirar.textContent = 'Remover';
      tirar.setAttribute('aria-label', 'Remover o lembrete ' + m.nome);
      tirar.addEventListener('click', function () { S.meus = S.meus.filter(function (x) { return x.id !== m.id; }); delete S.proximos[m.id]; delete S.adiados[m.id]; salvar(); renderMeus(); });
      var prox = document.createElement('small'); prox.dataset.meuProx = m.id;
      li.appendChild(lab);
      if (!campo) li.appendChild(caneta(chave, m.nome, 'o lembrete ' + m.nome, renderMeus));
      li.appendChild(quando); li.appendChild(tirar); li.appendChild(prox);
      el.meus.appendChild(li);
    });
    renderLembretes(); focarEdicao();
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
    renderTarefas(); renderMetas(); renderHoje(); renderZumi();
    voltarFoco(); focarEdicao();
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
      if (!S.timer.rodando && S.timer.restante != null) { S.timer.restante = null; marcarTimer(); }
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
      if (!S.timer.rodando && S.timer.restante != null) { S.timer.restante = null; marcarTimer(); }
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
    fecharAviso(); fecharNotif(k);
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
  $('aviso-depois').addEventListener('click', function () { var k = atual; S.adiados[k] = Date.now() + 10 * MIN; salvar(); fecharAviso(); fecharNotif(k); renderLembretes(); });
  // Pula só esta vez: o próximo aviso já foi agendado quando este tocou (intervalo) ou é o do dia seguinte (horário).
  $('aviso-pular').addEventListener('click', function () {
    var k = atual;
    delete S.adiados[k]; salvar(); fecharAviso(); renderLembretes();
    fecharNotif(k);
    falar('Tudo bem, pulei esse. O próximo vem no horário de sempre.', 'ola');
  });

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

  // Chave "Notificações": liga e desliga neste aparelho. Desligar não revoga a permissão do navegador (o site não
  // consegue); só para de mostrar. Desligar também desliga o aviso com o app fechado.
  $('notif-on').addEventListener('change', function () {
    var cb = this;
    if (!('Notification' in window)) { cb.checked = false; return; }
    if (!cb.checked) {
      push.notifOff = true; salvarPush();
      if (push.on) desligarPush(); else estadoPush();
      estadoNotif();
      falar('Notificações desligadas. Os lembretes ainda aparecem na tela quando a Rotina está aberta.', 'ola');
      return;
    }
    if (Notification.permission === 'denied') { cb.checked = false; estadoNotif(); return; }
    var pronto = function () {
      if (Notification.permission !== 'granted') { estadoNotif(); return; }
      delete push.notifOff; salvarPush(); estadoNotif(); estadoPush();
      falar('Notificações ligadas. Agora eu aviso com o app em segundo plano.', 'comemorando', true);
    };
    if (Notification.permission === 'granted') pronto();
    else Notification.requestPermission().then(pronto);
  });
  $('b-apagar').addEventListener('click', function () {
    if (!confirm('Apagar pontos, títulos, reflexões e lembretes deste aparelho? Não tem como desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { }
    S = padrao(); location.reload();
  });


  // ---------- Nuvem (opcional) ----------
  // Diz a causa de verdade em vez de "confira a internet": a pessoa precisa saber o que mudar.
  function motivoPush(e) {
    var nome = (e && e.name) || 'erro', msg = (e && e.message) || '';
    if (msg === 'permissao' || nome === 'NotAllowedError') return 'Sem a permissão de notificação não dá para avisar com o app fechado. Libere nas configurações do navegador.';
    if (/^push \d/.test(msg)) return 'O servidor de avisos recusou o pedido (' + msg + '). Tente de novo em instantes.';
    if (nome === 'AbortError' || nome === 'NotSupportedError' || nome === 'InvalidStateError') return 'O navegador não conseguiu criar a assinatura de push. Isso acontece em janela anônima ou privada, e quando o navegador está sem acesso ao serviço de push (Google, Apple ou Mozilla). Abra em uma janela normal e tente de novo. (' + nome + ')';
    return 'Não deu para ligar agora. Confira a internet e tente de novo. (' + nome + (msg ? ': ' + msg.slice(0, 80) : '') + ')';
  }
  function desligarPush() {
    var id = push.id;
    push.on = false; salvarPush(); pushEnviado = '';
    if (id) pedirPush('/remover', { id: id }).catch(function () {});
    if (registro && registro.pushManager) registro.pushManager.getSubscription().then(function (sub) { if (sub) sub.unsubscribe(); }).catch(function () {});
    if ('caches' in window) caches.delete('zumi-push').catch(function () {});
    estadoPush('Desligado. Os lembretes voltam a avisar só com o app aberto ou em segundo plano.');
  }
  $('push-on').addEventListener('change', function () {
    var cb = this;
    if (cb.checked) {
      cb.disabled = true;
      Notification.requestPermission().then(function (p) {
        if (p !== 'granted') throw new Error('permissao');
        push.id = push.id || idNovo(); push.on = true; delete push.notifOff; salvarPush();
        return navigator.serviceWorker.ready.then(function (r) { registro = r; return enviarAgenda(true); });
      }).then(function () {
        estadoNotif(); estadoPush();
        falar('Pronto! Agora eu aviso mesmo com a Rotina fechada.', 'comemorando', true);
      }).catch(function (e) {
        push.on = false; salvarPush(); cb.checked = false; estadoNotif();
        estadoPush(motivoPush(e));
      }).then(function () { cb.disabled = false; });
    } else desligarPush();
  });

  var CHAVE_NUVEM = 'rizzygo-nuvem-rotina-v1';
  var LOCAIS = ['proximos', 'adiados', 'tocados', 'semTelaAtivo']; // ficam só no aparelho (o relógio do Foco vai para a nuvem desde 13/11/2026)
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
    if (!r.timer) r.timer = loc.timer; // cópia gravada por uma versão de antes, sem o relógio: fica o deste aparelho
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
    S = carregar(); podar(); dia(); salvar();
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
  var nuvemMod = null, ultimoSt = null;
  function mostrarNuvem(st) {
    ultimoSt = st;
    var dentro = !!(st && st.usuario && metaNuvem.ligado);
    $('nuvem-fora').hidden = dentro; $('nuvem-entrar-box').hidden = dentro;
    $('nuvem-dentro').hidden = !dentro; $('nuvem-acoes').hidden = !dentro; $('nuvem-apagar-box').hidden = !dentro;
    $('nuvem-saude').checked = !!metaNuvem.aceites.saude; $('nuvem-reflexoes').checked = !!metaNuvem.aceites.reflexoes;
    if (dentro) {
      $('nuvem-quem').textContent = 'Salvando na nuvem com a conta ' + (st.usuario.email || st.usuario.nome || 'Google') + '.';
      $('nuvem-quando').textContent = metaNuvem.sincronizadoEm && nuvemMod ? 'Salvo na nuvem ' + nuvemMod.haQuanto(metaNuvem.sincronizadoEm) + '.' : 'Enviando a primeira cópia.';
    }
    $('nuvem-estado').textContent = (st && st.falha) || metaNuvem.erro || '';
    // Cota grátis da nuvem cheia: a Zumi avisa uma vez por dia (a mesma marca do topo, /conta.js), para não parecer falta de internet.
    if (nuvemMod && metaNuvem.erro === nuvemMod.AVISO_COTA) {
      var hoje = new Date().toDateString(), marca = 'rizzygo-nuvem-cota-avisada';
      try { if (JSON.parse(localStorage.getItem(marca) || 'null') !== hoje) { localStorage.setItem(marca, JSON.stringify(hoje)); falar(nuvemMod.AVISO_COTA, 'ola', true); } } catch (e) { }
    }
  }
  function abrirNuvem() {
    if (nuvem) return Promise.resolve(nuvem);
    if (!carregandoNuvem) carregandoNuvem = import('/nuvem.js?v=2026111310').then(function (m) {
      nuvemMod = m;
      nuvem = m.criar({
        app: 'rotina', meta: metaNuvem, salvarMeta: salvarMeta,
        ler: function () { return S; }, temDados: temDados, aplicar: aplicarNuvem,
        paraNuvem: paraNuvem, daNuvem: daNuvem, ajustar: ajustarJunto, perguntar: perguntarNuvem, aoMudar: mostrarNuvem
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
  $('nuvem-atualizar').addEventListener('click', function () {
    var b = this;
    if (!nuvem) return;
    b.disabled = true;
    nuvem.atualizar().then(function (ok) { b.disabled = false; if (ok) $('nuvem-estado').textContent = 'Tudo em dia com a nuvem.'; });
  });
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
    doDiaFuturo(am).forEach(function (t) { ul.appendChild(linhaTarefa(t, { amanha: true })); });
    var n = ul.children.length;
    $('b-amanha').textContent = n ? '📝 Amanhã: ' + n + (n === 1 ? ' tarefa' : ' tarefas') + '. Mais alguma?' : '📝 Tem algo para amanhã?';
  }

  // ---------- Tarefas e rotinas ----------
  function amanhaChave() { var d = new Date(); d.setDate(d.getDate() + 1); return chaveDia(d); }
  function novoId(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  // ---------- Ordem das tarefas ----------
  // Cada tarefa guarda a própria posição (pos). Mover uma tarefa muda só o pos dela (o meio entre as
  // vizinhas), então a junção de mudanças (/mesclar.js) não perde o que outra aba ou aparelho mexeu.
  function posDe(t) { return typeof t.pos === 'number' ? t.pos : 0; }
  function porPos(a, b) { return posDe(a) - posDe(b); }
  function limitesPos(l) {
    var ps = l.filter(function (t) { return typeof t.pos === 'number'; }).map(posDe);
    return ps.length ? [Math.min.apply(null, ps), Math.max.apply(null, ps)] : [0, 0];
  }
  // Tarefas de antes desta versão ganham posição na ordem que já apareciam: prioridades, depois o resto, rotinas no fim.
  function darPosicoes(l) {
    var sem = l.filter(function (t) { return typeof t.pos !== 'number'; });
    if (!sem.length) return;
    if (sem.length === l.length) {
      l.map(function (t, i) { return [t, i]; })
        .sort(function (a, b) { return (!!b[0].prio - !!a[0].prio) || (!!a[0].rotina - !!b[0].rotina) || (a[1] - b[1]); })
        .forEach(function (x, i) { x[0].pos = i + 1; });
      return;
    }
    var lim = limitesPos(l);
    sem.forEach(function (t) { if (t.prio) t.pos = --lim[0]; else t.pos = ++lim[1]; });
  }
  function proTopo(t) { t.pos = limitesPos(S.tarefas)[0] - 1; }
  // Põe a tarefa na posição i da lista mostrada (lista sem ela). Vizinhas com o mesmo pos: renumera tudo uma vez.
  function moverPara(t, lista, i) {
    var outras = lista.filter(function (x) { return x.id !== t.id; });
    i = Math.max(0, Math.min(i, outras.length));
    var a = outras[i - 1], b = outras[i], p;
    if (!a && !b) return false;
    p = !a ? posDe(b) - 1 : !b ? posDe(a) + 1 : (posDe(a) + posDe(b)) / 2;
    if (a && b && !(p > posDe(a) && p < posDe(b))) {
      S.tarefas.slice().sort(porPos).forEach(function (x, k) { x.pos = k + 1; });
      return moverPara(t, lista, i);
    }
    if (p === t.pos) return false;
    t.pos = p;
    return true;
  }
  function feitaHoje(t) { return t.rotina ? !!dia().feitas[t.id] : t.feita === chaveDia(); }
  function visiveisHoje() {
    var hoje = chaveDia();
    return S.tarefas.filter(function (t) { return t.rotina ? repeteEm(t, hoje) : (!!t.dia && t.dia <= hoje && (!t.feita || t.feita === hoje)); })
      .sort(function (a, b) { return (feitaHoje(a) - feitaHoje(b)) || porPos(a, b); });
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
  // ---------- Editar o texto ----------
  // A caneta ✏️ abre o campo no lugar do texto. No computador, o duplo clique no texto faz o mesmo.
  // Enter ou sair do campo grava; Esc desiste. Se a tela redesenhar no meio, o rascunho continua.
  var editando = null; // { chave, valor }
  var COMPUTADOR = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  function caneta(chave, atual, rotulo, redesenhar) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'editar-bt'; b.textContent = '✏️';
    b.setAttribute('aria-label', 'Editar: ' + rotulo); b.title = 'Editar';
    b.addEventListener('click', function () { abrirEdicao(chave, atual, redesenhar); });
    return b;
  }
  function duploClique(alvo, chave, atual, redesenhar) {
    if (!COMPUTADOR) return;
    alvo.title = 'Dois cliques para editar';
    alvo.addEventListener('dblclick', function (e) { e.preventDefault(); abrirEdicao(chave, atual, redesenhar); });
  }
  function abrirEdicao(chave, atual, redesenhar) { editando = { chave: chave, valor: atual }; redesenhar(); focarEdicao(); }
  // Devolve o campo, se este item está sendo editado; senão, null.
  function campoEdicao(chave, atual, max, gravar, redesenhar) {
    if (!editando || editando.chave !== chave) return null;
    var f = document.createElement('input'); f.type = 'text'; f.className = 'editar-campo'; f.maxLength = max;
    f.value = editando.valor; f.dataset.edicao = chave; f.setAttribute('aria-label', 'Novo texto');
    f.setAttribute('enterkeyhint', 'done');
    var feito = false;
    function fim(grava) {
      if (feito || !editando || editando.chave !== chave) return;
      feito = true;
      var v = f.value.trim(); editando = null;
      if (grava && v && v !== atual) { gravar(v); salvar(); }
      redesenhar();
    }
    f.addEventListener('input', function () { if (editando && editando.chave === chave) editando.valor = f.value; });
    f.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fim(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fim(false); }
    });
    // sair do campo grava; um campo tirado da tela por um redesenho não conta
    f.addEventListener('blur', function () { setTimeout(function () { if (f.isConnected) fim(true); }, 0); });
    return f;
  }
  function focarEdicao() {
    if (!editando) return;
    var f = [].slice.call(document.querySelectorAll('[data-edicao]')).filter(function (x) { return x.offsetParent; })[0];
    if (f && document.activeElement !== f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  }

  function linhaTarefa(t, opcoes) {
    var li = document.createElement('li'), feita = opcoes.amanha ? false : feitaHoje(t), hoje = chaveDia();
    li.className = 'tarefa' + (feita ? ' feita' : '') + (t.prio ? ' prio' : '');
    li.dataset.id = t.id;
    if (opcoes.lista && !feita && opcoes.lista.length > 1) alca(li, t, opcoes.lista);
    if (!opcoes.amanha) {
      var cb = document.createElement('button'); cb.type = 'button'; cb.className = 'marca-tarefa';
      cb.setAttribute('aria-pressed', String(feita)); cb.setAttribute('aria-label', (feita ? 'Desmarcar: ' : 'Concluir: ') + t.texto);
      cb.addEventListener('click', function () { marcarTarefa(t); });
      li.appendChild(cb);
    }
    var chave = 'tarefa:' + t.id, campo = opcoes.curta ? null : campoEdicao(chave, t.texto, 80, function (v) { t.texto = v; focoDepois = { id: t.id, cls: 'editar-bt' }; }, render);
    if (campo) { li.classList.add('editando'); li.appendChild(campo); }
    else {
      var txt = document.createElement('span'); txt.className = 'tarefa-txt'; txt.textContent = t.texto;
      if (t.rotina) { var r = document.createElement('small'); r.textContent = t.repete ? '🔁 ' + textoRepete(t.repete).replace(t.repete.dias ? /^$/ : /^tod[ao] /, '') : 'Rotina'; if (t.repete) { r.className = 'repete'; r.title = textoRepete(t.repete); } txt.appendChild(r); }
      else if (!opcoes.amanha && t.dia && t.dia < hoje) {
        var n = diasDesde(t.dia), v = document.createElement('small');
        v.className = 'idade' + (n >= PARADA ? ' forte' : ''); v.textContent = idadeTexto(n); txt.appendChild(v);
      }
      if (!opcoes.curta) duploClique(txt, chave, t.texto, render);
      li.appendChild(txt);
      if (!opcoes.curta && !opcoes.semCaneta) li.appendChild(caneta(chave, t.texto, t.texto, render));
    }
    var pr = document.createElement('button'); pr.type = 'button'; pr.className = 'prio-bt'; pr.textContent = t.prio ? '★' : '☆';
    pr.setAttribute('aria-pressed', String(!!t.prio)); pr.setAttribute('aria-label', 'Prioridade: ' + t.texto);
    pr.title = t.prio ? 'Tirar a prioridade' : 'Marcar como prioridade';
    pr.addEventListener('click', function () { t.prio = !t.prio; if (t.prio) proTopo(t); salvar(); render(); });
    li.appendChild(pr);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'tirar-bt'; x.textContent = '×';
    x.setAttribute('aria-label', (t.repete ? 'Remover de todos os dias: ' : 'Remover: ') + t.texto);
    x.addEventListener('click', function () { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); salvar(); render(); });
    if (!opcoes.curta && !(opcoes.amanha && t.repete)) li.appendChild(x);
    if (!opcoes.curta && !opcoes.amanha && !feita && tarefaParada(t)) li.appendChild(perguntaParada(t));
    return li;
  }
  // Tarefa que passa de um dia para o outro mostra há quanto tempo está na lista.
  // Com PARADA dias ou mais, a própria linha pergunta, sem culpa, se ainda é para hoje.
  // Rotina fica de fora: ela volta todo dia de propósito.
  var PARADA = 3;
  function diasDesde(k) {
    var a = k.split('-'), b = chaveDia().split('-');
    return Math.round((new Date(b[0], b[1] - 1, b[2]) - new Date(a[0], a[1] - 1, a[2])) / 864e5);
  }
  function idadeTexto(n) { return n <= 1 ? 'desde ontem' : 'há ' + n + ' dias'; }
  function tarefaParada(t) { return !t.rotina && !!t.dia && diasDesde(t.dia) >= PARADA && t.mantida !== chaveDia(); }
  function perguntaParada(t) {
    var n = diasDesde(t.dia), box = document.createElement('div'); box.className = 'parada';
    var q = document.createElement('p'); q.textContent = 'Já são ' + n + ' dias na lista. Ainda é para hoje?'; box.appendChild(q);
    function bt(txt, cls, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.textContent = txt;
      b.addEventListener('click', fn); box.appendChild(b);
    }
    bt('☀️ Fica hoje', 'btn-sec', function () { t.mantida = chaveDia(); salvar(); render(); falar('Combinado: "' + t.texto + '" fica na lista de hoje.', 'ideia'); });
    bt('🌙 Amanhã', 'btn-sec', function () { t.dia = amanhaChave(); delete t.mantida; salvar(); render(); falar('"' + t.texto + '" fica para amanhã.', 'ideia'); });
    bt('📌 Sem data', 'btn-sec', function () { paraSemData(t); });
    bt('Tirar', 'btn-perigo', function () { tirarTarefa(t); });
    return box;
  }
  function paraSemData(t) {
    t.dia = null; t.criada = chaveDia(); delete t.mantida; salvar(); render();
    falar('"' + t.texto + '" foi para a lista Sem data. Fica guardada, sem cobrança.', 'ideia');
  }
  function tirarTarefa(t) { S.tarefas = S.tarefas.filter(function (y) { return y.id !== t.id; }); salvar(); render(); }
  // Alça ⠿ no começo do card. Arrastar (dedo ou mouse) muda a ordem dentro da mesma lista.
  // No teclado, com a alça em foco, as setas para cima e para baixo movem.
  var focoDepois = null;
  function alca(li, t, lista) {
    var h = document.createElement('button'); h.type = 'button'; h.className = 'alca'; h.textContent = '⠿';
    h.setAttribute('aria-label', 'Mudar a ordem: ' + t.texto + '. Use as setas para cima e para baixo.');
    h.title = 'Arraste para mudar a ordem';
    li.appendChild(h);
    h.addEventListener('keydown', function (e) {
      var passo = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!passo) return;
      e.preventDefault(); passo1(t, lista, passo, 'alca');
    });
    arrastar(h, li);
  }
  function passo1(t, lista, passo, cls) {
    var i = lista.indexOf(t) + passo;
    if (i < 0 || i >= lista.length) return;
    if (!moverPara(t, lista, i)) return;
    focoDepois = { id: t.id, cls: cls };
    salvar(); render();
  }
  // Depois de redesenhar, o foco volta para o mesmo botão do mesmo card (teclado e leitor de tela não se perdem).
  function voltarFoco() {
    if (!focoDepois) return;
    var f = focoDepois; focoDepois = null;
    var vis = [].slice.call(document.querySelectorAll('.tarefa[data-id="' + f.id + '"]')).filter(function (x) { return x.offsetParent; });
    var li = vis[0], b = li && (li.querySelector('.' + f.cls + ':not([disabled])') || li.querySelector('.alca'));
    if (b) b.focus();
  }
  function arrastar(h, li) {
    var ul, y0, yTela0, topo0, ultimoY, rodando = false, ativo = false, id = null;
    function irmaos() { return [].slice.call(ul.children).filter(function (x) { return x !== li && x.querySelector('.alca'); }); }
    function posicionar() {
      var meio = topo0 + (ultimoY + window.scrollY - y0) + li.offsetHeight / 2, antes = null;
      irmaos().some(function (x) { var r = x.getBoundingClientRect(); if (meio < r.top + window.scrollY + r.height / 2) { antes = x; return true; } return false; });
      var ultimoMovel = irmaos().pop();
      if (antes) { if (li.nextElementSibling !== antes) ul.insertBefore(li, antes); }
      else if (ultimoMovel && ultimoMovel.nextElementSibling !== li) ul.insertBefore(li, ultimoMovel.nextElementSibling);
      li.style.transform = '';
      var natural = li.getBoundingClientRect().top + window.scrollY;
      li.style.transform = 'translateY(' + (topo0 + (ultimoY + window.scrollY - y0) - natural) + 'px)';
    }
    // perto da borda da tela, a página rola sozinha (no celular a barra de baixo ocupa uns 80px).
    // Só rola para o lado em que o dedo andou: pegar um card já perto da borda não faz a página fugir.
    function rolar() {
      if (!ativo) { rodando = false; return; }
      var v = ultimoY < 70 && ultimoY < yTela0 - 20 ? -12 : ultimoY > window.innerHeight - 100 && ultimoY > yTela0 + 20 ? 12 : 0;
      if (v) { window.scrollBy(0, v); posicionar(); }
      requestAnimationFrame(rolar);
    }
    h.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || id !== null) return;
      id = e.pointerId; ul = li.parentNode; y0 = e.clientY + window.scrollY; ultimoY = yTela0 = e.clientY;
      topo0 = li.getBoundingClientRect().top + window.scrollY; ativo = false;
      // escuta no documento: mover o card na lista tira a captura do ponteiro da alça
      document.addEventListener('pointermove', mexe, { passive: false });
      document.addEventListener('pointerup', fim); document.addEventListener('pointercancel', fim);
    });
    function mexe(e) {
      if (e.pointerId !== id) return;
      ultimoY = e.clientY;
      if (!ativo) {
        if (Math.abs(e.clientY + window.scrollY - y0) < 6) return;
        ativo = true; li.classList.add('arrastando'); ul.classList.add('ordenando');
        if (!rodando) { rodando = true; requestAnimationFrame(rolar); }
      }
      e.preventDefault(); posicionar();
    }
    function fim(e) {
      if (e.pointerId !== id) return;
      id = null;
      document.removeEventListener('pointermove', mexe, { passive: false });
      document.removeEventListener('pointerup', fim); document.removeEventListener('pointercancel', fim);
      if (!ativo) return;
      ativo = false;
      li.classList.remove('arrastando'); ul.classList.remove('ordenando'); li.style.transform = '';
      if (!li.isConnected || e.type === 'pointercancel') { render(); return; }
      // a ordem nova vem da tela; as tarefas vêm do estado atual (outra aba pode ter gravado no meio)
      var ids = [].slice.call(ul.children).filter(function (x) { return x.querySelector('.alca'); }).map(function (x) { return x.dataset.id; });
      var lista = ids.map(function (k) { return S.tarefas.filter(function (x) { return x.id === k; })[0]; }).filter(Boolean);
      var t = lista.filter(function (x) { return x.id === li.dataset.id; })[0];
      var resto = lista.filter(function (x) { return x !== t; }).sort(porPos);
      if (t && moverPara(t, resto, lista.indexOf(t))) { focoDepois = null; salvar(); }
      render();
    }
  }
  function renderTarefas() {
    var lista = visiveisHoje(), feitas = lista.filter(feitaHoje), hoje = chaveDia(), am = amanhaChave();
    var ul = $('tarefas'); ul.innerHTML = '';
    var moveis = lista.filter(function (t) { return !feitaHoje(t); });
    lista.forEach(function (t) { ul.appendChild(linhaTarefa(t, { lista: moveis })); });
    var prios = lista.filter(function (t) { return t.prio; });
    $('tarefas-resumo').textContent = lista.length
      ? feitas.length + ' de ' + lista.length + ' feitas' + (prios.length ? ', ' + prios.filter(feitaHoje).length + ' de ' + prios.length + ' prioridades.' : '.') + ' Toque na estrela para mudar a prioridade. Arraste pelo ⠿ para mudar a ordem.'
      : 'Nada na lista. Tarefa some quando você conclui. Rotina volta todo dia.';

    renderFicou(lista, feitas);
    renderAgenda();
    renderSemData();
  }
  // "O que ficou hoje", no Fim do dia, depois das 18h. A tarefa que não sai passa sozinha para
  // amanhã; aqui a pessoa só mexe no que quiser (Sem data ou Tirar) e fecha com um toque.
  function renderFicou(lista, feitas) {
    var pendentes = lista.filter(function (t) { return !t.rotina && !feitaHoje(t); });
    var box = $('ficou'), ul = $('ficou-lista');
    box.hidden = new Date().getHours() < 18 || !pendentes.length || !!dia().ficouOk;
    ul.innerHTML = '';
    if (box.hidden) return;
    $('ficou-resumo').textContent = 'Você fez ' + feitas.length + ' de ' + lista.length + '. O que ficou passa sozinho para amanhã. Só mexa no que quiser.';
    pendentes.forEach(function (t) {
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = (t.prio ? '★ ' : '') + t.texto;
      if (t.dia && t.dia < chaveDia()) { var n = diasDesde(t.dia), sm = document.createElement('small'); sm.className = 'idade' + (n >= PARADA ? ' forte' : ''); sm.textContent = idadeTexto(n); sp.appendChild(sm); }
      var sd = document.createElement('button'); sd.type = 'button'; sd.className = 'btn btn-sec'; sd.textContent = '📌 Sem data';
      sd.addEventListener('click', function () { paraSemData(t); });
      var r = document.createElement('button'); r.type = 'button'; r.className = 'btn btn-perigo'; r.textContent = 'Tirar';
      r.addEventListener('click', function () { tirarTarefa(t); });
      li.appendChild(sp); li.appendChild(sd); li.appendChild(r); ul.appendChild(li);
    });
  }
  $('ficou-pronto').addEventListener('click', function () {
    dia().ficouOk = true; salvar(); render();
    falar('Combinado. O que ficou passa para amanhã, sem cobrança.', 'ideia');
  });

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
    var repetem = S.tarefas.filter(function (t) { return t.repete; });
    var box = $('cal-dias'); box.innerHTML = '';
    for (var i = 0; i < calMes.getDay(); i++) box.appendChild(document.createElement('span'));
    var ultimo = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 0).getDate();
    for (var n = 1; n <= ultimo; n++) {
      var k = chaveDia(new Date(calMes.getFullYear(), calMes.getMonth(), n));
      if (k >= hoje) repetem.forEach(function (t) { if (repeteEm(t, k) && !(k === hoje && feitaHoje(t))) conta[k] = (conta[k] || 0) + 1; });
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
    var doDia = calDia === hoje ? visiveisHoje().filter(function (t) { return !t.rotina || t.repete; }) : doDiaFuturo(calDia);
    var moveis = calDia === hoje ? doDia.filter(function (t) { return !feitaHoje(t); }) : doDia;
    doDia.forEach(function (t) { ul.appendChild(linhaTarefa(t, calDia === hoje ? { lista: moveis } : { amanha: true, lista: moveis })); });
    $('cal-vazio').hidden = doDia.length > 0;
    $('cal-add').textContent = calDia === hoje ? 'Adicionar hoje' : 'Adicionar em ' + dataCurta(calDia).split(',')[1].trim();
    opcoesRepete();
    renderRepeticoes();
  }
  // Tarefas de um dia que ainda vai chegar: as marcadas nele e as que se repetem nele.
  function doDiaFuturo(k) {
    return S.tarefas.filter(function (t) { return t.rotina ? !!t.repete && repeteEm(t, k) : t.dia === k; }).sort(porPos);
  }

  // ---------- Repetir ----------
  // Tarefa que se repete é uma rotina (rotina: true) com a regra em repete:
  //   { dias: [2, 6], desde }          toda terça e sábado (0 = domingo)
  //   { ordem: 3, dia: 1, desde }      toda 3ª segunda do mês (ordem -1 = a última)
  // Sem repete, a rotina volta todo dia, como antes. Cada dia é marcado à parte (dias[k].feitas).
  var DSEM_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var DSEM_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  function dataDe(k) { var a = k.split('-'); return new Date(+a[0], a[1] - 1, +a[2], 12); }
  function ordemNoMes(d) { return Math.ceil(d.getDate() / 7); }
  function ultimaNoMes(d) { return d.getDate() + 7 > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
  function repeteEm(t, k) {
    var r = t.repete;
    if (!r) return true;
    if (r.desde && k < r.desde) return false;
    var d = dataDe(k);
    if (r.dias) return r.dias.indexOf(d.getDay()) >= 0;
    if (d.getDay() !== r.dia) return false;
    return r.ordem === -1 ? ultimaNoMes(d) : ordemNoMes(d) === r.ordem;
  }
  function textoRepete(r) {
    if (r.dias) {
      var ds = [1, 2, 3, 4, 5, 6, 0].filter(function (x) { return r.dias.indexOf(x) >= 0; }), k = ds.join(',');
      if (ds.length === 7) return 'todo dia';
      if (k === '1,2,3,4,5') return 'de segunda a sexta';
      if (k === '6,0') return 'todo fim de semana';
      if (ds.length === 1) return (ds[0] === 0 || ds[0] === 6 ? 'todo ' : 'toda ') + DSEM_NOME[ds[0]];
      var nomes = ds.map(function (x) { return DSEM_PLURAL[x]; });
      return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
    }
    var m = r.dia === 0 || r.dia === 6;
    return (m ? 'todo ' : 'toda ') + (r.ordem === -1 ? (m ? 'último ' : 'última ') : r.ordem + (m ? 'º ' : 'ª ')) + DSEM_NOME[r.dia] + ' do mês';
  }
  function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  // As opções saem do dia escolhido no calendário: terça, 18/11 oferece "Toda terça", "Toda 3ª terça do mês"...
  function opcoesRepete() {
    var sel = $('cal-repete'), antes = sel.value, d = dataDe(calDia), w = d.getDay(), n = ordemNoMes(d);
    var ops = [['', 'Não repetir'], ['sem', maiuscula(textoRepete({ dias: [w] }))], ['dias', 'Escolher os dias']];
    if (n <= 4) ops.push(['mes', maiuscula(textoRepete({ ordem: n, dia: w }))]);
    if (ultimaNoMes(d)) ops.push(['ult', maiuscula(textoRepete({ ordem: -1, dia: w }))]);
    sel.innerHTML = '';
    ops.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
    sel.value = ops.some(function (o) { return o[0] === antes; }) ? antes : '';
    mostrarDiasRepete();
  }
  var repDias = document.querySelectorAll('#cal-rep-dias [data-rdia]');
  function diasRepete() { return [].filter.call(repDias, function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return +b.dataset.rdia; }); }
  function mostrarDiasRepete() {
    var box = $('cal-rep-dias'), abrir = $('cal-repete').value === 'dias';
    // ao abrir, já vem marcado o dia da semana escolhido no calendário
    if (abrir && box.hidden && !diasRepete().length) { var w = dataDe(calDia).getDay(); repDias.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.rdia === w)); }); }
    box.hidden = !abrir;
  }
  $('cal-repete').addEventListener('change', mostrarDiasRepete);
  repDias.forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }); });
  function regraEscolhida() {
    var v = $('cal-repete').value, d = dataDe(calDia), w = d.getDay();
    if (!v) return null;
    if (v === 'sem') return { dias: [w], desde: calDia };
    if (v === 'dias') { var ds = diasRepete(); return ds.length ? { dias: ds.sort(), desde: calDia } : false; }
    return { ordem: v === 'ult' ? -1 : ordemNoMes(d), dia: w, desde: calDia };
  }
  function renderRepeticoes() {
    var lista = S.tarefas.filter(function (t) { return t.repete; }).sort(porPos), hoje = chaveDia();
    var box = $('repeticoes'), ul = $('rep-lista'); ul.innerHTML = '';
    box.hidden = !lista.length;
    $('rep-n').textContent = lista.length;
    lista.forEach(function (t) {
      var li = document.createElement('li'), sp = document.createElement('span');
      sp.textContent = (t.prio ? '★ ' : '') + t.texto;
      var sm = document.createElement('small');
      sm.textContent = textoRepete(t.repete) + (t.repete.desde > hoje ? ', a partir de ' + dataCurta(t.repete.desde) : '');
      sp.appendChild(sm);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-perigo btn-mini'; x.textContent = 'Parar';
      x.setAttribute('aria-label', 'Parar de repetir: ' + t.texto);
      x.addEventListener('click', function () { tirarTarefa(t); falar('"' + t.texto + '" não se repete mais.', 'ola'); });
      li.appendChild(sp); li.appendChild(x); ul.appendChild(li);
    });
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
    var quando = calDia, regra = regraEscolhida();
    if (regra === false) { falar('Escolha pelo menos um dia da semana para repetir.', 'ideia'); return; }
    addTarefa(txt, $('cal-prio').checked, !!regra, quando, null, regra);
    $('cal-txt').value = ''; $('cal-prio').checked = false; $('cal-repete').value = ''; repDias.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); mostrarDiasRepete();
    if (regra) falar('Combinado: "' + txt + '" aparece na sua lista ' + textoRepete(regra) + (quando === chaveDia() ? ', começando hoje.' : ', a partir de ' + dataCurta(quando) + '.'), 'ideia');
    else falar(quando === chaveDia() ? 'Anotado na lista de hoje.' : 'Anotado para ' + dataCurta(quando) + '. Nesse dia ela aparece na sua lista.', 'ideia');
  });
  function addTarefa(texto, prio, rotina, quando, grupo, repete) {
    var t = { id: novoId('t'), texto: texto, prio: prio, rotina: rotina, dia: quando, feita: null };
    if (repete) t.repete = repete;
    if (!quando) { t.grupo = grupo || null; t.criada = chaveDia(); }
    if (prio) proTopo(t); else t.pos = limitesPos(S.tarefas)[1] + 1;
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
  function ordemSemData(a, b) { return (feitaHoje(a) - feitaHoje(b)) || porPos(a, b); }

  // Linha compacta: concluir, texto, Hoje, estrela e "Mais" (escolher dia, mudar de grupo, remover).
  // Assim a lista fica leve no celular e as ações menos usadas não ocupam espaço.
  var semDataAberta = null;
  function linhaSemData(t, lista) {
    // No Sem data a linha fica curta (alça, marcar, texto, estrela, ⋯); o resto mora no menu ⋯.
    var li = linhaTarefa(t, { lista: lista, semCaneta: true }), hoje = chaveDia();
    li.classList.add('semdata');
    var tirar = li.querySelector('.tirar-bt'); if (tirar) tirar.remove();
    if (t.criada && dias(t.criada) > 30 && !t.feita) {
      var v = document.createElement('small'); v.className = 'faz-tempo'; v.textContent = 'Faz tempo';
      v.title = 'Guardada há ' + dias(t.criada) + ' dias. Ainda quer?';
      var tx = li.querySelector('.tarefa-txt'); if (tx) tx.appendChild(v);
    }
    if (t.feita) return li;
    var aberta = semDataAberta === t.id;
    var mais = document.createElement('button'); mais.type = 'button'; mais.className = 'mais-bt'; mais.textContent = '⋯';
    mais.setAttribute('aria-expanded', String(aberta)); mais.setAttribute('aria-label', 'Mais opções: ' + t.texto);
    mais.addEventListener('click', function () { semDataAberta = aberta ? null : t.id; renderSemData(); });
    li.appendChild(mais);
    var ac = document.createElement('div'); ac.className = 'semdata-acoes'; ac.hidden = !aberta;
    var h = document.createElement('button'); h.type = 'button'; h.className = 'btn btn-mini hoje-bt'; h.textContent = '☀️ Vou fazer hoje';
    h.setAttribute('aria-label', 'Vou fazer hoje: ' + t.texto);
    h.addEventListener('click', function () { t.dia = hoje; semDataAberta = null; salvar(); render(); falar('"' + t.texto + '" entrou na lista de hoje.', 'ideia'); });
    ac.appendChild(h);
    // Escolher dia: o botão abre o calendário do aparelho (showPicker). Sem ele, o campo de data aparece na linha.
    var dt = document.createElement('button'); dt.type = 'button'; dt.className = 'btn btn-sec btn-mini escolher-dia'; dt.textContent = '📅 Escolher dia';
    var inp = document.createElement('input'); inp.type = 'date'; inp.min = amanhaChave(); inp.className = 'dia-campo';
    inp.setAttribute('aria-label', 'Escolher dia para: ' + t.texto);
    inp.addEventListener('change', function () {
      if (!inp.value || inp.value < inp.min) return;
      t.dia = inp.value; semDataAberta = null; salvar(); render();
      falar('"' + t.texto + '" vai aparecer na sua lista em ' + dataCurta(inp.value) + '.', 'ideia');
    });
    dt.addEventListener('click', function () {
      try { if (inp.showPicker) { inp.showPicker(); return; } } catch (e) { /* segue para o campo visível */ }
      inp.classList.add('visivel'); inp.focus();
    });
    ac.appendChild(dt); ac.appendChild(inp);
    var ed = document.createElement('button'); ed.type = 'button'; ed.className = 'btn btn-sec btn-mini'; ed.textContent = '✏️ Editar';
    ed.setAttribute('aria-label', 'Editar: ' + t.texto);
    ed.addEventListener('click', function () { semDataAberta = null; abrirEdicao('tarefa:' + t.id, t.texto, render); });
    ac.appendChild(ed);
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
  function opcoesGrupo(sel, atual, comNovo) {
    sel.innerHTML = '';
    var o = document.createElement('option'); o.value = ''; o.textContent = 'Sem grupo'; sel.appendChild(o);
    S.grupos.forEach(function (g) { var x = document.createElement('option'); x.value = g.id; x.textContent = nomeGrupo(g); sel.appendChild(x); });
    if (comNovo) { var n = document.createElement('option'); n.value = '__novo'; n.textContent = '＋ Novo grupo…'; sel.appendChild(n); }
    sel.value = grupoDe(atual) ? atual : '';
    sel.dataset.antes = sel.value;
  }
  // "＋ Novo grupo…" no seletor do campo abre o formulário sem perder o que a pessoa digitou
  $('semdata-grupo').addEventListener('change', function () {
    var sel = $('semdata-grupo');
    if (sel.value === '__novo') { sel.value = sel.dataset.antes || ''; abrirGrupoForm(); }
    else sel.dataset.antes = sel.value;
  });

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
    var novo = document.createElement('button'); novo.type = 'button'; novo.className = 'chip-grupo chip-novo'; novo.textContent = '＋ Novo grupo';
    novo.setAttribute('aria-expanded', String(!$('grupo-form').hidden && !grupoEditando));
    novo.addEventListener('click', function () { if ($('grupo-form').hidden || grupoEditando) abrirGrupoForm(); else limparGrupoForm(); });
    fx.appendChild(novo);

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
      var moveis = itens.filter(function (t) { return !t.feita; });
      itens.forEach(function (t) { ul.appendChild(linhaSemData(t, moveis)); });
      sec.appendChild(ul); box.appendChild(sec);
    });
    var vazio = $('semdata-vazio'); vazio.hidden = mostrou > 0;
    if (!mostrou) vazio.textContent = filtroGrupo === 'todos'
      ? 'Nada guardado aqui. Anote o que você não quer esquecer, como a lista do mercado ou o que levar na viagem.'
      : 'Nada em ' + (filtroGrupo ? nomeGrupo(grupoDe(filtroGrupo)) : 'Sem grupo') + ' ainda.';

    var n = $('parte-semdata-n'); n.hidden = !abertas.length; n.textContent = abertas.length;
    var sel = $('semdata-grupo'), atual = sel.value;
    opcoesGrupo(sel, atual, true);
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
  // O formulário de grupo fica escondido: abre pelo "＋ Novo grupo" ou pelo Editar.
  function abrirGrupoForm() {
    limparGrupoForm();
    $('grupo-form').hidden = false; renderSemData();
    $('grupo-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('grupo-nome').focus();
  }
  function editarGrupo(g) {
    $('grupo-form').hidden = false;
    grupoEditando = g.id;
    $('grupo-form-titulo').textContent = 'Editar ' + g.nome;
    $('grupo-nome').value = g.nome;
    if (EMOJIS.indexOf(g.emoji) >= 0) { emojiEscolhido = g.emoji; $('grupo-emoji-outro').value = ''; } else $('grupo-emoji-outro').value = g.emoji;
    $('grupo-salvar').textContent = 'Salvar grupo';
    renderEmojis(); renderSemData();
    $('grupo-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); $('grupo-nome').focus();
  }
  function limparGrupoForm() {
    grupoEditando = null; emojiEscolhido = EMOJIS[0];
    $('grupo-form-titulo').textContent = 'Novo grupo';
    $('grupo-nome').value = ''; $('grupo-emoji-outro').value = '';
    $('grupo-salvar').textContent = 'Criar grupo';
    $('grupo-form').hidden = true;
    renderEmojis();
  }
  $('grupo-emoji-outro').addEventListener('input', renderEmojis);
  $('grupo-cancelar').addEventListener('click', function () { limparGrupoForm(); renderSemData(); });
  $('grupo-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('grupo-nome').value.trim(); if (!nome) return;
    var emoji = $('grupo-emoji-outro').value.trim() || emojiEscolhido;
    var g = grupoDe(grupoEditando);
    if (g) { g.nome = nome; g.emoji = emoji; }
    else { g = { id: novoId('g'), nome: nome, emoji: emoji }; S.grupos.push(g); filtroGrupo = g.id; $('semdata-grupo').value = g.id; }
    var novo = !grupoEditando;
    limparGrupoForm(); salvar(); render();
    if (novo) { $('semdata-grupo').value = g.id; $('semdata-grupo').dataset.antes = g.id; $('semdata-txt').focus(); }
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
      var chave = 'meta:' + m.id, campo = campoEdicao(chave, m.texto, 90, function (v) { m.texto = v; }, render);
      if (campo) topo.appendChild(campo);
      else {
        var linha = document.createElement('div'); linha.className = 'meta-nome';
        var nome = document.createElement('strong'); nome.textContent = m.texto; linha.appendChild(nome);
        duploClique(nome, chave, m.texto, render);
        linha.appendChild(caneta(chave, m.texto, 'a meta ' + m.texto, render));
        topo.appendChild(linha);
      }
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


  // ---------- Opinião da Zumi e Meu mês com a Zumi ----------
  // A Zumi é a IA. O aparelho soma os números e escolhe o que está bem e o que pede atenção (opiniao.js);
  // a IA, no Worker (/zumi), só escreve o texto. Sem resposta, vale o texto pronto. Spec: specs/opiniao-da-zumi.md
  var Z = window.ZumiOpiniao;
  var CHAVE_ZUMI = 'rizzygo-rotina-zumi-v1'; // id aleatório só deste aparelho, para o limite de pedidos por dia
  var zumiOcupada = false, cardCanvas = null;
  function zumiId() {
    var id = null;
    try { id = localStorage.getItem(CHAVE_ZUMI); } catch (e) { }
    if (!id) { id = idNovo(); try { localStorage.setItem(CHAVE_ZUMI, id); } catch (e) { } }
    return id;
  }
  function paradasAgora() { return S.tarefas.filter(function (t) { return !t.feita && tarefaParada(t); }).length; }
  function pedirZumi(corpo) {
    var ctl = window.AbortController ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, 15000);
    return fetch(PUSH_API + '/zumi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) { if (t) clearTimeout(t); return j; });
  }
  function semanaPendente() {
    var hoje = chaveDia(), seg = Z.segunda(hoje);
    return S.criadoEm < seg && (!S.zumi.op || S.zumi.op.em < seg);
  }
  function mesPendente() {
    var hoje = chaveDia(), m = Z.mesAnterior(hoje);
    if (S.zumi.mes && S.zumi.mes.chave === m.chave) return null;
    if (+hoje.slice(8, 10) > 7) return null;
    return Z.resumo(S, m.dias).ativos >= 3 ? m : null;
  }
  function pedirOpiniao() {
    if (zumiOcupada) return;
    zumiOcupada = true; renderZumi();
    var hoje = chaveDia(), ks = Z.semana(hoje), r = Z.resumo(S, ks), ant = Z.resumo(S, Z.semanaAntes(hoje));
    var par = paradasAgora(), esc = Z.escolher(r, par), antes = ant.ativos ? ant : null;
    var pronto = Z.opiniaoRegras(r, antes, esc, par);
    pedirZumi({ id: zumiId(), tipo: 'semana', r: r, bem: esc.bem, melhorar: esc.melhorar, paradas: par, antes: antes ? antes.blocos : null }).then(function (j) {
      var ia = !!(j && Z.opiniaoValida(j, esc));
      S.zumi.op = { em: hoje, de: ks[0], ate: ks[6], t: ia ? { abertura: j.abertura, bem: j.bem || '', melhorar: j.melhorar, conselho: j.conselho } : pronto, esc: esc, ia: ia };
      zumiOcupada = false; salvar(); renderZumi(); falar('Pronto! Dei a minha opinião sobre a sua semana.', 'ideia');
    });
  }
  function itemZumi(cls, ic, titulo, texto) {
    var li = document.createElement('li'); li.className = cls;
    var i = document.createElement('span'); i.className = 'ic'; i.setAttribute('aria-hidden', 'true'); i.textContent = ic;
    var d = document.createElement('div'), b = document.createElement('b'), p = document.createElement('p');
    b.textContent = titulo; p.textContent = texto; d.appendChild(b); d.appendChild(p); li.appendChild(i); li.appendChild(d);
    return li;
  }
  function irAcao(a) {
    irPara(a.vai);
    if (a.alvo) setTimeout(function () { var c = $(a.alvo); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
    else if (a.vai === 'tarefas' && a.rotulo.indexOf('primeiro passo') >= 0) setTimeout(function () { var c = document.querySelector('#aba-tarefas .parada'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
  }
  function renderZumi() {
    if (!Z || !$('zumi-op')) return;
    var hoje = chaveDia(), op = S.zumi.op, corpo = $('zumi-op-corpo'), pedir = $('zumi-pedir');
    $('h-zumi-op').hidden = !semanaPendente();
    corpo.innerHTML = '';
    if (zumiOcupada) {
      var p = document.createElement('p'); p.className = 'fala zumi-pensando'; p.textContent = 'A Zumi está olhando a sua semana…'; corpo.appendChild(p);
    } else if (op) {
      $('zumi-op-quando').textContent = 'Sobre ' + dataCurta(op.de) + ' a ' + dataCurta(op.ate) + (op.em === hoje ? ', pedida hoje.' : ', pedida em ' + dataCurta(op.em) + '.');
      var fala = document.createElement('p'); fala.className = 'fala'; fala.textContent = op.t.abertura; corpo.appendChild(fala);
      var ul = document.createElement('ul'); ul.className = 'zumi-lista';
      if (op.t.bem) ul.appendChild(itemZumi('bem', '👍', 'O que está indo bem', op.t.bem));
      ul.appendChild(itemZumi('melhorar', '🔧', 'O que dá para melhorar', op.t.melhorar));
      ul.appendChild(itemZumi('conselho', '🌅', 'Meu conselho', op.t.conselho));
      corpo.appendChild(ul);
      var fecho = document.createElement('p'); fecho.className = 'zumi-fecho';
      fecho.appendChild(document.createTextNode(Z.FECHO)); fecho.appendChild(document.createElement('br'));
      var ass = document.createElement('b'); ass.textContent = Z.ASSINATURA; fecho.appendChild(ass); corpo.appendChild(fecho);
      var a = Z.acao(op.esc), bt = document.createElement('button');
      bt.type = 'button'; bt.className = 'btn btn-sec'; bt.id = 'zumi-acao'; bt.textContent = a.rotulo;
      bt.addEventListener('click', function () { irAcao(a); });
      var ac = document.createElement('div'); ac.className = 'zumi-acoes'; ac.appendChild(bt); corpo.appendChild(ac);
    }
    pedir.hidden = zumiOcupada || !!(op && op.em === hoje);
    pedir.textContent = op ? 'Pedir uma nova opinião' : 'Pedir a opinião da Zumi';
    // Meu mês
    var m = mesPendente(), feito = S.zumi.mes;
    $('h-zumi-mes').hidden = !m;
    if (m) $('h-zumi-mes-txt').textContent = '🐝 A Zumi pode fechar o seu ' + m.nome + '.';
    $('zumi-mes').hidden = !m && !feito;
    $('zumi-mes-fechar').hidden = !m || zumiOcupada;
    if (m) $('zumi-mes-fechar').textContent = 'Fechar meu ' + m.nome + ' com a Zumi';
    $('zumi-mes-txt').textContent = m ? 'O seu ' + m.nome + ' cabe num card. A Zumi junta os seus melhores números e escreve uma frase.' : feito ? 'O seu ' + feito.nome + ' com a Zumi. Baixe ou compartilhe.' : '';
    $('zumi-mes-card').hidden = !feito || !!m;
    if (feito && !m) desenharMes();
  }
  function fecharMes() {
    var m = mesPendente();
    if (!m || zumiOcupada) return;
    zumiOcupada = true; renderZumi();
    var r = Z.resumo(S, m.dias);
    pedirZumi({ id: zumiId(), tipo: 'mes', r: r, mes: m.nome, proximo: m.proximo }).then(function (j) {
      var ia = !!(j && Z.textoOk(j.frase, 240));
      var i = tituloAtual();
      S.zumi.mes = { chave: m.chave, nome: m.nome, numeros: Z.melhores(r), frase: ia ? j.frase : Z.fraseMes(r, m), titulo: VISUAL[i].ic + ' ' + TITULOS[i][1], ia: ia };
      zumiOcupada = false; salvar(); renderZumi(); falar('Seu ' + m.nome + ' está no card. Que mês!', 'comemorando', true);
    });
  }
  var cardDesenhado = '';
  function desenharMes() {
    var f = S.zumi.mes, comTitulo = $('zumi-card-titulo').checked, marca = JSON.stringify(f) + comTitulo;
    if (marca === cardDesenhado) return;
    cardDesenhado = marca;
    var img = new Image();
    img.src = '/zumi/abelha-comemorando-fundo-escuro.png';
    var fontes = document.fonts && document.fonts.load ? Promise.all(['800 112px Outfit', '700 44px Outfit', '600 38px Outfit', '400 48px "Atkinson Hyperlegible"'].map(function (x) { return document.fonts.load(x).catch(function () { }); })) : Promise.resolve();
    var carregou = new Promise(function (ok) { img.onload = ok; img.onerror = ok; });
    Promise.all([fontes, carregou]).then(function () {
      cardCanvas = cardCanvas || document.createElement('canvas');
      Z.desenharCard(cardCanvas, { mes: f.nome, numeros: f.numeros, titulo: comTitulo ? f.titulo : null, frase: f.frase }, img.naturalWidth ? img : null);
      $('zumi-card-img').src = cardCanvas.toDataURL('image/png');
      $('zumi-card-img').alt = 'Card: meu ' + f.nome + ' com a Zumi. ' + f.numeros.map(function (x) { return x.n + ' ' + x.rotulo; }).join(', ') + '. ' + f.frase;
    });
  }
  function arquivoCard() {
    return new Promise(function (ok) { cardCanvas.toBlob(function (b) { ok(new File([b], 'meu-' + S.zumi.mes.nome.replace('ç', 'c') + '-com-a-zumi.png', { type: 'image/png' })); }, 'image/png'); });
  }
  function baixarCard() {
    if (!cardCanvas) return;
    arquivoCard().then(function (f) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  }
  $('zumi-pedir').addEventListener('click', pedirOpiniao);
  $('h-zumi-op-ir').addEventListener('click', function () { irPara('evolucao'); if (semanaPendente()) pedirOpiniao(); });
  $('h-zumi-mes-ir').addEventListener('click', function () { irPara('evolucao'); setTimeout(function () { $('zumi-mes').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); fecharMes(); });
  $('zumi-mes-fechar').addEventListener('click', fecharMes);
  $('zumi-card-titulo').addEventListener('change', desenharMes);
  $('zumi-card-baixar').addEventListener('click', baixarCard);
  $('zumi-card-compartilhar').addEventListener('click', function () {
    if (!cardCanvas) return;
    arquivoCard().then(function (f) {
      var dados = { files: [f], title: 'Meu ' + S.zumi.mes.nome + ' com a Zumi', text: 'Meu ' + S.zumi.mes.nome + ' com a Zumi 🐝 ako.rizzygo.com.br/rotina' };
      if (navigator.canShare && navigator.canShare(dados)) navigator.share(dados).catch(function () { });
      else baixarCard();
    });
  });
  // "Como estou indo?" leva para a opinião, mesmo já estando na Evolução
  document.querySelectorAll('[data-zumi-ir]').forEach(function (l) {
    l.addEventListener('click', function () { if (abaDaUrl() === 'evolucao') window.scrollTo({ top: 0, behavior: 'instant' }); });
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
    if (a === 'ajustes') estadoPush();
    if (a === 'foco' && nuvem) nuvem.puxar(); // relógio de outro aparelho (no máximo uma leitura a cada 2 min)
    document.querySelectorAll('[data-ir]').forEach(function (l) { if (l.dataset.ir === a) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
    if (rolar) rolarParaAba(a); // trocou de aba (ou de parte das Tarefas): a tela vai para o começo do painel
  }
  // Leva o começo do painel da aba para logo abaixo do que fica preso no topo (o cabeçalho e, no computador, o menu de abas).
  function rolarParaAba(a) {
    var el = document.getElementById('aba-' + a);
    if (!el || a === 'hoje' || a === 'evolucao') { window.scrollTo({ top: 0, behavior: 'instant' }); return; } // Hoje e Evolução voltam ao topo, onde ficam a Zumi e a matriz
    var preso = 0;
    ['.topo', '.abas-app'].forEach(function (sel) {
      var x = document.querySelector(sel);
      if (!x) return;
      var cs = getComputedStyle(x), r = x.getBoundingClientRect();
      if (cs.position === 'sticky') preso = Math.max(preso, parseFloat(cs.top) + r.height);
    });
    var y = el.getBoundingClientRect().top + window.scrollY - preso - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  }
  function irPara(a) { location.hash = a === 'hoje' ? '#/' : '#/' + a; }
  window.addEventListener('hashchange', function () { mostrarAba(true); });
  mostrarAba(false);

  // ---------- Relógio central ----------
  var ultimoDia = chaveDia();
  function tick() {
    // Até duas voltas: o app fechado pode ter perdido o fim do foco e também o da pausa.
    for (var i = 0; i < 2 && S.timer.rodando && Date.now() >= S.timer.fimEm; i++) concluir(false, S.timer.fimEm);
    checarLembretes();
    renderTimer();
    if (S.semTelaAtivo && Date.now() >= S.semTelaAtivo.fimEm) concluirTela(S.semTelaAtivo.min);
    if (chaveDia() !== ultimoDia) { ultimoDia = chaveDia(); var r = fecharDias(); podar(); salvar(); render(); falar(saudacao(), 'ola'); avisarFechamento(r); }
  }
  var lento = 0;
  setInterval(function () { tick(); if (++lento % 30 === 0) { salvar(); renderLembretes(); if (ultimoSt) mostrarNuvem(ultimoSt); } }, 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { releSeMudou(); tick(); render(); if (nuvem) nuvem.puxar(); } else { salvar(); if (nuvem) nuvem.agora(); }
  });
  // Outra aba (ou o atalho na tela inicial) gravou a rotina: esta mostra na hora.
  window.addEventListener('storage', function (e) { if (e.key === CHAVE) releSeMudou(); });
  window.addEventListener('focus', releSeMudou);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { releSeMudou(); render(); } });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/rotina/sw.js', { scope: '/rotina/' }).then(function (r) { registro = r; return navigator.serviceWorker.ready; }).then(function (r) {
      registro = r;
      if (push.on) enviarAgenda(true).catch(function () {}); // renova a assinatura e a agenda a cada abertura
    }).catch(function () {});
    // Toque na notificação do push com o app já aberto: mostra o aviso para marcar Feito.
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.lembrete && lembreteInfo(e.data.lembrete)) disparar(e.data.lembrete); });
  }
  // Toque na notificação do push com o app fechado: abre em /rotina/?lem=<chave>.
  var lemUrl = new URLSearchParams(location.search).get('lem');
  if (lemUrl) { history.replaceState(null, '', location.pathname + location.hash); setTimeout(function () { if (lembreteInfo(lemUrl)) disparar(lemUrl); }, 600); }

  gravado = textoGuardado();
  var fechamento = fecharDias();
  podar(); dia(); salvar();
  falar(saudacao(), S.timer.rodando ? 'estudando' : 'ola');
  avisarFechamento(fechamento);
  if (S.semTelaAtivo) { if (Date.now() >= S.semTelaAtivo.fimEm) concluirTela(S.semTelaAtivo.min); else contarTela(); }
  estadoNotif(); renderMeus(); render(); renderTimer();
})();
