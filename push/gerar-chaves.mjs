// Gera o par de chaves VAPID do push. Uso: node push/gerar-chaves.mjs
// A pública pode aparecer em qualquer lugar; a privada vai só para o segredo do Worker.
import { b64u } from './webpush.mjs';
const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const pub = await crypto.subtle.exportKey('raw', par.publicKey);
const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
console.log('VAPID_PUBLIC=' + b64u(pub));
console.log('VAPID_PRIVATE=' + jwk.d);
