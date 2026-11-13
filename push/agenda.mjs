// Decide quais lembretes de um aparelho tocam agora. Sem rede e sem banco, para dar para testar no Node.
//
// agenda (vem do aparelho):
//   { inicio: 'HH:MM', fim: 'HH:MM', lembretes: [ { k, tipo: 'intervalo', min, prox } | { k, tipo: 'hora', hora: 'HH:MM', semana?: [0..6] } ], adiados: { k: ms } }
// estado (fica no servidor): { prox: { k: ms }, tocados: { k: 'AAAA-MM-DD' }, adiados: { k: ms } }

export const MIN = 60 * 1000;
const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Data, minuto do dia e dia da semana no fuso da pessoa.
export function horaLocal(ms, fuso) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
  }).formatToParts(new Date(ms));
  const p = {};
  for (const x of partes) p[x.type] = x.value;
  return { dia: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + (+p.minute), semana: DIAS[p.weekday] };
}

export function minutos(hhmm) { const p = String(hhmm || '00:00').split(':'); return (+p[0]) * 60 + (+p[1]); }

// Mesma regra do app: o intervalo de avisos pode passar da meia-noite (22:00 até 06:00).
export function noHorario(min, inicio, fim) {
  const a = minutos(inicio), b = minutos(fim);
  return a <= b ? (min >= a && min < b) : (min >= a || min < b);
}

// Folgas: o cron roda a cada minuto, mas pode atrasar ou pular uma vez.
const FOLGA_INTERVALO = 5 * MIN; // passou disso, não toca atrasado: só agenda o próximo
const FOLGA_HORA = 10;           // minutos depois do horário em que ainda toca
const FOLGA_ADIADO = 30 * MIN;

export function vencidos(agenda, estado, agora, fuso) {
  const loc = horaLocal(agora, fuso);
  const novo = { prox: { ...(estado.prox || {}) }, tocados: { ...(estado.tocados || {}) }, adiados: { ...(estado.adiados || {}) } };
  const chaves = new Set(agenda.lembretes.map(l => l.k));
  const tocar = [];

  for (const k of Object.keys(novo.adiados)) {
    if (!chaves.has(k)) { delete novo.adiados[k]; continue; }
    if (agora >= novo.adiados[k]) {
      if (agora - novo.adiados[k] < FOLGA_ADIADO) tocar.push(k);
      delete novo.adiados[k];
    }
  }

  for (const l of agenda.lembretes) {
    if (l.tipo === 'intervalo') {
      const passo = Math.max(15, l.min) * MIN;
      let p = novo.prox[l.k] || agora + passo;
      if (agora >= p) {
        if (agora - p < FOLGA_INTERVALO && noHorario(loc.min, agenda.inicio, agenda.fim)) tocar.push(l.k);
        while (p <= agora) p += passo;
      }
      novo.prox[l.k] = p;
    } else if (l.tipo === 'hora') {
      if (Array.isArray(l.semana) && !l.semana.includes(loc.semana)) continue;
      const alvo = minutos(l.hora);
      if (loc.min >= alvo && loc.min - alvo < FOLGA_HORA && novo.tocados[l.k] !== loc.dia) {
        novo.tocados[l.k] = loc.dia;
        tocar.push(l.k);
      }
    }
  }

  for (const campo of ['prox', 'tocados']) for (const k of Object.keys(novo[campo])) if (!chaves.has(k)) delete novo[campo][k];
  return { tocar: [...new Set(tocar)], estado: novo };
}

// O aparelho mandou a agenda nova: ele manda nos próximos horários e nos adiamentos que conhece.
// Adiamento feito pela notificação (o servidor sabe, o app talvez não) continua valendo.
export function juntarEstado(estado, agenda) {
  const novo = { prox: { ...(estado.prox || {}) }, tocados: { ...(estado.tocados || {}) }, adiados: { ...(estado.adiados || {}) } };
  for (const l of agenda.lembretes) if (l.tipo === 'intervalo' && l.prox) novo.prox[l.k] = l.prox;
  Object.assign(novo.adiados, agenda.adiados || {});
  return novo;
}

// Confere tudo o que chega do aparelho. Devolve a agenda limpa ou null.
const CHAVE_OK = /^[A-Za-z0-9_-]{1,40}$/;
const HORA_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
export function agendaValida(a) {
  if (!a || typeof a !== 'object' || !Array.isArray(a.lembretes) || a.lembretes.length > 60) return null;
  if (!HORA_OK.test(a.inicio) || !HORA_OK.test(a.fim)) return null;
  const lembretes = [];
  for (const l of a.lembretes) {
    if (!l || !CHAVE_OK.test(l.k)) return null;
    if (l.tipo === 'intervalo') {
      const min = Number(l.min);
      if (!(min >= 15 && min <= 1440)) return null;
      lembretes.push({ k: l.k, tipo: 'intervalo', min, prox: Number.isFinite(l.prox) ? l.prox : null });
    } else if (l.tipo === 'hora') {
      if (!HORA_OK.test(l.hora)) return null;
      const s = Array.isArray(l.semana) ? l.semana.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : null;
      lembretes.push(s ? { k: l.k, tipo: 'hora', hora: l.hora, semana: s } : { k: l.k, tipo: 'hora', hora: l.hora });
    } else return null;
  }
  const adiados = {};
  for (const [k, v] of Object.entries(a.adiados || {})) if (CHAVE_OK.test(k) && Number.isFinite(v)) adiados[k] = v;
  return { inicio: a.inicio, fim: a.fim, lembretes, adiados };
}

export function fusoValido(f) {
  if (typeof f !== 'string' || f.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: f }); return true; } catch (e) { return false; }
}
