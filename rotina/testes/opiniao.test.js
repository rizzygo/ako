// Testa as contas e os textos prontos da opinião da Zumi (rotina/opiniao.js), sem navegador.
// Uso: node rotina/testes/opiniao.test.js
'use strict';
const assert = require('assert/strict');
const Z = require('../opiniao.js');

let ok = 0;
const caso = (n, f) => { f(); ok++; console.log('ok   ' + n); };

// Semana de exemplo: segunda 16/11/2026, a semana que passou vai de 09/11 a 15/11.
const dia = (o) => Object.assign({ blocos: { trabalho: 0, estudo: 0, lazer: 0 }, minutos: { trabalho: 0, estudo: 0, lazer: 0 }, agua: 0, respirar: 0, semTela: 0, ex: {}, feitas: {} }, o);
const S = {
  dias: {
    '2026-11-02': dia({ blocos: { trabalho: 1, estudo: 1, lazer: 0 } }),
    '2026-11-09': dia({ blocos: { trabalho: 2, estudo: 1, lazer: 0 }, minutos: { trabalho: 100, estudo: 25, lazer: 0 }, aguaNivel: 'bom', feitas: { t1: 3 } }),
    '2026-11-10': dia({ blocos: { trabalho: 0, estudo: 2, lazer: 1 }, minutos: { trabalho: 0, estudo: 50, lazer: 60 }, aguaNivel: 'excelente', respirar: 2, ex: { corrida: true } }),
    '2026-11-11': dia({ aguaNivel: 'ruim', reflexao: 'texto que não sai daqui', humor: 4 }),
    '2026-11-12': dia({ semTelaMin: 30, feitas: { t2: 3, t3: 5 } }),
    '2026-11-16': dia({ blocos: { trabalho: 5, estudo: 0, lazer: 0 } }) // hoje: fica fora
  },
  diario: { '2026-11-13': { humor: 3, texto: 'antigo' } }
};

caso('a semana são os 7 dias até ontem; na segunda, de segunda a domingo', () => {
  assert.deepEqual(Z.semana('2026-11-16'), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  assert.equal(Z.segunda('2026-11-19'), '2026-11-16');
  assert.equal(Z.segunda('2026-11-16'), '2026-11-16');
});

caso('resumo soma só números e conta reflexão sem levar o texto', () => {
  const r = Z.resumo(S, Z.semana('2026-11-16'));
  assert.deepEqual(r, { dias: 7, ativos: 5, blocos: 6, focoMin: 175, lazerMin: 60, aguaBoa: 2, respirar: 2, semTelaMin: 30, pausaDias: 2, treinos: 1, reflexoes: 2, feitas: 3 });
  assert.ok(!JSON.stringify(r).includes('texto'));
});

caso('escolhe o ponto forte e o que pede atenção; tarefas paradas têm prioridade', () => {
  const r = Z.resumo(S, Z.semana('2026-11-16'));
  assert.deepEqual(Z.escolher(r, 0), { bem: 'foco', melhorar: 'corpo' });
  assert.equal(Z.escolher(r, 3).melhorar, 'paradas');
  assert.deepEqual(Z.escolher(Z.resumo({ dias: {} }, Z.semana('2026-11-16')), 0), { bem: null, melhorar: 'recomeco' });
});

caso('texto pronto compara com a semana anterior e traz a ação certa', () => {
  const r = Z.resumo(S, Z.semana('2026-11-16')), ant = Z.resumo(S, Z.semanaAntes('2026-11-16'));
  const o = Z.opiniaoRegras(r, ant, { bem: 'foco', melhorar: 'paradas' }, 3);
  assert.match(o.abertura, /6 blocos de foco, 4 a mais/);
  assert.match(o.bem, /6 blocos de foco, 2h55 de trabalho e estudo/);
  assert.match(o.melhorar, /3 tarefas estão paradas/);
  assert.equal(Z.acao({ melhorar: 'paradas' }).rotulo, 'Fazer o primeiro passo agora');
  assert.ok(Z.opiniaoValida(o, { bem: 'foco' }));
});

caso('resposta da IA com link, marcação ou parte faltando não vale', () => {
  const bom = { abertura: 'Semana boa de foco!', bem: 'Seis blocos de foco.', melhorar: 'Três tarefas paradas.', conselho: 'Faça o primeiro passo de uma.' };
  assert.ok(Z.opiniaoValida(bom, { bem: 'foco' }));
  assert.ok(!Z.opiniaoValida(Object.assign({}, bom, { conselho: 'veja https://x.com' }), { bem: 'foco' }));
  assert.ok(!Z.opiniaoValida(Object.assign({}, bom, { bem: '' }), { bem: 'foco' }));
  assert.ok(Z.opiniaoValida(Object.assign({}, bom, { bem: '' }), { bem: null }));
  assert.ok(!Z.opiniaoValida(Object.assign({}, bom, { abertura: '<b>oi</b> tudo bem?' }), { bem: null }));
});

caso('mês anterior e card com os 4 primeiros números diferentes de zero', () => {
  const m = Z.mesAnterior('2026-12-01');
  assert.equal(m.chave, '2026-11'); assert.equal(m.dias.length, 30); assert.equal(m.nome, 'novembro'); assert.equal(m.proximo, 'dezembro');
  assert.equal(Z.mesAnterior('2027-01-03').chave, '2026-12');
  const r = Z.resumo(S, m.dias);
  assert.deepEqual(Z.melhores(r).map(x => x.rotulo), ['blocos de foco', 'dias de água boa', 'treino', 'tarefas feitas']);
  assert.match(Z.fraseMes(r, m), /em 7 dos 30 dias de novembro\. Leve esse ritmo para dezembro\./);
});

console.log(`\nOpinião da Zumi ok (${ok} casos).`);
