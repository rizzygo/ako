// Testa o Worker inteiro com um D1 de mentira (SQLite do Node) e o fetch do push interceptado.
// Uso: node push/testes/worker.test.mjs   (Node 22+)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodeCrypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker.mjs';
import { b64u } from '../webpush.mjs';

// D1 mínimo: prepare().bind().first()/all()/run()
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const DB = { prepare(sql) { let args = []; const st = { bind(...a) { args = a; return st; }, async first() { return db.prepare(sql).get(...args) || null; }, async all() { return { results: db.prepare(sql).all(...args) }; }, async run() { db.prepare(sql).run(...args); return {}; } }; return st; } };

const vapid = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' });
const env = { DB, VAPID_PUBLIC: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(vapid.x, 'base64url'), Buffer.from(vapid.y, 'base64url')])), VAPID_PRIVATE: vapid.d };

const enviados = [];
globalThis.fetch = async (url, op) => { enviados.push({ url, op }); return new Response(null, { status: 201 }); };

const ORIGEM = 'https://ako.rizzygo.com.br';
const pedir = (caminho, corpo, origem = ORIGEM) => worker.fetch(new Request('https://rotina-push.rizzygo.com.br' + caminho, { method: corpo ? 'POST' : 'GET', headers: { Origin: origem, 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }), env);
const rodar = () => new Promise(fim => worker.scheduled({}, env, { waitUntil: p => p.then(fim) }));
let ok = 0; const caso = async (n, f) => { await f(); ok++; console.log('ok   ' + n); };

const ua = nodeCrypto.createECDH('prime256v1'); ua.generateKeys();
const id = b64u(nodeCrypto.randomBytes(16));
const agora = Date.now();
const aparelho = {
  id, fuso: 'America/Sao_Paulo',
  assinatura: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(nodeCrypto.randomBytes(16)) } },
  agenda: { inicio: '00:00', fim: '23:59', adiados: {}, lembretes: [{ k: 'agua', tipo: 'intervalo', min: 45, prox: agora - 1000 }] }
};

