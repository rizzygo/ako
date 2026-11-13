// Opinião da Zumi e Meu mês com a Zumi: contas e textos prontos, sem tocar na tela.
// Roda no navegador (window.ZumiOpiniao) e no Node (require), para o teste em rotina/testes/opiniao.test.js.
// A IA só reescreve os textos: os números e as escolhas saem daqui, no aparelho. Spec: specs/opiniao-da-zumi.md
(function (raiz) {
  'use strict';

  var FECHO = 'Estou com você. Espero que continue assim, muito mel pra você!';
  var ASSINATURA = 'Tmj! Zumi 🐝';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function chave(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function data(k) { var p = k.split('-'); return new Date(+p[0], p[1] - 1, +p[2], 12); }
  function somar(k, n) { var d = data(k); d.setDate(d.getDate() + n); return chave(d); }
  function lista(ini, n) { var r = []; for (var i = 0; i < n; i++) r.push(somar(ini, i)); return r; }

  // Os 7 dias até ontem. Na segunda-feira, é a semana que passou, de segunda a domingo.
  function semana(hoje) { return lista(somar(hoje, -7), 7); }
  function semanaAntes(hoje) { return lista(somar(hoje, -14), 7); }
  // Segunda-feira desta semana (para saber se a opinião da semana já saiu)
  function segunda(hoje) { var d = data(hoje); return somar(hoje, -((d.getDay() + 6) % 7)); }
  // Mês anterior ao de hoje: chave 'AAAA-MM', dias e nomes
  function mesAnterior(hoje) {
    var d = data(hoje), ini = new Date(d.getFullYear(), d.getMonth() - 1, 1, 12), n = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
    return { chave: chave(ini).slice(0, 7), dias: lista(chave(ini), n), nome: MESES[ini.getMonth()], proximo: MESES[d.getMonth()] };
  }

  function nivelAgua(d) {
    if (d.aguaNivel) return d.aguaNivel;
    if (d.agua > 0) { var r = d.agua / (d.metaAgua || 8); return r >= 1 ? 'excelente' : r >= 0.6 ? 'bom' : 'ruim'; }
    return null;
  }

  // Números somados de um período. Só contagens: nada de texto, nome de tarefa, lembrete ou humor.
  function resumo(S, dias) {
    var r = { dias: dias.length, ativos: 0, blocos: 0, focoMin: 0, lazerMin: 0, aguaBoa: 0, respirar: 0, semTelaMin: 0, pausaDias: 0, treinos: 0, reflexoes: 0, feitas: 0 };
    dias.forEach(function (k) {
      var d = S.dias && S.dias[k];
      var ref = d ? !!(d.reflexao || d.papel || d.refOculta || d.humor) : !!(S.diario && S.diario[k]);
      if (ref) r.reflexoes++;
      if (!d) { if (ref) r.ativos++; return; }
      var b = d.blocos || {}, m = d.minutos || {};
      var blocos = (b.trabalho || 0) + (b.estudo || 0) + (b.lazer || 0);
      var treinos = Object.keys(d.ex || {}).filter(function (x) { return d.ex[x]; }).length;
      var tela = d.semTelaMin || 0, resp = d.respirar || 0, feitas = Object.keys(d.feitas || {}).length;
      var agua = nivelAgua(d);
      r.blocos += blocos;
      r.focoMin += (m.trabalho || 0) + (m.estudo || 0);
      r.lazerMin += m.lazer || 0;
      if (agua === 'bom' || agua === 'excelente') r.aguaBoa++;
      r.respirar += resp; r.semTelaMin += tela;
      if (resp || tela) r.pausaDias++;
      r.treinos += treinos; r.feitas += feitas;
      if (blocos || agua || resp || tela || treinos || feitas || ref) r.ativos++;
    });
    return r;
  }

  // O que vale uma semana boa em cada parte. A razão (feito ÷ meta) escolhe o ponto forte e o que pede atenção.
  var METAS = { foco: ['blocos', 10], agua: ['aguaBoa', 5], corpo: ['treinos', 3], pausa: ['pausaDias', 5], reflexao: ['reflexoes', 5], tarefas: ['feitas', 7] };
  var ORDEM = ['foco', 'agua', 'corpo', 'pausa', 'reflexao', 'tarefas'];

  function escolher(r, paradas) {
    if (!r.ativos) return { bem: null, melhorar: 'recomeco' };
    var razao = function (c) { var m = METAS[c]; return r[m[0]] / m[1]; };
    var bem = null;
    ORDEM.forEach(function (c) { if (r[METAS[c][0]] > 0 && (!bem || razao(c) > razao(bem))) bem = c; });
    if (paradas >= 2) return { bem: bem, melhorar: 'paradas' };
    var pior = null;
    ORDEM.forEach(function (c) { if (c !== bem && (!pior || razao(c) < razao(pior))) pior = c; });
    return { bem: bem, melhorar: pior };
  }

  function horas(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + 'h' + (m ? String(m).padStart(2, '0') : '') : m + ' min'; }
  function vezes(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  // Textos prontos: valem quando a IA não responde e servem de exemplo para ela.
  var CATS = {
    foco: {
      bem: function (r) { return vezes(r.blocos, 'bloco', 'blocos') + ' de foco, ' + horas(r.focoMin) + ' de trabalho e estudo.'; },
      melhorar: function (r) { return r.blocos ? 'Só ' + vezes(r.blocos, 'bloco', 'blocos') + ' de foco na semana.' : 'Nenhum bloco de foco na semana.'; },
      conselho: 'Escolha um horário fixo e faça um bloco só. Começar é a parte difícil.',
      acao: { rotulo: 'Começar um bloco agora', vai: 'foco' }
    },
    agua: {
      bem: function (r) { return 'Água em Bom ou Excelente em ' + r.aguaBoa + ' dos ' + r.dias + ' dias.'; },
      melhorar: function (r) { return r.aguaBoa ? 'Água boa em só ' + r.aguaBoa + ' dos ' + r.dias + ' dias.' : 'A água não foi marcada como boa em nenhum dia.'; },
      conselho: 'Deixe uma garrafa à vista e marque a água no fim do dia.',
      acao: { rotulo: 'Marcar a água de hoje', vai: 'hoje', alvo: 'h-agua' }
    },
    corpo: {
      bem: function (r) { return vezes(r.treinos, 'treino', 'treinos') + ' na semana. Seu corpo agradece.'; },
      melhorar: function (r) { return r.treinos ? 'Só ' + vezes(r.treinos, 'treino', 'treinos') + ' na semana.' : 'Nenhum treino marcado na semana.'; },
      conselho: 'Escolha dois dias desta semana para um treino curto, nem que seja uma caminhada.',
      acao: { rotulo: 'Marcar um treino', vai: 'bem-estar' }
    },
    pausa: {
      bem: function (r) { return 'Pausas em ' + r.pausaDias + ' dias: ' + vezes(r.respirar, 'respiração', 'respirações') + ' e ' + horas(r.semTelaMin) + ' sem tela.'; },
      melhorar: function (r) { return r.pausaDias ? 'Pausa em só ' + vezes(r.pausaDias, 'dia', 'dias') + ' da semana.' : 'Nenhuma pausa marcada na semana.'; },
      conselho: 'Entre um bloco e outro, respire 1 minuto. Sua cabeça descansa e o foco volta.',
      acao: { rotulo: 'Respirar 1 minuto', vai: 'bem-estar' }
    },
    reflexao: {
      bem: function (r) { return 'Você fechou ' + vezes(r.reflexoes, 'dia', 'dias') + ' com o "Como foi seu dia?".'; },
      melhorar: function (r) { return r.reflexoes ? 'Só ' + vezes(r.reflexoes, 'dia fechado', 'dias fechados') + ' com o "Como foi seu dia?".' : 'Nenhum dia fechado com o "Como foi seu dia?".'; },
      conselho: 'Antes de dormir, escolha uma carinha. Leva 10 segundos.',
      acao: { rotulo: 'Fechar o dia de hoje', vai: 'hoje', alvo: 'fim-do-dia' }
    },
    tarefas: {
      bem: function (r) { return vezes(r.feitas, 'tarefa feita', 'tarefas feitas') + ' entre tarefas e rotinas.'; },
      melhorar: function (r) { return r.feitas ? 'Só ' + vezes(r.feitas, 'tarefa feita', 'tarefas feitas') + ' na semana.' : 'Nenhuma tarefa marcada como feita.'; },
      conselho: 'Deixe só 3 prioridades para amanhã. Lista curta é lista feita.',
      acao: { rotulo: 'Ver minhas tarefas', vai: 'tarefas' }
    },
    paradas: {
      melhorar: function (r, p) { return vezes(p, 'tarefa está parada', 'tarefas estão paradas') + ' há 3 dias ou mais.'; },
      conselho: 'Escolha uma delas e faça só o primeiro passo hoje.',
      acao: { rotulo: 'Fazer o primeiro passo agora', vai: 'tarefas' }
    },
    recomeco: {
      melhorar: function () { return 'A semana passou sem registros. Acontece com todo mundo.'; },
      conselho: 'Comece pequeno: um bloco de foco ou só marcar a água de hoje.',
      acao: { rotulo: 'Começar um bloco agora', vai: 'foco' }
    }
  };

  function abertura(r, ant) {
    if (!r.ativos) return 'Semana pesada acontece. Vamos recomeçar, um passo de cada vez.';
    if (ant && r.blocos > ant.blocos) return 'Sua semana teve ' + vezes(r.blocos, 'bloco', 'blocos') + ' de foco, ' + (r.blocos - ant.blocos) + ' a mais que a anterior. Isso é ritmo de colmeia!';
    if (r.ativos >= 5) return 'Você apareceu em ' + r.ativos + ' dos ' + r.dias + ' dias. Isso é constância!';
    return 'Você marcou a Rotina em ' + vezes(r.ativos, 'dia', 'dias') + ' da semana. Cada dia conta.';
  }

  // Opinião completa só com regras (sem IA)
  function opiniaoRegras(r, ant, esc, paradas) {
    var m = CATS[esc.melhorar];
    return {
      abertura: abertura(r, ant),
      bem: esc.bem ? CATS[esc.bem].bem(r) : '',
      melhorar: m.melhorar(r, paradas),
      conselho: m.conselho
    };
  }
  function acao(esc) { return CATS[esc.melhorar].acao; }

  // Texto da IA vale só se cada parte veio, é curta e não traz link nem marcação.
  function textoOk(t, max) { return typeof t === 'string' && t.trim().length >= 8 && t.length <= max && !/[<>]|https?:|www\./i.test(t); }
  function opiniaoValida(o, esc) {
    if (!o || !textoOk(o.abertura, 240) || !textoOk(o.melhorar, 240) || !textoOk(o.conselho, 240)) return false;
    if (esc.bem && !textoOk(o.bem, 240)) return false;
    return true;
  }

  // Card do mês: os 4 primeiros números diferentes de zero, nesta ordem de importância
  var CARD = [['blocos', 'blocos de foco', 'bloco de foco'], ['aguaBoa', 'dias de água boa', 'dia de água boa'], ['treinos', 'treinos', 'treino'],
    ['feitas', 'tarefas feitas', 'tarefa feita'], ['ativos', 'dias ativos', 'dia ativo'], ['semTelaMin', 'min sem tela', 'min sem tela'],
    ['respirar', 'respirações', 'respiração'], ['reflexoes', 'dias com reflexão', 'dia com reflexão']];
  function melhores(r) {
    return CARD.filter(function (c) { return r[c[0]] > 0; }).slice(0, 4).map(function (c) { return { n: r[c[0]], rotulo: r[c[0]] === 1 ? c[2] : c[1] }; });
  }
  function fraseMes(r, mes) {
    return 'Você marcou a Rotina em ' + r.ativos + ' dos ' + r.dias + ' dias de ' + mes.nome + '. Leve esse ritmo para ' + mes.proximo + '.';
  }

  // ---------- Card em imagem (só no navegador) ----------
  function hexagono(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i + Math.PI / 6; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath();
  }
  function quebrar(ctx, texto, largura) {
    var linhas = [], atual = '';
    texto.split(' ').forEach(function (p) {
      var teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width > largura && atual) { linhas.push(atual); atual = p; } else atual = teste;
    });
    if (atual) linhas.push(atual);
    return linhas;
  }
  function arredondado(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Desenha o card 1080x1350. dados = { mes, numeros: [{n, rotulo}], titulo (ou null), frase }; zumi = imagem já carregada
  function desenharCard(canvas, dados, zumi) {
    var W = 1080, H = 1350, M = 84, ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    var TIT = 'Outfit, "Avenir Next", system-ui, sans-serif', TXT = '"Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillStyle = '#0B1B3A'; ctx.fillRect(0, 0, W, H);
    // favo bem leve no fundo
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(245,165,36,.07)';
    for (var row = 0; row < 14; row++) for (var col = 0; col < 12; col++) { hexagono(ctx, col * 104 + (row % 2) * 52, row * 90 + 40, 56); ctx.stroke(); }
    ctx.fillStyle = '#FFFFFF'; ctx.font = '800 112px ' + TIT; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Meu', M, 200); ctx.fillText(dados.mes, M, 316);
    ctx.fillStyle = '#F5A524'; ctx.font = '600 50px ' + TIT; ctx.fillText('com a Zumi', M, 388);
    if (zumi) ctx.drawImage(zumi, W - M - 300 + 30, 70, 300, 300);
    var gw = (W - 2 * M - 24) / 2, gh = 190, gy = 424;
    dados.numeros.forEach(function (x, i) {
      var cx = M + (i % 2) * (gw + 24), cy = gy + Math.floor(i / 2) * (gh + 24);
      arredondado(ctx, cx, cy, gw, gh, 36); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#F5A524'; ctx.font = '800 100px ' + TIT; ctx.fillText(String(x.n), cx + 40, cy + 112);
      ctx.fillStyle = '#E8ECF6'; ctx.font = '400 38px ' + TXT; ctx.fillText(x.rotulo, cx + 40, cy + 160);
    });
    var y = gy + Math.ceil(dados.numeros.length / 2) * (gh + 24) + 8;
    if (dados.titulo) {
      ctx.font = '700 44px ' + TIT; var tw = ctx.measureText(dados.titulo).width + 72;
      arredondado(ctx, M, y, tw, 84, 42); ctx.fillStyle = '#F5A524'; ctx.fill();
      ctx.fillStyle = '#0B1B3A'; ctx.fillText(dados.titulo, M + 36, y + 57); y += 84;
    }
    // a frase fica logo acima do rodapé; se for longa, a letra diminui até caber
    var tam = 46, lh, linhas, ly;
    do {
      ctx.font = '400 ' + tam + 'px ' + TXT; lh = Math.round(tam * 1.32);
      linhas = quebrar(ctx, 'Zumi: ' + dados.frase, W - 2 * M);
      ly = H - 168 - (linhas.length - 1) * lh;
      tam -= 2;
    } while (ly < y + tam + 24 && tam > 30);
    linhas.forEach(function (l, i) {
      if (i === 0) {
        var fonte = ctx.font; ctx.font = '700 ' + (tam + 2) + 'px ' + TIT; ctx.fillStyle = '#F5A524'; ctx.fillText('Zumi:', M, ly);
        var w = ctx.measureText('Zumi: ').width; ctx.font = fonte; ctx.fillStyle = '#FFFFFF'; ctx.fillText(l.slice(6), M + w, ly);
      } else { ctx.fillStyle = '#FFFFFF'; ctx.fillText(l, M, ly + i * lh); }
    });
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(M, H - 122, W - 2 * M, 2);
    ctx.font = '700 38px ' + TIT; ctx.fillStyle = '#FFFFFF'; ctx.fillText('Rotina', M, H - 62);
    var rw = ctx.measureText('Rotina ').width; ctx.font = '600 38px ' + TIT; ctx.fillStyle = '#A9B4CF'; ctx.fillText('da Rizzygo Ako', M + rw, H - 62);
    ctx.textAlign = 'right'; ctx.fillText('ako.rizzygo.com.br/rotina', W - M, H - 62); ctx.textAlign = 'left';
  }

  var api = {
    FECHO: FECHO, ASSINATURA: ASSINATURA, MESES: MESES, CATS: CATS,
    chave: chave, somar: somar, semana: semana, semanaAntes: semanaAntes, segunda: segunda, mesAnterior: mesAnterior,
    resumo: resumo, escolher: escolher, opiniaoRegras: opiniaoRegras, acao: acao, opiniaoValida: opiniaoValida, textoOk: textoOk,
    melhores: melhores, fraseMes: fraseMes, desenharCard: desenharCard
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.ZumiOpiniao = api;
})(this);
