// Gera as imagens de compartilhamento (Open Graph, 1200x630) do Ako, dos Favos e das lições.
// Uso, na raiz do repositório: node icones/og/gerar.js
// Precisa do Playwright com Chromium. A fonte Outfit vem do Google Fonts.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const raiz = path.join(__dirname, '..', '..');
const zumi = (nome) => 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, 'zumi', nome)).toString('base64');

const IMAGENS = [
  { arquivo: 'ako.png', rotulo: 'Rizzygo Ako', titulo: 'Sua trilha em TI, montada com você.',
    apoio: 'Primeiros passos em TI e Platform Engineering. Em português, gratuito e sem cadastro.', zumi: 'abelha-estudando-fundo-escuro.png' },
  { arquivo: 'favos.png', rotulo: 'Favos', titulo: 'Skills abertas para a sua IA de código.',
    apoio: 'A IA explica antes de mudar, ensina perguntando e segue as trilhas do Ako.', zumi: 'abelha-ideia-fundo-escuro.png' },
  { arquivo: 'licoes.png', rotulo: 'Lições do Ako', titulo: 'Lições práticas em português.',
    apoio: 'Terminal, Linux, redes, Git, IA, SRE e plataforma, com exercícios.', zumi: 'abelha-ola-fundo-escuro.png' },
];

const html = (i) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;font-family:Outfit,sans-serif;color:#fff;background:#0B1B3A;position:relative}
  .brilho{position:absolute;right:-160px;top:-200px;width:760px;height:760px;border-radius:50%;
    background:radial-gradient(circle,rgba(31,79,216,.55),rgba(31,79,216,0) 65%)}
  .casca{position:relative;height:100%;padding:64px 72px;display:flex;flex-direction:column;max-width:800px}
  .marca{display:flex;align-items:center;gap:14px;font-weight:700;font-size:30px}
  .marca svg{width:44px;height:44px}
  .marca b{font-weight:400;color:#AEB9D3}
  .rotulo{align-self:flex-start;margin-top:auto;background:#F5A524;color:#0B1B3A;font-weight:700;font-size:24px;padding:8px 20px;border-radius:999px}
  h1{font-weight:800;font-size:72px;line-height:1.05;letter-spacing:-.02em;margin-top:20px}
  p{margin-top:22px;font-size:29px;line-height:1.3;color:#AEB9D3}
  .zumi{position:absolute;right:56px;bottom:70px;width:340px;height:340px;object-fit:contain}
  .traco{position:absolute;left:72px;bottom:0;width:180px;height:10px;background:#F5A524}
  .site{position:absolute;right:72px;bottom:28px;font-size:22px;color:#AEB9D3;font-weight:600}
</style></head><body>
<div class="brilho"></div>
<img class="zumi" src="${zumi(i.zumi)}" alt="">
<div class="casca">
  <div class="marca"><svg viewBox="0 0 64 64"><path d="M13 14L32 32" fill="none" stroke="#F5A524" stroke-width="8" stroke-linecap="round"/><path d="M13 14H51L13 50H51" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 27L32 32" fill="none" stroke="#F5A524" stroke-width="8" stroke-linecap="round"/></svg>Rizzygo <b>Ako</b></div>
  <span class="rotulo">${i.rotulo}</span>
  <h1>${i.titulo}</h1>
  <p>${i.apoio}</p>
</div>
<div class="traco"></div><div class="site">ako.rizzygo.com.br</div>
</body></html>`;

(async () => {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
  for (const i of IMAGENS) {
    await pagina.setContent(html(i), { waitUntil: 'networkidle' });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: path.join(__dirname, i.arquivo) });
    console.log('ok', 'icones/og/' + i.arquivo);
  }
  await navegador.close();
})();
