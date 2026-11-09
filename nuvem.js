// Nuvem do Ako: login com Google e cópia do progresso no Firestore (projeto rizzygo-webapp).
// Opcional: só carrega quando a pessoa pede para salvar na nuvem ou já tinha ligado antes.
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

const app = initializeApp(CONFIG);
const auth = getAuth(app);
auth.languageCode = 'pt';
const db = getFirestore(app);

// cfg = { app, meta, salvarMeta(meta), ler(), temDados(estado), aplicar(estado, avisar), paraNuvem(estado, aceites),
//         daNuvem(remoto, local, aceites), perguntar(quandoNaNuvem) -> 'nuvem' | 'aparelho', aoMudar(status) }
export function criar(cfg) {
  let usuario = null, timer = null, gravando = false, pronto = false, ultimaGravacao = 0;
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

  onAuthStateChanged(auth, async (u) => {
    usuario = u;
    if (!u) { if (pronto) { meta.ligado = false; cfg.salvarMeta(meta); } pronto = true; avisa(); return; }
    pronto = true; avisa();
    if (meta.ligado) { try { await puxar(false); } catch (e) { meta.erro = 'Sem conexão com a nuvem agora. Seus dados seguem salvos neste aparelho.'; avisa(); } }
  });

  return {
    async entrar(aceites) {
      meta.aceites = aceites;
      try {
        const r = await signInWithPopup(auth, new GoogleAuthProvider());
        usuario = r.user;
      } catch (e) {
        const msg = e && e.code === 'auth/popup-blocked' ? 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.'
          : e && e.code === 'auth/popup-closed-by-user' ? 'A janela do Google foi fechada antes de terminar.'
          : 'Não deu para entrar com o Google agora.';
        avisa({ falha: msg }); return false;
      }
      meta.ligado = true; meta.ultimo = null; cfg.salvarMeta(meta);
      try { await puxar(true); } catch (e) { meta.erro = 'Entrou, mas não deu para falar com a nuvem. Tento de novo depois.'; }
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
    async sair() { clearTimeout(timer); await enviar(true); meta.ligado = false; meta.ultimo = null; cfg.salvarMeta(meta); await signOut(auth); avisa(); },
    // Apaga os documentos de todos os apps do Ako e a conta. Os dados do aparelho ficam.
    async apagarConta() {
      if (!usuario) return false;
      const apagar = async () => {
        for (const a of APPS) await deleteDoc(doc(db, 'users', usuario.uid, 'apps', a));
        await deleteUser(usuario);
      };
      try { await apagar(); } catch (e) {
        if (e && e.code === 'auth/requires-recent-login') { await reauthenticateWithPopup(usuario, new GoogleAuthProvider()); await apagar(); } else throw e;
      }
      meta.ligado = false; meta.ultimo = null; meta.sincronizadoEm = null; cfg.salvarMeta(meta); usuario = null; avisa();
      return true;
    }
  };
}
