// Nuvem do Ako: login com Google ou com e-mail e senha e cópia do progresso no Firestore (projeto rizzygo-webapp).
// Opcional: só carrega quando a pessoa pede para entrar (botão do topo em /conta.js ou Ajustes da Rotina)
// ou já tinha entrado antes. Uma conta só para todos os apps do Ako.
// O aparelho continua sendo a fonte do dia a dia; a nuvem guarda uma cópia por app em
// users/<uid>/apps/<app>, com os dados como texto JSON: 'rotina' e 'ako' (trilhas, mapas e ajustes
// juntos, desde 11/11/2026; antes eram três documentos). Detalhes em /privacidade/.
// Cota do plano gratuito (Spark): 50 mil leituras e 20 mil gravações por dia, para todo mundo junto.
// Por isso cada aba relê a nuvem no máximo uma vez a cada cfg.releitura, e o aviso de cota cheia é claro.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, EmailAuthProvider, signInWithPopup, reauthenticateWithPopup, reauthenticateWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, deleteUser
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-lite.js';

// Junta duas versões que mudaram ao mesmo tempo (ver /mesclar.js, que também serve a Rotina entre abas).
import '/mesclar.js?v=2026111101';
const mesclar = globalThis.RizzygoMesclar;

const CONFIG = {
  apiKey: 'AIzaSyAnvFI3ZadinkXMr3F9fIO7vUeui8fIRss',
  authDomain: 'rizzygo-webapp.firebaseapp.com',
  projectId: 'rizzygo-webapp',
  storageBucket: 'rizzygo-webapp.firebasestorage.app',
  messagingSenderId: '326966137118',
  appId: '1:326966137118:web:707625ac9a417c76bf790f'
};
const APPS = ['rotina', 'ako', 'trilhas', 'mapas', 'ajustes']; // trilhas, mapas e ajustes: documentos antigos, antes do 'ako'
const ESPERA = 5000; // junta as mudanças e grava uma vez
const INTERVALO = 120000; // no máximo uma gravação a cada 2 min, fora ao sair do app
const CONTA = 'rizzygo-conta-v1'; // a pessoa aceitou e entrou: todos os apps do Ako sincronizam
const RELEITURA = 120000; // padrão: esta aba relê a nuvem no máximo a cada 2 min (abrir uma aba nova sempre lê)

// A cota grátis do Firestore acabou: a nuvem volta quando a cota zera (meia-noite no Pacífico, de madrugada no Brasil).
export const AVISO_COTA = 'A nuvem do Ako chegou ao limite de hoje e volta de madrugada. Tudo continua salvo neste aparelho e vai para a nuvem quando ela voltar.';
const falha = (e, padrao) => (e && e.code === 'resource-exhausted' ? AVISO_COTA : padrao);

// "há 3 min", "hoje às 14:05", "10/11 às 09:30": quando a nuvem recebeu a última cópia.
export function haQuanto(ms) {
  if (!ms) return '';
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return 'há ' + min + ' min';
  const d = new Date(ms), hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return 'hoje às ' + hora;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hora;
}

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
function anunciar(u) {
  const uid = u ? u.uid : null;
  if (ultimoUid !== undefined && uid !== ultimoUid) window.dispatchEvent(new CustomEvent('rizzygo-conta', { detail: { usuario: dados(u) } }));
  ultimoUid = uid;
}
onAuthStateChanged(auth, (u) => {
  if (pedindo) return; // quem anuncia a entrada é entrarCom
  if (!u) marcarConta(false);
  anunciar(u);
});

// Avisa a página sempre que a conta muda: cb({ nome, email }) ou cb(null).
export function aoMudarConta(cb) { onAuthStateChanged(auth, (u) => cb(dados(u))); }