await caso('GET /chave devolve a chave pública com CORS', async () => {
  const r = await pedir('/chave');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).chave, env.VAPID_PUBLIC);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEM);
});
await caso('origem desconhecida é recusada', async () => {
  assert.equal((await pedir('/aparelho', aparelho, 'https://outro.site')).status, 403);
});
await caso('prévia do Pages é aceita', async () => {
  assert.equal((await pedir('/aparelho', aparelho, 'https://feat-x.ako-7vx.pages.dev')).status, 200);
});
await caso('dados ruins dão 400', async () => {
  assert.equal((await pedir('/aparelho', { ...aparelho, fuso: 'Lua/Base' })).status, 400);
  assert.equal((await pedir('/aparelho', { ...aparelho, id: 'curto' })).status, 400);
});
await caso('cron manda o push vencido, cifrado e assinado', async () => {
  await rodar();
  assert.equal(enviados.length, 1);
  const h = enviados[0].op.headers;
  assert.equal(enviados[0].url, aparelho.assinatura.endpoint);
  assert.match(h.Authorization, /^vapid t=.+\..+\..+, k=/);
  assert.equal(h['Content-Encoding'], 'aes128gcm');
  const est = JSON.parse(db.prepare('SELECT estado FROM aparelhos').get().estado);
  assert.ok(est.prox.agua > agora);
});
await caso('no minuto seguinte não repete', async () => {
  await rodar();
  assert.equal(enviados.length, 1);
});
await caso('adiar pela notificação agenda e o cron manda depois', async () => {
  assert.equal((await pedir('/adiar', { id, k: 'agua', em: Date.now() + 50 })).status, 200);
  await new Promise(r => setTimeout(r, 80));
  await rodar();
  assert.equal(enviados.length, 2);
});
await caso('assinatura morta (410) apaga o aparelho', async () => {
  globalThis.fetch = async () => new Response(null, { status: 410 });
  await pedir('/adiar', { id, k: 'agua', em: Date.now() + 10 });
  await new Promise(r => setTimeout(r, 30));
  await rodar();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM aparelhos').get().n, 0);
});
await caso('remover apaga o aparelho', async () => {
  await pedir('/aparelho', aparelho);
  assert.equal((await pedir('/remover', { id })).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM aparelhos').get().n, 0);
});

// ---------- IA da Zumi (/zumi) ----------
const resumo = { dias: 7, ativos: 5, blocos: 9, focoMin: 300, lazerMin: 60, aguaBoa: 5, respirar: 4, semTelaMin: 45, pausaDias: 3, treinos: 2, reflexoes: 4, feitas: 12 };
const semana = { id, tipo: 'semana', r: resumo, bem: 'agua', melhorar: 'paradas', paradas: 3, antes: 5 };
let pedidosIA = [];
const respostaOk = { abertura: 'Sua semana teve 9 blocos de foco, 4 a mais que a anterior.', bem: 'Água boa em 5 dos 7 dias. Lindo de ver!', melhorar: 'Tem 3 tarefas paradas há alguns dias.', conselho: 'Escolha uma e faça só o primeiro passo amanhã cedo.' };
env.AI = { run: async (modelo, entrada) => { pedidosIA.push({ modelo, entrada }); return { response: 'Claro! ' + JSON.stringify(respostaOk) }; } };

await caso('/zumi devolve a opinião da IA e manda só números ao modelo', async () => {
  const r = await pedir('/zumi', semana);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), respostaOk);
  const texto = JSON.stringify(pedidosIA[0].entrada);
  assert.match(texto, /blocos de foco: 9/);
  assert.match(texto, /tarefas paradas há 3 dias ou mais: 3/);
});
await caso('/zumi recusa número fora do formato e categoria desconhecida', async () => {
  assert.equal((await pedir('/zumi', { ...semana, r: { ...resumo, blocos: 'nove' } })).status, 400);
  assert.equal((await pedir('/zumi', { ...semana, melhorar: 'remedio' })).status, 400);
  assert.equal((await pedir('/zumi', { ...semana, r: { ...resumo, texto: 'oi' } })).status, 200); // campo a mais é ignorado
});
await caso('/zumi recusa resposta da IA com link ou faltando parte', async () => {
  env.AI = { run: async () => ({ response: JSON.stringify({ ...respostaOk, conselho: 'Veja em https://exemplo.com' }) }) };
  assert.equal((await pedir('/zumi', { ...semana, id: b64u(nodeCrypto.randomBytes(16)) })).status, 502);
  env.AI = { run: async () => ({ response: 'não sei' }) };
  assert.equal((await pedir('/zumi', { ...semana, id: b64u(nodeCrypto.randomBytes(16)) })).status, 502);
});
await caso('/zumi do mês devolve a frase', async () => {
  env.AI = { run: async () => ({ response: { frase: 'Novembro teve 22 dias de água boa. Leve esse ritmo para dezembro!' } }) };
  const r = await pedir('/zumi', { id: b64u(nodeCrypto.randomBytes(16)), tipo: 'mes', r: resumo, mes: 'novembro', proximo: 'dezembro' });
  assert.equal(r.status, 200);
  assert.match((await r.json()).frase, /dezembro/);
});
await caso('/zumi lê a resposta no formato de chat, com ```json e com o modelo pensando antes', async () => {
  const fmt = [
    { choices: [{ message: { content: '```json\n' + JSON.stringify(respostaOk) + '\n```' } }] },
    { result: { response: '<think>Vou montar {um rascunho}.</think>\n' + JSON.stringify(respostaOk) } },
    { response: 'Pensei em {"abertura": 1}. Resposta final: ' + JSON.stringify(respostaOk) }
  ];
  for (const f of fmt) {
    env.AI = { run: async () => f };
    const r = await pedir('/zumi', { ...semana, id: b64u(nodeCrypto.randomBytes(16)) });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).conselho, respostaOk.conselho);
  }
});
await caso('/zumi limita 3 pedidos por aparelho por dia e para no limite do dia', async () => {
  const outro = { ...semana, id: b64u(nodeCrypto.randomBytes(16)) };
  for (let i = 0; i < 3; i++) assert.notEqual((await pedir('/zumi', outro)).status, 429);
  assert.equal((await pedir('/zumi', outro)).status, 429);
  const dia = new Date().toISOString().slice(0, 10);
  db.prepare('UPDATE zumi_uso SET n = 900 WHERE chave = ?').run('g:' + dia);
  assert.equal((await pedir('/zumi', { ...semana, id: b64u(nodeCrypto.randomBytes(16)) })).status, 429);
});
await caso('/zumi sem o binding da IA responde 503', async () => {
  delete env.AI;
  assert.equal((await pedir('/zumi', { ...semana, id: b64u(nodeCrypto.randomBytes(16)) })).status, 503);
});
console.log(`\nWorker ok (${ok} casos).`);
