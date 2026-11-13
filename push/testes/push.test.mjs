// Testes do push da Rotina, sem rede: node push/testes/push.test.mjs
// A cifra é conferida decifrando com o node:crypto (outra implementação), como faria o navegador.
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { vencidos, juntarEstado, agendaValida, horaLocal, MIN } from '../agenda.mjs';
import { cifrar, jwtVapid, b64u, deB64u } from '../webpush.mjs';

let ok = 0;
async function caso(nome, fn) { await fn(); ok++; console.log('ok   ' + nome); }

const FUSO = 'America/Sao_Paulo';
// 12/11/2026 (quinta, dia 4) às 10:00 em São Paulo = 13:00 UTC
const QUI_10H = Date.UTC(2026, 10, 12, 13, 0);
const base = { inicio: '08:00', fim: '22:00', adiados: {} };

await caso('hora local no fuso da pessoa', () => {
  assert.deepEqual(horaLocal(QUI_10H, FUSO), { dia: '2026-11-12', min: 600, semana: 4 });
});

await caso('lembrete no horário toca uma vez por dia', () => {
  const ag = { ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '10:00' }] };
  let r = vencidos(ag, {}, QUI_10H + 30 * 1000, FUSO);
  assert.deepEqual(r.tocar, ['m1']);
  r = vencidos(ag, r.estado, QUI_10H + 2 * MIN, FUSO);
  assert.deepEqual(r.tocar, []);
});

await caso('lembrete no horário respeita os dias da semana', () => {
  const ag = { ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '10:00', semana: [1, 2] }] };
  assert.deepEqual(vencidos(ag, {}, QUI_10H, FUSO).tocar, []);
});

await caso('lembrete no horário não toca muito atrasado', () => {
  const ag = { ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '09:00' }] };
  assert.deepEqual(vencidos(ag, {}, QUI_10H, FUSO).tocar, []);
});

await caso('intervalo toca na hora e agenda o próximo', () => {
  const ag = { ...base, lembretes: [{ k: 'agua', tipo: 'intervalo', min: 45, prox: QUI_10H }] };
  const est = juntarEstado({}, ag);
  const r = vencidos(ag, est, QUI_10H + 20 * 1000, FUSO);
  assert.deepEqual(r.tocar, ['agua']);
  assert.equal(r.estado.prox.agua, QUI_10H + 45 * MIN);
});

await caso('intervalo fora do horário de avisos não toca, mas segue o relógio', () => {
  const ag = { inicio: '11:00', fim: '22:00', adiados: {}, lembretes: [{ k: 'agua', tipo: 'intervalo', min: 45, prox: QUI_10H }] };
  const r = vencidos(ag, juntarEstado({}, ag), QUI_10H, FUSO);
  assert.deepEqual(r.tocar, []);
  assert.equal(r.estado.prox.agua, QUI_10H + 45 * MIN);
});

await caso('intervalo muito atrasado não toca de uma vez', () => {
  const ag = { ...base, lembretes: [{ k: 'agua', tipo: 'intervalo', min: 45, prox: QUI_10H - 3 * 60 * MIN }] };
  const r = vencidos(ag, juntarEstado({}, ag), QUI_10H, FUSO);
  assert.deepEqual(r.tocar, []);
  assert.ok(r.estado.prox.agua > QUI_10H);
});

await caso('adiado pela notificação toca depois e some', () => {
  const ag = { ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '08:00' }] };
  const r = vencidos(ag, { adiados: { m1: QUI_10H - 1000 } }, QUI_10H, FUSO);
  assert.deepEqual(r.tocar, ['m1']);
  assert.deepEqual(r.estado.adiados, {});
});

await caso('lembrete apagado no app some do estado', () => {
  const r = vencidos({ ...base, lembretes: [] }, { prox: { agua: 1 }, tocados: { m1: 'x' }, adiados: { m2: QUI_10H + MIN } }, QUI_10H, FUSO);
  assert.deepEqual(r.estado, { prox: {}, tocados: {}, adiados: {} });
});

await caso('juntar mantém o adiamento feito pela notificação', () => {
  const ag = { ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '08:00' }] };
  assert.deepEqual(juntarEstado({ adiados: { m1: 5 } }, ag).adiados, { m1: 5 });
});

await caso('agenda inválida é recusada', () => {
  assert.equal(agendaValida({ ...base, lembretes: [{ k: 'a b', tipo: 'hora', hora: '10:00' }] }), null);
  assert.equal(agendaValida({ ...base, lembretes: [{ k: 'a', tipo: 'intervalo', min: 1 }] }), null);
  assert.equal(agendaValida({ ...base, inicio: '25:00', lembretes: [] }), null);
  assert.ok(agendaValida({ ...base, lembretes: [{ k: 'm1', tipo: 'hora', hora: '07:30', semana: [1, 9] }] }).lembretes[0].semana.length === 1);
});

await caso('push cifrado abre no lado do navegador (RFC 8291)', async () => {
  const ua = nodeCrypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = nodeCrypto.randomBytes(16);
  const corpo = await cifrar(b64u(ua.getPublicKey()), b64u(auth), '{"k":"agua"}');
  // decifra como o navegador
  const sal = corpo.slice(0, 16), idlen = corpo[20], asPub = corpo.slice(21, 21 + idlen), dados = corpo.slice(21 + idlen);
  assert.equal(new DataView(corpo.buffer).getUint32(16), 4096);
  const comum = ua.computeSecret(Buffer.from(asPub));
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), Buffer.from(asPub)]);
  const ikm = Buffer.from(nodeCrypto.hkdfSync('sha256', comum, auth, info, 32));
  const cek = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, sal, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, sal, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(Buffer.from(dados.slice(-16)));
  const claro = Buffer.concat([d.update(Buffer.from(dados.slice(0, -16))), d.final()]);
  assert.equal(claro[claro.length - 1], 2);
  assert.equal(claro.slice(0, -1).toString(), '{"k":"agua"}');
});

await caso('JWT VAPID confere com a chave pública', async () => {
  const par = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = par.privateKey.export({ format: 'jwk' });
  const pub = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(deB64u(jwk.x)), Buffer.from(deB64u(jwk.y))]));
  const jwt = await jwtVapid('https://fcm.googleapis.com', pub, jwk.d, 'mailto:suporte@rizzygo.com.br');
  const [h, c, s] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(deB64u(c)).toString()).aud, 'https://fcm.googleapis.com');
  assert.ok(nodeCrypto.verify('sha256', Buffer.from(h + '.' + c), { key: par.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(deB64u(s))));
});

console.log(`\nPush ok (${ok} casos).`);
