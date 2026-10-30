/* Login com Google e progresso guardado na conta (Firebase Auth + Firestore).
   Fala com o app.js pela ponte window.AkoProgresso. Sem configuração em firebase-config.js,
   ou se o Firebase não carregar, nada muda: o Ako segue salvando só no navegador. */
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const ESPERA_ENVIO = 1500;

const ponte = window.AkoProgresso;
const botao = document.getElementById('conta-btn');
let fb = null;
let usuario = null;
let pronto = false;
let timer = null;
let status = '';

if (firebaseConfig && firebaseConfig.apiKey && ponte) {
  iniciar().catch(() => { /* Firebase fora do ar ou bloqueado: segue só com o navegador */ });
}

async function iniciar() {
  const [app, auth, fs] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js')
  ]);
  const a = app.initializeApp(firebaseConfig);
  fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), authMod: auth, fs };
  fb.auth.languageCode = 'pt-BR';

  const rodape = document.getElementById('rodape-dados');
  if (rodape) rodape.textContent = 'Entrar com Google é opcional. Sem entrar, seu progresso fica só neste navegador. Se entrar, ele fica guardado na sua conta para você continuar em outro aparelho.';
  botao.hidden = false;
  botao.addEventListener('click', () => { if (usuario) location.hash = '#/conquistas'; else entrar(); });

  ponte.aoSalvar(agendarEnvio);
  document.addEventListener('ako:pagina', desenharPainel);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarAgora(); });

  auth.onAuthStateChanged(fb.auth, async (u) => {
    usuario = u;
    pronto = false;
    desenharBotao();
    desenharPainel();
    if (u) await trazerDaConta();
  });
}

function documento() {
  return fb.fs.doc(fb.db, 'progresso', usuario.uid);
}

/* Junta o que está na conta com o que está neste navegador e guarda o resultado nos dois. */
async function trazerDaConta() {
  const uid = usuario.uid;
  try {
    const snap = await fb.fs.getDoc(documento());
    if (!usuario || usuario.uid !== uid) return;
    pronto = true;
    const remoto = snap.exists() ? lerRemoto(snap.data()) : null;
    if (remoto) ponte.juntar(remoto);
    await enviarAgora(true);
  } catch (e) {
    mostrarStatus('Não deu para ler o progresso da conta agora. Recarregue a página para tentar de novo.', true);
  }
}

function lerRemoto(d) {
  try {
    const obj = JSON.parse(d.dados);
    return ponte.valido(obj) ? obj : null;
  } catch (e) { return null; }
}

function agendarEnvio() {
  if (!usuario || !pronto) return;
  clearTimeout(timer);
  timer = setTimeout(enviarAgora, ESPERA_ENVIO);
  mostrarStatus('Salvando na sua conta...');
}

async function enviarAgora(forcar) {
  if (!usuario || !pronto) return;
  if (!timer && !forcar) return;
  clearTimeout(timer);
  timer = null;
  try {
    await fb.fs.setDoc(documento(), {
      versao: 1,
      dados: JSON.stringify(ponte.obter()),
      atualizadoEm: fb.fs.serverTimestamp()
    });
    const h = new Date();
    mostrarStatus('Salvo na sua conta às ' + String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0') + '.');
  } catch (e) {
    mostrarStatus('Não deu para salvar na conta agora. O progresso continua neste navegador e vai para a conta na próxima vez que você avançar.', true);
  }
}

async function entrar() {
  const { GoogleAuthProvider, signInWithPopup } = fb.authMod;
  const provedor = new GoogleAuthProvider();
  provedor.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(fb.auth, provedor);
  } catch (e) {
    const codigo = e && e.code;
    if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') return;
    if (codigo === 'auth/popup-blocked') ponte.avisar('O navegador bloqueou a janela de login. Libere pop-ups para este site e tente de novo.');
    else if (codigo === 'auth/network-request-failed') ponte.avisar('Sem conexão. Confira a internet e tente de novo.');
    else ponte.avisar('Não deu para entrar agora. Tente de novo em alguns minutos.');
  }
}

async function sair() {
  await enviarAgora();
  pronto = false;
  await fb.authMod.signOut(fb.auth);
  ponte.limpar();
  ponte.avisar('Você saiu. Seu progresso continua guardado na sua conta.');
}

function nomeCurto() {
  return (usuario.displayName || usuario.email || 'Conta').trim().split(/\s+/)[0];
}

function desenharBotao() {
  if (usuario) {
    botao.textContent = nomeCurto().charAt(0).toUpperCase();
    botao.classList.add('logado');
    botao.setAttribute('aria-label', 'Sua conta: ' + (usuario.displayName || usuario.email || ''));
    botao.title = usuario.email || '';
  } else {
    botao.textContent = 'Entrar';
    botao.classList.remove('logado');
    botao.setAttribute('aria-label', 'Entrar com Google');
    botao.removeAttribute('title');
  }
}

function desenharPainel() {
  const painel = document.getElementById('conta-painel');
  if (!painel || !fb) return;
  painel.replaceChildren();
  const p = (texto, classe) => {
    const el = document.createElement('p');
    if (classe) el.className = classe;
    el.textContent = texto;
    painel.appendChild(el);
    return el;
  };
  const acao = (texto, classe, fn) => {
    const div = document.createElement('div');
    div.className = 'acoes';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = texto;
    b.addEventListener('click', fn);
    div.appendChild(b);
    painel.appendChild(div);
  };
  if (usuario) {
    const quem = p('Você entrou como ');
    const forte = document.createElement('strong');
    forte.textContent = usuario.displayName || usuario.email;
    quem.appendChild(forte);
    quem.append((usuario.displayName && usuario.email ? ' (' + usuario.email + ')' : '') + '. Seu progresso fica guardado na sua conta e aparece em qualquer aparelho em que você entrar.');
    const st = p(status, 'salvo');
    st.id = 'conta-status';
    st.setAttribute('aria-live', 'polite');
    acao('Sair da conta', 'btn btn-sec', sair);
    p('Ao sair, o progresso some deste navegador e continua guardado na conta. O botão Apagar meu progresso, aqui embaixo, apaga também a cópia da conta.');
  } else {
    p('Sem entrar, o progresso fica só neste navegador. Entre com sua conta Google para guardar o progresso e continuar de onde parou em outro aparelho.');
    acao('Entrar com Google', 'btn', entrar);
    p('Guardamos só o seu progresso na trilha. O nome e o e-mail vêm da conta Google e servem só para identificar você. Se preferir não entrar, dá para levar o progresso para outro aparelho por arquivo.');
  }
}

function mostrarStatus(texto, erro) {
  status = texto;
  const el = document.getElementById('conta-status');
  if (!el) return;
  el.textContent = texto;
  el.style.color = erro ? 'var(--erro)' : '';
}
