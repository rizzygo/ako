// Nuvem do Ako: login com Google e cópia do progresso no Firestore (projeto rizzygo-webapp).
// Opcional: só carrega quando a pessoa pede para entrar (botão do topo em /conta.js ou Ajustes da Rotina)
// ou já tinha entrado antes. Uma conta só para todos os apps do Ako.
// O aparelho continua sendo a fonte do dia a dia; a nuvem guarda uma cópia por app em
// users/<uid>/apps/<app>, com os dados como texto JSON. Detalhes em /privacidade/.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, onAuthStateChanged, signOut, deleteUser
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-lite.js';

const CONFIG = {
  apiKey: 'AIzaSyAnvFI3ZadinkXMr3F9fIO7vUeui8fIRss',
  authDomain: 'rizzygo-webapp.firebaseapp.com',
  projectId: 'rizzygo-webapp',
  storageBucket: 'rizzygo-webapp.firebasestorage.app',
  messagingSenderId: '326966137118',
  appId: '1:326966137118:web:707625ac9a417c76bf790f'
};
const APPS = ['rotina', 'trilhas', 'mapas'];
const ESPERA = 5000; // junta as mudanças e grava uma vez
const INTERVALO = 120000; // no máximo uma gravação a cada 2 min, fora ao sair do app
const CONTA = 'rizzygo-conta-v1'; // a pessoa aceitou e entrou: todos os apps do Ako sincronizam

const app = initializeApp(CONFIG);
const auth = getAuth(app);
auth.languageCode = 'pt';
const db = getFirestore(app);
const instancias = [];
let pedindo = false; // janela do Google aberta

export function contaLigada() {
  try { const c = JSON.parse(localStorage.getItem(CONTA) || 'null'); return !!(c && c.ligado); } catch (e) { return false; }
}
function marcarConta(ligado) {
  try { if (ligado) localStorage.setItem(CONTA, JSON.stringify({ ligado: true, desde: Date.now() })); else localStorage.removeItem(CONTA); } catch (e) { }
}
const dados = (u) => u && { nome: u.displayName, email: u.email };

// A conta caiu (saiu em outra aba, sessão expirou): o aparelho para de sincronizar.
// Toda entrada ou saída vira o evento 'rizzygo-conta' na página, para o topo e a Rotina se ajustarem.
let ultimoUid;
onAuthStateChanged(auth, (u) => {
  if (!u && !pedindo) marcarConta(false);
  const uid = u ? u.uid : null;
  if (ultimoUid !== undefined && uid !== ultimoUid) window.dispatchEvent(new CustomEvent('rizzygo-conta', { detail: { usuario: dados(u) } }));
  ultimoUid = uid;
});

// Avisa a página sempre que a conta muda: cb({ nome, email }) ou cb(null).
export function aoMudarConta(cb) { onAuthStateChanged(auth, (u) => cb(dados(u))); }

// Login com o Google. Só chamar depois do aceite da política de privacidade.
export async function entrarGoogle() {
  pedindo = true; marcarConta(true);
  try {
    const r = await signInWithPopup(auth, new GoogleAuthProvider());
    pedindo = false;
    for (const i of instancias) i.ligar();
    return dados(r.user);
  } catch (e) {
    pedindo = false; marcarConta(false);
    throw new Error(e && e.code === 'auth/popup-blocked' ? 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.'
      : e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') ? 'A janela do Google foi fechada antes de terminar.'
      : 'Não deu para entrar com o Google agora.');
  }
}

// Envia o que falta, desliga a sincronização deste aparelho e sai. Os dados do aparelho ficam.
export async function sairDaConta() {
  for (const i of instancias) await i.despedir();
  marcarConta(false);
  await signOut(auth);
}

// Apaga os documentos de todos os apps do Ako e a conta. Os dados do aparelho ficam.
export async function apagarConta() {
  const u = auth.currentUser;
  if (!u) return false;
  const apagar = async () => {
    for (const a of APPS) await deleteDoc(doc(db, 'users', u.uid, 'apps', a));
    await deleteUser(u);
  };
  try { await apagar(); } catch (e) {
    if (e && e.code === 'auth/requires-recent-login') { await reauthenticateWithPopup(u, new GoogleAuthProvider()); await apagar(); } else throw e;
  }
  for (const i of instancias) i.esquecer();
  marcarConta(false);
  return true;
}

