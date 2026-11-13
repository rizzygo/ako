// Worker do push da Rotina: guarda a agenda de cada aparelho e, a cada minuto, manda o push do lembrete que venceu.
// O servidor não sabe o nome do lembrete: recebe só a chave (ex.: "agua", "m1abc") e os horários.
import { vencidos, juntarEstado, agendaValida, fusoValido } from './agenda.mjs';
import { enviar } from './webpush.mjs';
import { zumi, limparUso } from './zumi.mjs';

const ORIGENS = /^(https:\/\/ako\.rizzygo\.com\.br|https:\/\/([a-z0-9-]+\.)?ako-7vx\.pages\.dev|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const ID_OK = /^[A-Za-z0-9_-]{22,64}$/;
const B64_OK = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_PUSH_POR_MINUTO = 40; // plano free: até 50 subrequests por execução
const DIA = 24 * 60 * 60 * 1000;

function cabecalhos(origem) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (origem && ORIGENS.test(origem)) {
    Object.assign(h, { 'Access-Control-Allow-Origin': origem, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' });
  }
  return h;
}
const json = (corpo, status, origem) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem) });

async function lerJson(req) {
  if (Number(req.headers.get('Content-Length') || 0) > 32 * 1024) return null;
  try { return await req.json(); } catch (e) { return null; }
}

async function salvarAparelho(env, b) {
  const a = b.assinatura || {};
  const agenda = agendaValida(b.agenda);
  if (!ID_OK.test(b.id || '') || !agenda || !fusoValido(b.fuso)) return false;
  if (typeof a.endpoint !== 'string' || a.endpoint.length > 1024 || !/^https:\/\//.test(a.endpoint)) return false;
  if (!a.keys || !B64_OK.test(a.keys.p256dh || '') || !B64_OK.test(a.keys.auth || '')) return false;
  const velho = await env.DB.prepare('SELECT estado FROM aparelhos WHERE id = ?').bind(b.id).first();
  const estado = juntarEstado(velho ? JSON.parse(velho.estado) : {}, agenda);
  await env.DB.prepare(
    `INSERT INTO aparelhos (id, endpoint, p256dh, auth, fuso, agenda, estado, atualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
       fuso = excluded.fuso, agenda = excluded.agenda, estado = excluded.estado, atualizado = excluded.atualizado`
  ).bind(b.id, a.endpoint, a.keys.p256dh, a.keys.auth, b.fuso, JSON.stringify(agenda), JSON.stringify(estado), Date.now()).run();
  return true;
}

async function adiar(env, b) {
  const em = Number(b.em), agora = Date.now();
  if (!ID_OK.test(b.id || '') || !/^[A-Za-z0-9_-]{1,40}$/.test(b.k || '') || !(em > agora && em < agora + DIA)) return false;
  const linha = await env.DB.prepare('SELECT estado FROM aparelhos WHERE id = ?').bind(b.id).first();
  if (!linha) return false;
  const estado = JSON.parse(linha.estado);
  estado.adiados = Object.assign({}, estado.adiados, { [b.k]: em });
  await env.DB.prepare('UPDATE aparelhos SET estado = ? WHERE id = ?').bind(JSON.stringify(estado), b.id).run();
  return true;
}

async function rodarMinuto(env) {
  const agora = Date.now();
  // Ordem aleatória: se um minuto tiver mais push que o limite, quem ficou de fora vai no minuto seguinte.
  const { results } = await env.DB.prepare('SELECT * FROM aparelhos ORDER BY RANDOM()').all();
  let enviados = 0;
  for (const a of results) {
    if (enviados >= MAX_PUSH_POR_MINUTO) break;
    let agenda, estado;
    try { agenda = JSON.parse(a.agenda); estado = JSON.parse(a.estado); } catch (e) { continue; }
    const r = vencidos(agenda, estado, agora, a.fuso);
    let morreu = false;
    for (const k of r.tocar) {
      enviados++;
      const st = await enviar({ endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth }, { k }, env).catch(() => 0);
      if (st === 404 || st === 410) { morreu = true; break; }
    }
    if (morreu) await env.DB.prepare('DELETE FROM aparelhos WHERE id = ?').bind(a.id).run();
    else if (JSON.stringify(r.estado) !== a.estado) await env.DB.prepare('UPDATE aparelhos SET estado = ? WHERE id = ?').bind(JSON.stringify(r.estado), a.id).run();
  }
  // Uma vez por dia: aparelho que não abre a Rotina há 60 dias sai da lista.
  const d = new Date(agora);
  if (d.getUTCHours() === 6 && d.getUTCMinutes() === 0) {
    await env.DB.prepare('DELETE FROM aparelhos WHERE atualizado < ?').bind(agora - 60 * DIA).run();
    await limparUso(env, agora);
  }
}

export default {
  async fetch(req, env) {
    const origem = req.headers.get('Origin');
    const { pathname } = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecalhos(origem) });
    if (req.method === 'GET' && pathname === '/chave') return json({ chave: env.VAPID_PUBLIC }, 200, origem);
    if (req.method !== 'POST') return json({ erro: 'não encontrado' }, 404, origem);
    if (!origem || !ORIGENS.test(origem)) return json({ erro: 'origem' }, 403, origem);
    const b = await lerJson(req);
    if (!b) return json({ erro: 'corpo' }, 400, origem);
    if (pathname === '/aparelho') return (await salvarAparelho(env, b)) ? json({ ok: true }, 200, origem) : json({ erro: 'dados' }, 400, origem);
    if (pathname === '/adiar') return (await adiar(env, b)) ? json({ ok: true }, 200, origem) : json({ erro: 'dados' }, 400, origem);
    if (pathname === '/zumi') { const [st, corpo] = await zumi(env, b); return json(corpo, st, origem); }
    if (pathname === '/remover') {
      if (!ID_OK.test(b.id || '')) return json({ erro: 'dados' }, 400, origem);
      await env.DB.prepare('DELETE FROM aparelhos WHERE id = ?').bind(b.id).run();
      return json({ ok: true }, 200, origem);
    }
    return json({ erro: 'não encontrado' }, 404, origem);
  },
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(rodarMinuto(env));
  }
};
