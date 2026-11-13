// Teste de ponta a ponta da Rotina com a Zumi, num navegador de verdade (Playwright + Chromium).
// Uso: node rotina/testes/e2e.js          (na raiz do repositório)
// Sobe um servidor local, usa o app como uma pessoa usaria e confere que nada se perde ao recarregar,
// inclusive com dados salvos por uma versão anterior (rotina/testes/estado-antigo.json).
// Precisa do pacote playwright (npm i playwright) e do Chromium dele (npx playwright install chromium).
'use strict';
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const PORTA = 8000 + Math.floor(Math.random() * 900);
const BASE = `http://127.0.0.1:${PORTA}`;
const CHAVE = 'rizzygo-rotina-v1';
let falhas = 0;

function confere(ok, msg) {
  console.log((ok ? 'ok   ' : 'FALHA ') + msg);
  if (!ok) falhas++;
}

async function esperarServidor() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/rotina/'); if (r.ok) return; } catch (e) { /* ainda subindo */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('servidor local não subiu');
}

async function novaPagina(navegador, estado) {
  const ctx = await navegador.newContext({ serviceWorkers: 'allow' });
  // O teste não fala com o Worker de produção: sem isso, o resultado dependeria da internet e de a Cloudflare aceitar
  // o IP de quem roda (o CI recebeu uma resposta sem CORS). Os passos do push registram a própria resposta na página,
  // e a rota da página vale mais que esta, do contexto.
  await ctx.route('https://rotina-push.rizzygo.com.br/**', r => r.abort());
  if (estado) await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem(k, v); sessionStorage.setItem('semeado', '1'); } }, [CHAVE, estado]);
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', e => erros.push(e.message));
  pagina.on('console', m => { if (m.type() === 'error' && !/firebase|gstatic|googleapis|cloudflareinsights|ERR_|Failed to load resource/i.test(m.text())) erros.push(m.text()); });
  return { ctx, pagina, erros };
}

async function abaVisivel(pagina) {
  return pagina.evaluate(() => { const a = document.querySelector('.aba:not([hidden])'); return a && a.dataset.aba; });
}

async function salvo(pagina) {
  return pagina.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), CHAVE);
}

// Firebase de mentira para os passos da nuvem: dois contextos do navegador (dois "aparelhos") na mesma conta.
// Os módulos do gstatic viram versões mínimas, e o Firestore é um mapa aqui no Node, igual para os dois.
const FIRESTORE = 'https://firestore.teste';
const MODULOS = {
  'firebase-app.js': 'export const initializeApp = () => ({});',
  'firebase-auth.js': `
    const U = { uid: 'u-teste', email: 'teste@exemplo.com', displayName: 'Teste', providerData: [{ providerId: 'google.com' }] };
    export const getAuth = () => ({ currentUser: U });
    export class GoogleAuthProvider {}
    export const EmailAuthProvider = { credential: () => ({}) };
    const ok = async () => ({ user: U });
    export const signInWithPopup = ok, signInWithEmailAndPassword = ok, createUserWithEmailAndPassword = ok;
    export const reauthenticateWithPopup = ok, reauthenticateWithCredential = ok;
    export const sendPasswordResetEmail = async () => {}, signOut = async () => {}, deleteUser = async () => {};
    export function onAuthStateChanged(a, cb) { setTimeout(() => cb(U), 0); return () => {}; }`,
  'firebase-firestore-lite.js': `
    const URL_ = '${FIRESTORE}/';
    export const getFirestore = () => ({});
    export const doc = (db, ...p) => p.join('/');
    export const serverTimestamp = () => null;
    export async function getDoc(c) {
      const d = await (await fetch(URL_ + c)).json();
      return { exists: () => d !== null, data: () => d };
    }
    export async function setDoc(c, dados) { await fetch(URL_ + c, { method: 'POST', body: JSON.stringify(dados) }); }
    export async function deleteDoc(c) { await fetch(URL_ + c, { method: 'DELETE' }); }`
};
async function nuvemDeMentira(ctx, banco) {
  const cors = { 'Access-Control-Allow-Origin': '*' };
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => {
    const nome = r.request().url().split('/').pop();
    r.fulfill({ status: 200, contentType: 'application/javascript', headers: cors, body: MODULOS[nome] || '' });
  });
  await ctx.route(FIRESTORE + '/**', r => {
    const req = r.request(), c = req.url().slice(FIRESTORE.length + 1);
    if (req.method() === 'POST') banco[c] = JSON.parse(req.postData());
    if (req.method() === 'DELETE') delete banco[c];
    r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(banco[c] || null) });
  });
  // a conta já está ligada neste aparelho (a pessoa entrou e aceitou antes)
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('conta-semeada')) return;
    localStorage.setItem('rizzygo-conta-v1', JSON.stringify({ ligado: true, desde: Date.now() }));
    localStorage.setItem('rizzygo-nuvem-rotina-v1', JSON.stringify({ ligado: true, ultimo: null, aceites: { saude: false, reflexoes: false } }));
    sessionStorage.setItem('conta-semeada', '1');
  });
}
async function relogio(pagina) {
  return pagina.evaluate(k => {
    const t = (JSON.parse(localStorage.getItem(k) || 'null') || {}).timer || {};
    return { tempo: document.getElementById('tempo').textContent, rodando: !!t.rodando, fimEm: t.fimEm, restante: t.restante };
  }, CHAVE);
}