// cfg = { app, meta, salvarMeta(meta), ler(), temDados(estado), aplicar(estado, avisar), paraNuvem(estado, aceites),
//         daNuvem(remoto, local, aceites), aoMudar(status), e um destes dois para a primeira vez neste aparelho:
//         juntar(remoto, local) -> estado (soma os dois) ou perguntar(quandoNaNuvem) -> 'nuvem' | 'aparelho' }
export function criar(cfg) {
  let usuario = null, timer = null, gravando = false, ultimaGravacao = 0, ligando = null;
  const ref = (uid) => doc(db, 'users', uid, 'apps', cfg.app);
  const meta = cfg.meta;
  const avisa = (extra) => cfg.aoMudar(Object.assign({ usuario: usuario && { nome: usuario.displayName, email: usuario.email }, meta }, extra || {}));

  async function enviar(ja) {
    timer = null;
    if (!usuario || gravando) return;
    const falta = ultimaGravacao + INTERVALO - Date.now();
    if (!ja && falta > 0) { timer = setTimeout(enviar, falta); return; }
    const texto = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
    if (texto === meta.ultimo) return;
    gravando = true;
    const quando = Date.now();
    try {
      await setDoc(ref(usuario.uid), { dados: texto, cliente: quando, aceites: meta.aceites, versao: 1, atualizadoEm: serverTimestamp() });
      meta.ultimo = texto; meta.sincronizadoEm = quando; meta.erro = null; ultimaGravacao = quando;
      cfg.salvarMeta(meta); avisa();
    } catch (e) {
      meta.erro = 'Não deu para salvar na nuvem agora. Tento de novo na próxima mudança.'; avisa();
    } finally { gravando = false; }
  }

  // Primeira vez neste aparelho: se a nuvem já tem dados e o aparelho também, a página pergunta.
  async function puxar(primeira) {
    const snap = await getDoc(ref(usuario.uid));
    if (!snap.exists()) { meta.ultimo = null; await enviar(true); return; }
    const remoto = snap.data();
    const localTexto = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
    const mudouAqui = meta.ultimo !== null && localTexto !== meta.ultimo;
    if (primeira && cfg.temDados(cfg.ler()) && cfg.juntar) {
      let rem = null;
      try { rem = JSON.parse(remoto.dados); } catch (e) { }
      if (rem) cfg.aplicar(cfg.juntar(rem, cfg.ler()), false);
      meta.ultimo = null; await enviar(true); return;
    }
    if (primeira && cfg.temDados(cfg.ler())) {
      const escolha = await cfg.perguntar(remoto.cliente);
      if (escolha === 'aparelho') { meta.ultimo = null; await enviar(true); return; }
    } else if (mudouAqui && (meta.mudouEm || 0) > remoto.cliente) { await enviar(true); return; }
    if (remoto.dados === localTexto) { meta.ultimo = localTexto; meta.sincronizadoEm = remoto.cliente; cfg.salvarMeta(meta); avisa(); return; }
    let estado;
    try { estado = JSON.parse(remoto.dados); } catch (e) { return; }
    cfg.aplicar(cfg.daNuvem(estado, cfg.ler(), meta.aceites), !primeira);
    meta.ultimo = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
    meta.sincronizadoEm = remoto.cliente; meta.erro = null;
    cfg.salvarMeta(meta); avisa({ trouxe: true });
  }

  // Liga este app na conta: a primeira sincronização junta ou pergunta.
  function ligar() {
    if (!usuario || meta.ligado || ligando) return ligando;
    meta.ligado = true; meta.ultimo = null; cfg.salvarMeta(meta);
    ligando = puxar(true).catch(() => { meta.erro = 'Entrou, mas não deu para falar com a nuvem. Tento de novo depois.'; avisa(); })
      .finally(() => { ligando = null; avisa(); });
    return ligando;
  }

  onAuthStateChanged(auth, async (u) => {
    usuario = u;
    if (!u) { if (meta.ligado && !pedindo) { meta.ligado = false; meta.ultimo = null; cfg.salvarMeta(meta); } avisa(); return; }
    avisa();
    if (meta.ligado) { try { await puxar(false); } catch (e) { meta.erro = 'Sem conexão com a nuvem agora. Seus dados seguem salvos neste aparelho.'; avisa(); } }
    else if (contaLigada() && !pedindo) ligar();
  });

  const inst = {
    ligar,
    async despedir() { clearTimeout(timer); timer = null; await enviar(true); meta.ligado = false; meta.ultimo = null; cfg.salvarMeta(meta); },
    esquecer() { clearTimeout(timer); timer = null; meta.ligado = false; meta.ultimo = null; meta.sincronizadoEm = null; cfg.salvarMeta(meta); usuario = null; avisa(); },
    async entrar(aceites) {
      if (aceites) { meta.aceites = aceites; cfg.salvarMeta(meta); }
      try { await entrarGoogle(); } catch (e) { avisa({ falha: e.message }); return false; }
      if (ligando) await ligando;
      avisa(); return true;
    },
    mudou() {
      if (!usuario || !meta.ligado || timer) return;
      if (JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites)) === meta.ultimo) return;
      if (!meta.mudouEm || meta.mudouEm < (meta.sincronizadoEm || 0)) { meta.mudouEm = Date.now(); cfg.salvarMeta(meta); }
      timer = setTimeout(enviar, ESPERA);
    },
    agora() { if (timer) { clearTimeout(timer); enviar(true); } },
    puxar() { if (usuario && meta.ligado) puxar(false).catch(() => {}); },
    async mudarAceites(aceites) { meta.aceites = aceites; meta.ultimo = null; cfg.salvarMeta(meta); await enviar(true); },
    async sair() { await sairDaConta(); avisa(); },
    async apagarConta() { const ok = await apagarConta(); avisa(); return ok; }
  };
  instancias.push(inst);
  return inst;
}
