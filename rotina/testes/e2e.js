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

    // 3. Timer começa e o botão muda.
    await pagina.evaluate(() => { location.hash = '#/foco'; });
    const tempoAntes = await pagina.textContent('#tempo');
    const botaoAntes = await pagina.textContent('#b-iniciar');
    await pagina.click('#b-iniciar');
    await pagina.waitForTimeout(1200);
    confere((await pagina.textContent('#b-iniciar')) !== botaoAntes || (await pagina.textContent('#tempo')) !== tempoAntes, 'timer começa');
    await pagina.click('#b-zerar').catch(() => {});

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
    confere(erros.length === 0, 'nenhum erro de JavaScript no push' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();

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
