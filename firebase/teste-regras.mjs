// Testa as regras do Firestore no emulador (32 casos). Numa pasta fora do repositório:
//   npm i -D firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
//   copie firestore.rules e este arquivo para lá, crie firebase.json com {"firestore":{"rules":"firestore.rules"}}
//   npx firebase emulators:exec --only firestore --project demo-rz "node teste-regras.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, getCountFromServer, addDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';
const env = await initializeTestEnvironment({ projectId: 'demo-rz', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'admins/ADM'), {}); });
const adm = env.authenticatedContext('ADM', { email: 'adm@x.com', email_verified: true }).firestore();
const admNV = env.authenticatedContext('ADM', { email: 'adm@x.com', email_verified: false }).firestore();
const ana = env.authenticatedContext('ana', { email: 'ana@x.com', email_verified: true }).firestore();
const bia = env.authenticatedContext('bia', { email: 'bia@x.com', email_verified: true }).firestore();
const anon = env.unauthenticatedContext().firestore();
let ok = 0; const t = async (n, p) => { try { await p; ok++; } catch (e) { console.log('FALHOU', n, e.message); process.exitCode = 1; } };
const base = (email) => ({ email, nome: 'Ana', vistaEm: '2026-11-20', apps: { ako: '2026-11-20' }, versao: 1 });
// contas
await t('conta sem criadaEm falha', assertFails(setDoc(doc(ana, 'contas/ana'), base('ana@x.com'), { merge: true })));
await t('conta cria', assertSucceeds(setDoc(doc(ana, 'contas/ana'), { criadaEm: serverTimestamp(), ...base('ana@x.com') }, { merge: true })));
await t('conta merge update', assertSucceeds(setDoc(doc(ana, 'contas/ana'), { ...base('ana@x.com'), apps: { rotina: '2026-11-21' }, vistaEm: '2026-11-21' }, { merge: true })));
await t('conta mudar criadaEm falha', assertFails(setDoc(doc(ana, 'contas/ana'), { criadaEm: serverTimestamp() }, { merge: true })));
await t('conta email de outro falha', assertFails(setDoc(doc(bia, 'contas/bia'), { criadaEm: serverTimestamp(), ...base('ana@x.com') })));
await t('conta de outro uid falha', assertFails(setDoc(doc(bia, 'contas/ana'), { criadaEm: serverTimestamp(), ...base('bia@x.com') })));
await t('conta campo extra falha', assertFails(setDoc(doc(bia, 'contas/bia'), { criadaEm: serverTimestamp(), ...base('bia@x.com'), ip: '1' })));
await t('conta app estranho falha', assertFails(setDoc(doc(bia, 'contas/bia'), { criadaEm: serverTimestamp(), ...base('bia@x.com'), apps: { x: '2026-11-20' } })));
await t('pessoa nao le conta', assertFails(getDoc(doc(ana, 'contas/ana'))));
await t('admin le conta', assertSucceeds(getDoc(doc(adm, 'contas/ana'))));
await t('admin nao verificado nao le', assertFails(getDoc(doc(admNV, 'contas/ana'))));
await t('admin conta', assertSucceeds(getCountFromServer(collection(adm, 'contas'))));
await t('pessoa nao conta', assertFails(getCountFromServer(collection(ana, 'contas'))));
await t('anon nao le', assertFails(getDoc(doc(anon, 'contas/ana'))));
// admins
await t('pessoa le proprio admins', assertSucceeds(getDoc(doc(ana, 'admins/ana'))));
await t('pessoa nao vira admin', assertFails(setDoc(doc(ana, 'admins/ana'), {})));
await t('pessoa nao le admins de outro', assertFails(getDoc(doc(ana, 'admins/ADM'))));
// planos
const pl = { plano: 'zumi+', origem: 'manual', ciclo: 'mensal', validoAte: Timestamp.fromDate(new Date('2027-01-01')), atualizadoEm: serverTimestamp(), atualizadoPor: 'adm@x.com' };
await t('pessoa nao grava plano', assertFails(setDoc(doc(ana, 'planos/ana'), { ...pl, atualizadoPor: 'ana@x.com' })));
await t('admin grava plano', assertSucceeds(setDoc(doc(adm, 'planos/ana'), pl)));
await t('admin plano invalido falha', assertFails(setDoc(doc(adm, 'planos/ana'), { ...pl, plano: 'ouro' })));
await t('pessoa le proprio plano', assertSucceeds(getDoc(doc(ana, 'planos/ana'))));
await t('pessoa nao le plano de outra', assertFails(getDoc(doc(bia, 'planos/ana'))));
await t('admin historico', assertSucceeds(addDoc(collection(adm, 'planos/ana/historico'), { de: 'gratis', para: 'zumi+', origem: 'manual', validoAte: null, quando: serverTimestamp(), quem: 'adm@x.com' })));
await t('pessoa nao le historico', assertFails(getDoc(doc(ana, 'planos/ana/historico/x'))));
// revisoes, anotacoes
await t('admin revisa', assertSucceeds(setDoc(doc(adm, 'revisoes/t1'), { status: 'ok', nota: '', hash: 'abc', titulo: 'T', revisadoEm: serverTimestamp() })));
await t('pessoa nao revisa', assertFails(setDoc(doc(ana, 'revisoes/t1'), { status: 'ok', nota: '', hash: 'abc', titulo: 'T', revisadoEm: serverTimestamp() })));
await t('admin anota', assertSucceeds(setDoc(doc(adm, 'anotacoes/ana'), { texto: 'oi', atualizadoEm: serverTimestamp() })));
await t('pessoa nao le anotacao', assertFails(getDoc(doc(ana, 'anotacoes/ana'))));
// admin nao le apps
await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'users/ana/apps/rotina'), { dados: '{}' }); });
await t('admin nao le rotina', assertFails(getDoc(doc(adm, 'users/ana/apps/rotina'))));
// apagar
await t('pessoa apaga conta', assertSucceeds(deleteDoc(doc(ana, 'contas/ana'))));
await t('pessoa apaga plano', assertSucceeds(deleteDoc(doc(ana, 'planos/ana'))));
await t('pessoa apaga inexistente', assertSucceeds(deleteDoc(doc(bia, 'planos/bia'))));
console.log('ok', ok); await env.cleanup();