const ERROS = {
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
  'auth/invalid-credential': 'E-mail ou senha não conferem. Confira e tente de novo, ou crie uma conta.',
  'auth/wrong-password': 'E-mail ou senha não conferem. Confira e tente de novo, ou crie uma conta.',
  'auth/user-not-found': 'E-mail ou senha não conferem. Confira e tente de novo, ou crie uma conta.',
  'auth/invalid-email': 'Esse e-mail não parece válido. Confira se digitou certo.',
  'auth/missing-password': 'Digite a senha.',
  'auth/email-already-in-use': 'Esse e-mail já tem conta no Ako. Use Entrar, ou Esqueci a senha.',
  'auth/weak-password': 'A senha precisa de pelo menos 8 caracteres.',
  'auth/password-does-not-meet-requirements': 'A senha precisa de pelo menos 8 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão agora. Confira a internet e tente de novo.',
  'auth/operation-not-allowed': 'Esse jeito de entrar não está ligado agora. Tente pelo Google.'
};
const erro = (e, padrao) => new Error((e && ERROS[e.code]) || padrao);

// Login. Só chamar depois do aceite da política de privacidade.
async function entrarCom(fazer, padrao) {
  pedindo = true; marcarConta(true);
  try {
    const r = await fazer();
    pedindo = false;
    if (ultimoUid === undefined) ultimoUid = null;
    anunciar(r.user);
    for (const i of instancias) i.ligar();
    return dados(r.user);
  } catch (e) {
    pedindo = false; marcarConta(false);
    throw erro(e, padrao);
  }
}
export const entrarGoogle = () => entrarCom(() => signInWithPopup(auth, new GoogleAuthProvider()), 'Não deu para entrar com o Google agora.');
export const entrarEmail = (email, senha) => entrarCom(() => signInWithEmailAndPassword(auth, email, senha), 'Não deu para entrar agora. Tente de novo.');
export const criarContaEmail = (email, senha) => entrarCom(() => createUserWithEmailAndPassword(auth, email, senha), 'Não deu para criar a conta agora. Tente de novo.');
export async function redefinirSenha(email) {
  auth.languageCode = 'pt';
  try { await sendPasswordResetEmail(auth, email); } catch (e) { if (e && e.code !== 'auth/user-not-found') throw erro(e, 'Não deu para enviar o e-mail agora.'); }
}
// Entrou com e-mail e senha (e não com o Google)?
export function contaComSenha() {
  const u = auth.currentUser;
  return !!(u && u.providerData.some((p) => p.providerId === 'password') && !u.providerData.some((p) => p.providerId === 'google.com'));
}

// Envia o que falta, desliga a sincronização deste aparelho e sai. Os dados do aparelho ficam.
export async function sairDaConta() {
  for (const i of instancias) await i.despedir();
  marcarConta(false);
  await signOut(auth);
}

// Apaga os documentos de todos os apps do Ako, o cadastro de leitor do site e a conta. Os dados do aparelho ficam.
// pedirSenha() é chamada só quando o Firebase pede login recente de quem entrou com e-mail e senha.
export async function apagarConta(pedirSenha) {
  const u = auth.currentUser;
  if (!u) return false;
  const apagar = async () => {
    for (const a of APPS) await deleteDoc(doc(db, 'users', u.uid, 'apps', a));
    await deleteDoc(doc(db, 'leitores', u.uid)); // cadastro dos ebooks do rizzygo.com.br, mesma conta
    await deleteUser(u);
  };
  try { await apagar(); } catch (e) {
    if (!e || e.code !== 'auth/requires-recent-login') throw e;
    if (contaComSenha()) {
      const senha = pedirSenha && await pedirSenha();
      if (!senha) return false;
      try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, senha)); } catch (e2) { throw erro(e2, 'Senha não confere.'); }
    } else await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await apagar();
  }
  for (const i of instancias) i.esquecer();
  marcarConta(false);
  return true;
}

