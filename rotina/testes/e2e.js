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