async function main() {
  const servidor = spawn('python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1'], { cwd: RAIZ, stdio: 'ignore' });
  const navegador = await chromium.launch();
  try {
    await esperarServidor();

    // 1. Primeira visita: todas as abas abrem, sem erro de JavaScript.
    let { ctx, pagina, erros } = await novaPagina(navegador);
    await pagina.goto(BASE + '/rotina/', { waitUntil: 'networkidle' });
    for (const aba of ['hoje', 'foco', 'tarefas', 'bem-estar', 'metas', 'evolucao', 'ajustes']) {
      await pagina.evaluate(a => { location.hash = a === 'hoje' ? '#/' : '#/' + a; }, aba);
      await pagina.waitForTimeout(50);
      confere(await abaVisivel(pagina) === aba, `aba ${aba} aparece`);
    }

    // 2. Tarefa de hoje, tarefa sem data, meta e lembrete.
    await pagina.evaluate(() => { location.hash = '#/tarefas'; });
    await pagina.fill('#tarefa-txt', 'Tarefa de teste e2e');
    await pagina.press('#tarefa-txt', 'Enter');
    confere((await pagina.textContent('#tarefas')).includes('Tarefa de teste e2e'), 'tarefa de hoje entra na lista');

    await pagina.evaluate(() => { location.hash = '#/tarefas/sem-data'; });
    await pagina.fill('#semdata-txt', 'Sem data de teste e2e');
    await pagina.press('#semdata-txt', 'Enter');
    confere((await pagina.textContent('#semdata-lista')).includes('Sem data de teste e2e'), 'tarefa sem data entra na lista');

    await pagina.evaluate(() => { location.hash = '#/metas'; });
    await pagina.fill('#meta-txt', 'Meta de teste e2e');
    await pagina.press('#meta-txt', 'Enter');
    confere((await pagina.textContent('#metas')).includes('Meta de teste e2e'), 'meta entra na lista');

    await pagina.evaluate(() => { location.hash = '#/ajustes'; });
    await pagina.fill('#novo-nome', 'Lembrete de teste e2e');
    await pagina.click('#novo button[type="submit"]');
    confere((await pagina.textContent('#meus')).includes('Lembrete de teste e2e'), 'lembrete entra na lista');

    // 2b. Repetir na Agenda (relógio falso: terça, 17/11/2026). Toda última terça do mês e todo sábado.
    {
      const r = await novaPagina(navegador);
      await r.pagina.clock.install({ time: new Date('2026-11-17T09:00:00') });
      await r.pagina.goto(BASE + '/rotina/#/tarefas/agenda', { waitUntil: 'networkidle' });
      const lista = () => r.pagina.textContent('#cal-lista');
      const dia = async (k) => { await r.pagina.click(`.cal-d[data-dia="${k}"]`); return lista(); };
      await r.pagina.click('.cal-d[data-dia="2026-11-24"]');
      const ops = await r.pagina.$$eval('#cal-repete option', os => os.map(o => o.textContent));
      confere(ops.includes('Toda terça') && ops.includes('Toda 4ª terça do mês') && ops.includes('Toda última terça do mês'), 'Repetir oferece as opções do dia escolhido: ' + ops.join(' | '));
      await r.pagina.fill('#cal-txt', 'Reunião do fim do mês');
      await r.pagina.selectOption('#cal-repete', 'ult');
      await r.pagina.click('#cal-add');
      await r.pagina.click('.cal-d[data-dia="2026-11-21"]');
      await r.pagina.fill('#cal-txt', 'Feira de sábado');
      await r.pagina.selectOption('#cal-repete', 'dias');
      confere(await r.pagina.isVisible('#cal-rep-dias'), '"Escolher os dias" mostra os dias da semana');
      await r.pagina.click('#cal-add');
      confere((await dia('2026-11-28')).includes('Feira de sábado') && !(await dia('2026-11-27')).includes('Feira de sábado'), 'tarefa de todo sábado aparece só aos sábados');
      confere((await dia('2026-11-24')).includes('Reunião do fim do mês') && !(await dia('2026-11-18')).includes('Reunião do fim do mês'), 'última terça do mês aparece no dia certo da Agenda');
      confere((await r.pagina.textContent('#rep-lista')).includes('toda última terça do mês'), 'a lista do que se repete mostra a regra');
      await r.pagina.evaluate(() => { location.hash = '#/tarefas'; });
      confere(!(await r.pagina.textContent('#tarefas')).includes('Reunião do fim do mês'), 'antes do dia, a repetição não entra na lista de hoje');
      await r.pagina.clock.setSystemTime(new Date('2026-12-29T09:00:00'));
      await r.pagina.reload({ waitUntil: 'networkidle' });
      await r.pagina.evaluate(() => { location.hash = '#/tarefas'; });
      const hoje = await r.pagina.textContent('#tarefas');
      confere(hoje.includes('Reunião do fim do mês') && !hoje.includes('Feira de sábado'), 'na última terça de dezembro, só ela entra na lista de hoje');
      await r.pagina.click('#tarefas .tarefa:has-text("Reunião do fim do mês") .marca-tarefa');
      confere((await r.pagina.getAttribute('#tarefas .tarefa:has-text("Reunião do fim do mês") .marca-tarefa', 'aria-pressed')) === 'true', 'a repetição de hoje pode ser marcada como feita');
      confere(r.erros.length === 0, 'nenhum erro de JavaScript ao repetir' + (r.erros.length ? ': ' + r.erros.join(' | ') : ''));
      await r.ctx.close();
    }

    // 3. Timer começa e o botão muda.
    await pagina.evaluate(() => { location.hash = '#/foco'; });
    const tempoAntes = await pagina.textContent('#tempo');
    const botaoAntes = await pagina.textContent('#b-iniciar');
    await pagina.click('#b-iniciar');
    await pagina.waitForTimeout(1200);
    confere((await pagina.textContent('#b-iniciar')) !== botaoAntes || (await pagina.textContent('#tempo')) !== tempoAntes, 'timer começa');
    await pagina.click('#b-zerar').catch(() => {});

    // 3b. Foco em dois aparelhos na mesma conta: o relógio é um só. O segundo mostra o tempo do primeiro,
    // a última ação vale nos dois (começar, pausar) e ninguém conta o próprio tempo.
    {
      const banco = {};
      const A = await novaPagina(navegador), B = await novaPagina(navegador);
      await nuvemDeMentira(A.ctx, banco); await nuvemDeMentira(B.ctx, banco);
      await A.pagina.goto(BASE + '/rotina/#/foco', { waitUntil: 'networkidle' });
      await A.pagina.waitForTimeout(500);
      await A.pagina.click('#b-iniciar');
      await A.pagina.waitForTimeout(1500);
      const docRotina = banco['users/u-teste/apps/rotina'];
      confere(!!docRotina && JSON.parse(docRotina.dados).timer && JSON.parse(docRotina.dados).timer.rodando, 'começar o Foco manda o relógio para a nuvem na hora');

      await B.pagina.goto(BASE + '/rotina/#/foco', { waitUntil: 'networkidle' });
      await B.pagina.waitForTimeout(1500);
      let ra = await relogio(A.pagina), rb = await relogio(B.pagina);
      confere(rb.rodando && rb.fimEm === ra.fimEm, 'o outro aparelho abre com o mesmo relógio (mesma hora de fim)');
      confere(rb.tempo === ra.tempo || Math.abs(rb.fimEm - ra.fimEm) < 1000, `os dois mostram o mesmo tempo (${ra.tempo} e ${rb.tempo})`);

      // B zera e começa de novo: depois de atualizar, A segue o B (a última ação vale).
      await B.pagina.click('#b-zerar');
      await B.pagina.waitForTimeout(1100);
      await B.pagina.click('#b-iniciar');
      await B.pagina.waitForTimeout(1500);
      await A.pagina.evaluate(() => document.getElementById('nuvem-atualizar').click());
      await A.pagina.waitForTimeout(1500);
      ra = await relogio(A.pagina); rb = await relogio(B.pagina);
      confere(ra.rodando && ra.fimEm === rb.fimEm, 'quando o outro aparelho começa de novo, este passa a mostrar o tempo dele');

      // A pausa: B fica pausado com o mesmo restante.
      await A.pagina.click('#b-iniciar');
      await A.pagina.waitForTimeout(1500);
      await B.pagina.evaluate(() => document.getElementById('nuvem-atualizar').click());
      await B.pagina.waitForTimeout(1500);
      ra = await relogio(A.pagina); rb = await relogio(B.pagina);
      confere(!rb.rodando && rb.restante === ra.restante && (await B.pagina.textContent('#b-iniciar')) === 'Continuar', 'pausar num aparelho pausa no outro, no mesmo tempo');
      confere(A.erros.length === 0 && B.erros.length === 0, 'nenhum erro de JavaScript com a nuvem' + (A.erros.concat(B.erros).length ? ': ' + A.erros.concat(B.erros).join(' | ') : ''));
      await A.ctx.close(); await B.ctx.close();
    }

    // 4. Recarregar não perde nada.
    await pagina.reload({ waitUntil: 'networkidle' });
    const texto = JSON.stringify(await salvo(pagina));
    for (const t of ['Tarefa de teste e2e', 'Sem data de teste e2e', 'Meta de teste e2e', 'Lembrete de teste e2e']) confere(texto.includes(t), `"${t}" continua salvo depois de recarregar`);
    await pagina.evaluate(() => { location.hash = '#/tarefas'; });
    confere((await pagina.textContent('#tarefas')).includes('Tarefa de teste e2e'), 'tarefa aparece depois de recarregar');

    // 4b. Lembrete tocou: "Ignorar dessa vez" fecha o aviso e ele não volta logo depois.
    await pagina.evaluate(k => {
      const st = JSON.parse(localStorage.getItem(k));
      const m = st.meus.find(x => x.nome === 'Lembrete de teste e2e');
      st.adiados = Object.assign({}, st.adiados, { [m.id]: Date.now() - 1000 });
      localStorage.setItem(k, JSON.stringify(st));
    }, CHAVE);
    await pagina.reload({ waitUntil: 'networkidle' });
    await pagina.waitForSelector('#aviso:not([hidden])', { timeout: 5000 }).catch(() => {});
    confere((await pagina.textContent('#aviso-txt')).includes('Lembrete de teste e2e'), 'aviso do lembrete aparece');
    await pagina.click('#aviso-pular');
    await pagina.waitForTimeout(2500);
    confere(await pagina.isHidden('#aviso'), '"Ignorar dessa vez" fecha o aviso e ele não volta');
    confere(Object.keys((await salvo(pagina)).adiados || {}).length === 0, '"Ignorar dessa vez" não deixa o lembrete adiado');

    // 4c. Matriz do topo, tela no topo ao trocar de aba e opinião da Zumi sem o Worker (texto pronto).
    confere(await pagina.locator('.matriz .matriz-cel').count() === 3, 'matriz do topo tem três células');
    await pagina.evaluate(() => { location.hash = '#/tarefas'; });
    await pagina.evaluate(() => window.scrollTo(0, 600));
    await pagina.evaluate(() => { location.hash = '#/metas'; });
    await pagina.waitForTimeout(150);
    confere(await pagina.evaluate(() => window.scrollY) === 0, 'trocar de aba leva a tela para o topo');
    await pagina.click('.matriz-zumi');
    await pagina.waitForTimeout(100);
    confere(await abaVisivel(pagina) === 'evolucao', '"Como estou indo?" abre a Evolução');
    await pagina.click('#zumi-pedir');
    await pagina.waitForSelector('#zumi-op-corpo .zumi-lista', { timeout: 20000 }).catch(() => {});
    const op = await pagina.textContent('#zumi-op-corpo');
    confere(op.includes('O que dá para melhorar') && op.includes('Tmj! Zumi'), 'sem o Worker, a Zumi dá a opinião com o texto pronto');
    confere(await pagina.isHidden('#zumi-pedir'), 'uma opinião por dia: o botão some depois de pedir');
    await pagina.reload({ waitUntil: 'networkidle' });
    confere(((await salvo(pagina)).zumi || {}).op?.ia === false, 'a opinião fica salva no aparelho');

    // 5. Service worker registra (é ele que deixa o app abrir sem internet).
    const sw = await pagina.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(r => r.active ? r.active.scriptURL : ''), new Promise(r => setTimeout(() => r(''), 5000))]));
    confere(sw.includes('/rotina/sw.js'), 'service worker ativo');
    confere(erros.length === 0, 'nenhum erro de JavaScript' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();

    // 5b. Avisar com o app fechado (push): com o servidor fora do ar, a opção some; com ele no ar, liga e manda
    // só horários, nunca o nome do lembrete. O servidor e o serviço de push do navegador são simulados aqui.
    ({ ctx, pagina, erros } = await novaPagina(navegador));
    await pagina.route('https://rotina-push.rizzygo.com.br/**', r => r.abort());
    await pagina.goto(BASE + '/rotina/#/ajustes', { waitUntil: 'networkidle' });
    await pagina.waitForTimeout(300);
    confere(await pagina.isHidden('#push-bloco'), 'sem o servidor de push, a opção "Avisar com o app fechado" não aparece');
    await ctx.close();

    ({ ctx, pagina, erros } = await novaPagina(navegador));
    await ctx.grantPermissions(['notifications'], { origin: BASE });
    await ctx.addInitScript(() => {
      const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/teste', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BPZ_teste_p256dh_aaaaaaaaaaaaaaaa', auth: 'auth_teste_aaaaaa' } }; }, unsubscribe() { window.__desassinou = true; return Promise.resolve(true); } };
      let ativa = null;
      // o Chromium sem janela relata 'denied' mesmo com a permissão dada; aqui a página enxerga 'granted', como num celular
      Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
      PushManager.prototype.getSubscription = function () { return Promise.resolve(ativa); };
      PushManager.prototype.subscribe = function () { ativa = sub; return Promise.resolve(sub); };
    });
    const recebidos = [];
    await pagina.route('https://rotina-push.rizzygo.com.br/**', async r => {
      const u = new URL(r.request().url());
      if (u.pathname !== '/chave') recebidos.push({ caminho: u.pathname, corpo: r.request().postDataJSON() });
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(u.pathname === '/chave' ? { chave: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' } : { ok: true }) });
    });
    await pagina.goto(BASE + '/rotina/#/ajustes', { waitUntil: 'networkidle' });
    await pagina.fill('#novo-nome', 'Tomar o remédio');
    await pagina.click('#novo button[type="submit"]');
    await pagina.waitForSelector('#push-bloco:not([hidden])', { timeout: 5000 }).catch(() => {});
    confere(await pagina.isVisible('#push-bloco'), 'com o servidor de push no ar, a opção aparece em Ajustes');
    await pagina.check('#push-on');
    await pagina.waitForTimeout(1500);
    const aparelho = recebidos.find(x => x.caminho === '/aparelho');
    confere(!!aparelho && aparelho.corpo.agenda.lembretes.length === 1 && aparelho.corpo.assinatura.endpoint.includes('fcm'), 'ligar manda a agenda e a assinatura ao servidor');
    confere(!!aparelho && !JSON.stringify(aparelho.corpo).includes('remédio'), 'o servidor não recebe o nome do lembrete');
    const nomes = await pagina.evaluate(() => caches.open('zumi-push').then(c => c.match('/rotina/__push')).then(r => r && r.json()));
    confere(!!nomes && Object.values(nomes.nomes || {}).some(n => n.includes('remédio')), 'o nome fica no aparelho para o service worker');
    await pagina.uncheck('#push-on');
    await pagina.waitForTimeout(500);
    confere(recebidos.some(x => x.caminho === '/remover') && await pagina.evaluate(() => !!window.__desassinou), 'desligar avisa o servidor e cancela a assinatura');
    // chave "Notificações": desligar desliga o push junto e persiste; ligar de novo funciona sem apagar nada
    await pagina.check('#push-on');
    await pagina.waitForTimeout(800);
    const removeAntes = recebidos.filter(x => x.caminho === '/remover').length;
    confere(await pagina.isChecked('#notif-on'), 'com a permissão dada, a chave Notificações aparece ligada');
    await pagina.uncheck('#notif-on');
    await pagina.waitForTimeout(500);
    const prefs = await pagina.evaluate(() => JSON.parse(localStorage.getItem('rizzygo-rotina-push-v1') || '{}'));
    confere(prefs.notifOff === true && prefs.on === false, 'desligar as notificações fica salvo e desliga o push junto');
    confere(!(await pagina.isChecked('#push-on')) && recebidos.filter(x => x.caminho === '/remover').length > removeAntes, 'desligar as notificações avisa o servidor');
    await pagina.check('#notif-on');
    await pagina.waitForTimeout(300);
    const prefs2 = await pagina.evaluate(() => JSON.parse(localStorage.getItem('rizzygo-rotina-push-v1') || '{}'));
    confere(prefs2.notifOff === undefined && await pagina.isChecked('#notif-on'), 'ligar as notificações de novo funciona');
    confere(erros.length === 0, 'nenhum erro de JavaScript no push' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();

    // 5b1. Não conseguiu assinar o push (ex.: janela anônima): a mensagem diz a causa, não "confira a internet".
    ({ ctx, pagina, erros } = await novaPagina(navegador));
    await ctx.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true });
      Notification.requestPermission = () => Promise.resolve('granted');
      PushManager.prototype.getSubscription = () => Promise.resolve(null);
      PushManager.prototype.subscribe = () => Promise.reject(new DOMException('push service error', 'AbortError'));
    });
    await pagina.route('https://rotina-push.rizzygo.com.br/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"chave":"BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"}' }));
    await pagina.goto(BASE + '/rotina/#/ajustes', { waitUntil: 'networkidle' });
    await pagina.waitForSelector('#push-bloco:not([hidden])', { timeout: 5000 }).catch(() => {});
    await pagina.click('#push-on');
    await pagina.waitForTimeout(1200);
    const msgErro = await pagina.textContent('#push-estado');
    confere(msgErro.includes('janela anônima') && msgErro.includes('AbortError') && !await pagina.isChecked('#push-on'), 'se o navegador não assina o push, a mensagem diz a causa e a chave volta desligada');
    await ctx.close();

    // 5b2. iPhone no Safari (sem PushManager): a opção aparece desligada, com a explicação de abrir pelo ícone.
    const ctxIos = await navegador.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    await ctxIos.addInitScript(() => { delete window.PushManager; });
    const pIos = await ctxIos.newPage();
    await pIos.goto(BASE + '/rotina/#/ajustes', { waitUntil: 'networkidle' });
    confere(await pIos.isVisible('#push-bloco') && await pIos.isDisabled('#push-on'), 'no iPhone fora do atalho, a opção de push aparece desligada');
    confere((await pIos.textContent('#push-estado')).includes('Adicionar à Tela de Início'), 'no iPhone fora do atalho, o app explica como instalar');
    await ctxIos.close();

    // 5c. O service worker recebe o push e mostra a notificação com o nome guardado no aparelho e os dois botões.
    // Precisa do Chromium completo (o headless shell não mostra notificação); sem ele, o passo é pulado com aviso.
    const completo = await chromium.launch({ channel: 'chromium' }).catch(() => null);
    if (!completo) console.log('aviso: Chromium completo não está instalado, pulei o teste do push no service worker');
    else {
      try {
        const c2 = await completo.newContext();
        await c2.grantPermissions(['notifications'], { origin: BASE });
        const p2 = await c2.newPage();
        await p2.goto(BASE + '/rotina/', { waitUntil: 'networkidle' });
        await p2.evaluate(() => navigator.serviceWorker.ready.then(() => caches.open('zumi-push')).then(c => c.put('/rotina/__push', new Response(JSON.stringify({ api: 'https://exemplo.invalid', id: 'x', nomes: { m1: 'Hora de: Tomar o remédio.' } })))));
        const cdp = await c2.newCDPSession(p2);
        const regs = new Promise(res => cdp.on('ServiceWorker.workerRegistrationUpdated', e => { if (e.registrations.length) res(e.registrations); }));
        await cdp.send('ServiceWorker.enable');
        const reg = (await regs).find(r => r.scopeURL.endsWith('/rotina/'));
        await p2.goto(BASE + '/', { waitUntil: 'networkidle' }); // Rotina fechada
        await cdp.send('ServiceWorker.deliverPushMessage', { origin: BASE, registrationId: reg.registrationId, data: JSON.stringify({ k: 'm1' }) });
        await p2.waitForTimeout(800);
        await p2.goto(BASE + '/rotina/', { waitUntil: 'networkidle' });
        const ns = await p2.evaluate(() => navigator.serviceWorker.ready.then(r => r.getNotifications()).then(l => l.map(n => ({ titulo: n.title, corpo: n.body, tag: n.tag, botoes: n.actions.map(a => a.title) }))));
        const n = ns.find(x => x.tag === 'lem-m1');
        confere(!!n && n.corpo === 'Hora de: Tomar o remédio.', 'push com a Rotina fechada mostra a notificação com o nome do lembrete');
        confere(!!n && n.botoes.join('|') === 'Daqui a 10 min|Ignorar dessa vez', 'a notificação do push tem "Daqui a 10 min" e "Ignorar dessa vez"');
      } finally { await completo.close(); }
    }

    // 6. Dados salvos por uma versão anterior abrem sem perda.
    const antigo = fs.readFileSync(path.join(__dirname, 'estado-antigo.json'), 'utf8');
    const esperado = JSON.parse(fs.readFileSync(path.join(__dirname, 'estado-antigo-textos.json'), 'utf8'));
    ({ ctx, pagina, erros } = await novaPagina(navegador, antigo));
    await pagina.goto(BASE + '/rotina/', { waitUntil: 'networkidle' });
    await pagina.reload({ waitUntil: 'networkidle' });
    const depois = JSON.stringify(await salvo(pagina));
    for (const t of esperado) confere(depois.includes(t), `dado antigo "${t}" continua salvo`);
    await pagina.evaluate(() => { location.hash = '#/tarefas/sem-data'; });
    confere((await pagina.textContent('#semdata-lista')).length > 0, 'lista sem data aparece com dados antigos');
    confere(erros.length === 0, 'nenhum erro de JavaScript com dados antigos' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  } finally {
    await navegador.close();
    servidor.kill();
  }
  console.log(falhas ? `\n${falhas} falha(s).` : '\nRotina ok.');
  process.exit(falhas ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