// cfg = { app, meta, salvarMeta(meta), ler(), temDados(estado), aplicar(estado, avisar), paraNuvem(estado, aceites),
//         daNuvem(remoto, local, aceites), aoMudar(status), e um destes dois para a primeira vez neste aparelho:
//         juntar(remoto, local) -> estado (soma os dois) ou perguntar(quandoNaNuvem) -> 'nuvem' | 'aparelho' }
// Opcionais: releitura (ms entre leituras nesta aba) e antigos ({ apps: [...], juntar({ app: estado }) -> estado }),
// para trazer documentos de antes na primeira vez, quando o documento do app ainda não existe.
export function criar(cfg) {
  let usuario = null, timer = null, gravando = false, ultimaGravacao = 0, ligando = null;
  const ref = (uid, app) => doc(db, 'users', uid, 'apps', app || cfg.app);
  // Quando esta aba leu a nuvem por último (sessionStorage: cada aba nova começa lendo).
  const LIDO = 'rizzygo-nuvem-lido-' + cfg.app;
  const releitura = cfg.releitura || RELEITURA;
  const leu = () => { try { sessionStorage.setItem(LIDO, String(Date.now())); } catch (e) { } };
  const leuHaPouco = () => { try { return Date.now() - Number(sessionStorage.getItem(LIDO) || 0) < releitura; } catch (e) { return false; } };
  const meta = cfg.meta;
  const avisa = (extra) => cfg.aoMudar(Object.assign({ usuario: usuario && { nome: usuario.displayName, email: usuario.email }, meta }, extra || {}));

  async function enviar(ja) {
    timer = null;
    if (!usuario) return;
    if (gravando) { timer = setTimeout(enviar, ESPERA); return; } // grava depois, para a mudança não se perder
    const falta = ultimaGravacao + INTERVALO - Date.now();
    if (!ja && falta > 0) { timer = setTimeout(enviar, falta); return; }
    if (JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites)) === meta.ultimo) return;
    gravando = true;
    try {
      // Outro aparelho gravou depois da última cópia em comum: junta antes, para não apagar o que ele mandou.
      // (meta.ultimo vazio = esta cópia deve valer inteira: primeira cópia ou "manter o aparelho".)
      if (meta.ultimo !== null) {
        const snap = await getDoc(ref(usuario.uid));
        leu();
        if (snap.exists() && snap.data().dados !== meta.ultimo) { gravando = false; await puxarAgora(false); return; }
      }
      const texto = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
      const quando = Date.now();
      await setDoc(ref(usuario.uid), { dados: texto, cliente: quando, aceites: meta.aceites, versao: 1, atualizadoEm: serverTimestamp() });
      meta.ultimo = texto; meta.sincronizadoEm = quando; meta.erro = null; ultimaGravacao = quando;
      cfg.salvarMeta(meta); avisa();
    } catch (e) {
      meta.erro = falha(e, 'Não deu para salvar na nuvem agora. Tento de novo na próxima mudança.'); avisa();
    } finally { gravando = false; }
  }

  // Traz a cópia da nuvem. Se os dois lados mudaram desde a última cópia em comum, junta os dois
  // (mesclar) em vez de um apagar o outro. Primeira vez neste aparelho: se a nuvem já tem dados
  // e o aparelho também, a página junta ou pergunta.
  let puxando = null;
  function puxar(primeira) {
    if (!puxando) puxando = puxarAgora(primeira).finally(() => { puxando = null; });
    return puxando;
  }
  // Primeira vez com um documento novo (ex.: 'ako'): junta o que estava nos documentos antigos.
  async function lerAntigos() {
    const estados = {};
    let cliente = 0, achou = false;
    for (const a of cfg.antigos.apps) {
      const s = await getDoc(ref(usuario.uid, a));
      if (!s.exists()) continue;
      try { estados[a] = JSON.parse(s.data().dados); achou = true; cliente = Math.max(cliente, s.data().cliente || 0); } catch (e) { }
    }
    return achou ? { dados: JSON.stringify(cfg.antigos.juntar(estados)), cliente } : null;
  }
  async function puxarAgora(primeira) {
    const snap = await getDoc(ref(usuario.uid));
    leu();
    meta.erro = null; // a nuvem respondeu (a cota voltou, a conexão voltou)
    let remoto = snap.exists() ? snap.data() : null, migrou = false;
    if (!remoto && primeira && cfg.antigos) { remoto = await lerAntigos(); migrou = !!remoto; }
    if (!remoto) { meta.ultimo = null; await enviar(true); return; }
    const localTexto = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
    if (primeira && cfg.temDados(cfg.ler()) && cfg.juntar) {
      let rem = null;
      try { rem = JSON.parse(remoto.dados); } catch (e) { }
      if (rem) cfg.aplicar(cfg.juntar(rem, cfg.ler()), false);
      meta.ultimo = null; await enviar(true); return;
    }
    // sincronizadoEm = quando este aparelho conferiu que está igual à nuvem (não a hora da cópia), para "Salvo na nuvem há X" zerar ao atualizar.
    if (remoto.dados === localTexto) { meta.ultimo = localTexto; meta.sincronizadoEm = Date.now(); cfg.salvarMeta(meta); avisa(); return; }
    let estado;
    try { estado = JSON.parse(remoto.dados); } catch (e) { return; }
    if (primeira && cfg.temDados(cfg.ler())) {
      const escolha = await cfg.perguntar(remoto.cliente);
      if (escolha === 'aparelho') { meta.ultimo = null; await enviar(true); return; }
    } else if (!primeira) {
      // Não usa o relógio dos aparelhos (podem estar desacertados): compara com a última cópia em comum.
      const mudouAqui = localTexto !== meta.ultimo;
      const mudouLa = remoto.dados !== meta.ultimo;
      if (mudouAqui && !mudouLa) { await enviar(true); return; }
      if (mudouAqui) {
        let base = null;
        try { base = meta.ultimo ? JSON.parse(meta.ultimo) : null; } catch (e) { base = null; }
        const junto = mesclar(base, estado, JSON.parse(localTexto));
        cfg.aplicar(cfg.daNuvem(cfg.ajustar ? cfg.ajustar(junto) : junto, cfg.ler(), meta.aceites), false);
        meta.ultimo = remoto.dados; meta.sincronizadoEm = remoto.cliente; meta.erro = null;
        cfg.salvarMeta(meta); avisa({ trouxe: true });
        await enviar(true); // a nuvem recebe o que juntou
        return;
      }
    }
    cfg.aplicar(cfg.daNuvem(estado, cfg.ler(), meta.aceites), !primeira);
    meta.ultimo = JSON.stringify(cfg.paraNuvem(cfg.ler(), meta.aceites));
    meta.sincronizadoEm = Date.now(); meta.erro = null;
    cfg.salvarMeta(meta); avisa({ trouxe: true });
    if (migrou) { meta.ultimo = null; await enviar(true); } // o documento novo nasce com o que veio dos antigos
  }

  // Liga este app na conta: a primeira sincronização junta ou pergunta.
  function ligar() {
    if (!usuario || meta.ligado || ligando) return ligando;
    meta.ligado = true; meta.ultimo = null; cfg.salvarMeta(meta);
    ligando = puxar(true).catch((e) => { meta.erro = falha(e, 'Entrou, mas não deu para falar com a nuvem. Tento de novo depois.'); avisa(); })
      .finally(() => { ligando = null; avisa(); });
    return ligando;
  }

  onAuthStateChanged(auth, async (u) => {
    usuario = u;
    if (!u) { if (meta.ligado && !pedindo) { meta.ligado = false; meta.ultimo = null; cfg.salvarMeta(meta); } avisa(); return; }
    avisa();
    if (meta.ligado) { if (!leuHaPouco()) await atualizar(); } // mesma aba, outra página há pouco: não relê
    else if (contaLigada() && !pedindo) ligar();
  });

  // Traz e envia o que mudou. Sem conexão ou sem cota, a mensagem diz o motivo.
  async function atualizar() {
    try { await puxar(false); return true; } catch (e) {
      meta.erro = falha(e, 'Sem conexão com a nuvem agora. Seus dados seguem salvos neste aparelho.'); avisa(); return false;
    }
  }

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
      timer = setTimeout(enviar, ESPERA);
    },
    agora() { if (timer) { clearTimeout(timer); enviar(true); } },
    // Voltou para a aba: relê só se a última leitura desta aba já passou de cfg.releitura.
    puxar() { if (usuario && meta.ligado && !leuHaPouco()) atualizar(); },
    // Botão "Atualizar agora": lê na hora e envia o que estiver esperando.
    async atualizar() {
      if (!usuario || !meta.ligado) return false;
      clearTimeout(timer); timer = null;
      return atualizar();
    },
    async mudarAceites(aceites) { meta.aceites = aceites; meta.ultimo = null; cfg.salvarMeta(meta); await enviar(true); },
    async sair() { await sairDaConta(); avisa(); },
    async apagarConta(pedirSenha) { const ok = await apagarConta(pedirSenha); avisa(); return ok; }
  };
  instancias.push(inst);
  return inst;
}
