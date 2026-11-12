// Web Push sem biblioteca: assinatura VAPID (RFC 8292) e corpo cifrado aes128gcm (RFC 8291), só com WebCrypto.
// Roda no Cloudflare Workers e no Node 20+.

const txt = new TextEncoder();

export function b64u(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deB64u(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function junta(...partes) {
  const out = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
}
async function hkdf(sal, ikm, info, bytes) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, bytes * 8));
}

// Cifra o texto para a assinatura do navegador (chaves p256dh e auth).
// `sal` e `par` só são passados nos testes, para dar resultado conhecido.
export async function cifrar(p256dh, auth, texto, sal, par) {
  sal = sal || crypto.getRandomValues(new Uint8Array(16));
  const uaPub = deB64u(p256dh), segredo = deB64u(auth);
  const as = par || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const comum = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(segredo, comum, junta(txt.encode('WebPush: info\0'), uaPub, asPub), 32);
  const cek = await hkdf(sal, ikm, txt.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, txt.encode('Content-Encoding: nonce\0'), 12);
  const chave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chave, junta(txt.encode(texto), new Uint8Array([2]))));
  const cab = new Uint8Array(21);
  cab.set(sal, 0);
  new DataView(cab.buffer).setUint32(16, 4096);
  cab[20] = asPub.length;
  return junta(cab, asPub, cifrado);
}

// JWT ES256 que prova ao serviço de push que o envio vem de quem tem a chave privada.
export async function jwtVapid(aud, publica, privada, sub, agora = Date.now()) {
  const p = deB64u(publica);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), d: privada, ext: true };
  const k = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const corpo = b64u(txt.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' +
    b64u(txt.encode(JSON.stringify({ aud, exp: Math.floor(agora / 1000) + 12 * 3600, sub })));
  const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, txt.encode(corpo));
  return corpo + '.' + b64u(assinatura);
}

// Manda um push. Devolve o status HTTP do serviço (201 = ok; 404/410 = assinatura morreu).
export async function enviar(ass, dados, env) {
  const aud = new URL(ass.endpoint).origin;
  const jwt = await jwtVapid(aud, env.VAPID_PUBLIC, env.VAPID_PRIVATE, 'mailto:suporte@rizzygo.com.br');
  const corpo = await cifrar(ass.p256dh, ass.auth, JSON.stringify(dados));
  const r = await fetch(ass.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
      TTL: '600', Urgency: 'high',
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream'
    },
    body: corpo
  });
  return r.status;
}
