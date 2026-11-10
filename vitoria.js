// Som de vitória do Ako: a Zumi passa zumbindo e uma fanfarra curta de sinos toca.
// Feito na hora com Web Audio, sem arquivo de áudio. Quem chama decide se o som está ligado:
// a Rotina usa o próprio Ajuste; Trilhas e Mapas usam AkoVitoria.ligado() (chave no localStorage).
(function () {
  var CHAVE = 'ako-som-vitoria';
  var ctxProprio = null, ultima = 0;

  function ligado() { try { return localStorage.getItem(CHAVE) !== 'nao'; } catch (e) { return true; } }
  function ligar(sim) { try { localStorage.setItem(CHAVE, sim ? 'sim' : 'nao'); } catch (e) { /* modo privado */ } }

  function contexto(ctx) {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctxProprio = ctxProprio || new AC();
    return ctxProprio;
  }

  // A Zumi passa voando: zumbido que sobe, com vibrato de asa, e cruza da esquerda para a direita.
  function voo(ctx, saida, t, dur, de, ate) {
    var o = ctx.createOscillator(), lfo = ctx.createOscillator(), prof = ctx.createGain();
    var asa = ctx.createOscillator(), asaG = ctx.createGain(), amp = ctx.createGain();
    var f = ctx.createBiquadFilter(), g = ctx.createGain(), fim = g;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(de, t); o.frequency.exponentialRampToValueAtTime(ate, t + dur);
    lfo.frequency.value = 12; prof.gain.value = 10; lfo.connect(prof); prof.connect(o.frequency);
    asa.frequency.value = 26; asaG.gain.value = 0.3; asa.connect(asaG); asaG.connect(amp.gain); amp.gain.value = 0.7;
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1500, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.setValueAtTime(-0.7, t); p.pan.linearRampToValueAtTime(0.7, t + dur);
      g.connect(p); fim = p;
    }
    o.connect(f); f.connect(amp); amp.connect(g); fim.connect(saida);
    [o, lfo, asa].forEach(function (x) { x.start(t); x.stop(t + dur + 0.05); });
  }

  // Nota de sino: fundamental e harmônicos que somem em tempos diferentes.
  function sino(ctx, saida, t, freq, forca, dur) {
    dur = dur || 1.2;
    [[1, 1, 1], [2, 0.45, 0.7], [3, 0.2, 0.45], [4.2, 0.1, 0.3]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(), v = 0.2 * p[1] * forca;
      o.type = p[0] === 1 ? 'triangle' : 'sine'; o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * p[2]);
      o.connect(g); g.connect(saida); o.start(t); o.stop(t + dur * p[2] + 0.05);
    });
  }

  // forte: conquista grande (título novo, meta do ano, trilha completa). Fanfarra mais longa.
  // ctx: um AudioContext já liberado pela página (opcional).
  function tocar(forte, ctx) {
    var agora = Date.now();
    if (agora - ultima < 1500) return; // duas vitórias no mesmo clique tocam uma vez só
    ultima = agora;
    try {
      ctx = contexto(ctx);
      if (!ctx) return;
      if (ctx.state === 'suspended') { var r = ctx.resume(); if (r && r.catch) r.catch(function () { }); }
      var saida = ctx.createDynamicsCompressor();
      saida.threshold.value = -14; saida.ratio.value = 4;
      saida.connect(ctx.destination);
      var t = ctx.currentTime + 0.05;
      voo(ctx, saida, t, 0.6, 190, 330);
      var n = t + 0.42;
      // arpejo de dó maior subindo: sol, dó, mi, sol
      [784, 1046.5, 1318.5, 1568].forEach(function (f, i) { sino(ctx, saida, n + i * 0.09, f, 0.75, 0.6); });
      var acorde = n + 0.4;
      if (forte) {
        [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { sino(ctx, saida, acorde + i * 0.07, f, 0.6, 0.5); });
        acorde += 0.38;
      }
      // acorde final que fica soando
      [1046.5, 1318.5, 1568].forEach(function (f) { sino(ctx, saida, acorde, f, 0.55, forte ? 2.2 : 1.6); });
      sino(ctx, saida, acorde, 523.25, 0.5, forte ? 2.2 : 1.6);
      if (forte) voo(ctx, saida, acorde + 0.1, 0.5, 260, 420);
    } catch (e) { /* sem áudio */ }
  }

  // Atalho para Trilhas e Mapas: toca só se a pessoa não desligou.
  function comemorar(forte) { if (ligado()) tocar(forte); }

  window.AkoVitoria = { tocar: tocar, comemorar: comemorar, ligado: ligado, ligar: ligar };
})();
