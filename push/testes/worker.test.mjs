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
console.log(`\nWorker ok (${ok} casos).`);
