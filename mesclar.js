/* Junta duas versões do progresso salvas ao mesmo tempo, sem uma apagar a outra.
   Usado pela nuvem (/nuvem.js: dois aparelhos) e pela Rotina (duas abas ou o atalho na tela inicial).
   Script clássico: define window.RizzygoMesclar(base, outra, esta). */
(function () {
  'use strict';
  // Junta duas versões que mudaram desde a última cópia em comum (base), campo a campo:
  // - o que só um lado mudou fica com a mudança desse lado;
  // - número que os dois mudaram fica com o maior (pontos e contagens não somem);
  // - lista de itens com id junta pelos ids (item novo entra, item apagado de um lado sai);
  // - lista de marcas (true/false) junta posição a posição; lista de textos vira união;
  // - objeto com o número mudouEm (ex.: o relógio do Foco) não se mistura: se os dois lados mudaram,
  //   fica inteiro o que mudou por último (juntar campo a campo daria um relógio que ninguém ligou).
  // Sem base (primeira cópia perdida), vale a mesma regra, como se a base fosse vazia.
  const ehObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const comId = (l) => Array.isArray(l) && l.length > 0 && l.every((x) => ehObj(x) && x.id != null);
  function mesclar(base, rem, loc) {
    if (igual(loc, base)) return rem;
    if (igual(rem, base) || rem === undefined) return loc;
    if (loc === undefined) return igual(rem, base) ? undefined : rem;
    if (ehObj(rem) && ehObj(loc)) {
      if (typeof rem.mudouEm === 'number' || typeof loc.mudouEm === 'number') return (rem.mudouEm || 0) > (loc.mudouEm || 0) ? rem : loc;
      const b = ehObj(base) ? base : {}, r = {};
      for (const k of new Set([...Object.keys(loc), ...Object.keys(rem)])) {
        // apagado de um lado e intocado do outro: sai
        if (!(k in loc) && k in b && igual(rem[k], b[k])) continue;
        if (!(k in rem) && k in b && igual(loc[k], b[k])) continue;
        const v = mesclar(b[k], rem[k], loc[k]);
        if (v !== undefined) r[k] = v;
      }
      return r;
    }
    if (Array.isArray(rem) && Array.isArray(loc)) {
      const b = Array.isArray(base) ? base : [];
      if (comId(rem) || comId(loc)) {
        const porId = (l) => new Map(l.filter(ehObj).map((x) => [String(x.id), x]));
        const mb = porId(b), mr = porId(rem), ml = porId(loc), r = [];
        const ids = [...ml.keys(), ...[...mr.keys()].filter((k) => !ml.has(k))];
        for (const k of ids) {
          const x = mesclar(mb.get(k), mr.get(k), ml.get(k));
          if (x !== undefined) r.push(x);
        }
        return r;
      }
      if ([...rem, ...loc].every((x) => typeof x === 'boolean' || x == null)) {
        const r = [];
        for (let i = 0; i < Math.max(rem.length, loc.length); i++) r[i] = !!loc[i] !== !!b[i] ? !!loc[i] : !!rem[i]; // vazio = desmarcado
        return r;
      }
      const tira = new Set(b.map((x) => JSON.stringify(x)).filter((k) => !rem.some((x) => JSON.stringify(x) === k) || !loc.some((x) => JSON.stringify(x) === k)));
      const vistos = new Set(), r = [];
      for (const x of [...loc, ...rem]) { const k = JSON.stringify(x); if (!vistos.has(k) && !tira.has(k)) { vistos.add(k); r.push(x); } }
      return r;
    }
    if (typeof rem === 'number' && typeof loc === 'number') return Math.max(rem, loc);
    return loc;
  }
  globalThis.RizzygoMesclar = mesclar;
})();
