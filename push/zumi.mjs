// Rota POST /zumi: a Zumi escreve a opinião da semana ou a frase do mês com o Workers AI.
// O aparelho manda só números somados e as categorias que ele mesmo escolheu. Nada é gravado além de um contador por dia.
// Sem IA, cota cheia ou resposta estranha: devolve erro e o aparelho usa o texto pronto. Decisão: decisoes/0005-ia-workers-ai.md

export const LIMITE_DIA = 900;        // ~10 neurons por pedido; a cota grátis é 10.000 por dia
export const LIMITE_APARELHO = 3;     // pedidos por aparelho por dia (tenta de novo se a rede falhar)
const MODELO = '@cf/google/gemma-4-26b-a4b-it';
const NUMEROS = ['dias', 'ativos', 'blocos', 'focoMin', 'lazerMin', 'aguaBoa', 'respirar', 'semTelaMin', 'pausaDias', 'treinos', 'reflexoes', 'feitas'];
const CATEGORIAS = ['foco', 'agua', 'corpo', 'pausa', 'reflexao', 'tarefas', 'paradas', 'recomeco'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const NOMES = {
  dias: 'dias no período', ativos: 'dias com algum registro', blocos: 'blocos de foco', focoMin: 'minutos de trabalho e estudo',
  lazerMin: 'minutos de lazer', aguaBoa: 'dias com água Bom ou Excelente', respirar: 'respirações de 1 minuto', semTelaMin: 'minutos sem tela',
  pausaDias: 'dias com pausa', treinos: 'treinos', reflexoes: 'dias fechados com "Como foi seu dia?"', feitas: 'tarefas e rotinas feitas', paradas: 'tarefas paradas há 3 dias ou mais'
};
const TEMAS = {
  foco: 'blocos de foco', agua: 'água', corpo: 'treinos', pausa: 'pausas (respirar e tempo sem tela)', reflexao: 'fechar o dia com "Como foi seu dia?"',
  tarefas: 'tarefas feitas', paradas: 'tarefas paradas', recomeco: 'semana sem registros: recomeçar com um passo pequeno'
};

const inteiro = v => Number.isInteger(v) && v >= 0 && v <= 100000;

// Confere o pedido inteiro. Devolve null se algo vier fora do formato.
export function pedidoValido(b) {
  if (!b || !/^[A-Za-z0-9_-]{22,64}$/.test(b.id || '')) return null;
  if (b.tipo !== 'semana' && b.tipo !== 'mes') return null;
  const r = {};
  for (const k of NUMEROS) { if (!inteiro(b.r && b.r[k])) return null; r[k] = b.r[k]; }
  if (b.tipo === 'semana') {
    if (b.bem !== null && !CATEGORIAS.includes(b.bem)) return null;
    if (!CATEGORIAS.includes(b.melhorar)) return null;
    if (!inteiro(b.paradas) || (b.antes !== null && !inteiro(b.antes))) return null;
    return { id: b.id, tipo: 'semana', r, bem: b.bem, melhorar: b.melhorar, paradas: b.paradas, antes: b.antes };
  }
  if (!MESES.includes(b.mes) || !MESES.includes(b.proximo)) return null;
  return { id: b.id, tipo: 'mes', r, mes: b.mes, proximo: b.proximo };
}

const VOZ = 'Você é a Zumi, a abelha que guia a Rotina, um app gratuito de rotina saudável. Fale em português do Brasil, ' +
  'com carinho e frases curtas, para quem tem TDAH. Use "você", sem marcar gênero. Nunca culpe a pessoa. ' +
  'Nunca dê conselho médico, de remédio ou de dieta. Use só os números que receber; não invente número nem fato. ' +
  'Sem emoji, sem link, sem markdown. Responda só com um objeto JSON, sem nada antes ou depois.';

export function mensagens(p) {
  const linhas = NUMEROS.map(k => `- ${NOMES[k]}: ${p.r[k]}`);
  if (p.tipo === 'mes') {
    return [
      { role: 'system', content: VOZ },
      { role: 'user', content: `Números do mês de ${p.mes}:\n${linhas.join('\n')}\n\nEscreva uma frase de até 140 caracteres que celebre o mês e convide a levar o ritmo para ${p.proximo}. ` +
        'Formato: {"frase": "..."}' }
    ];
  }
  linhas.push(`- ${NOMES.paradas}: ${p.paradas}`);
  if (p.antes !== null) linhas.push(`- blocos de foco na semana anterior: ${p.antes}`);
  return [
    { role: 'system', content: VOZ },
    { role: 'user', content: `Números dos últimos 7 dias:\n${linhas.join('\n')}\n\n` +
      (p.bem ? `Ponto forte da semana: ${TEMAS[p.bem]}.\n` : 'Sem ponto forte nesta semana.\n') +
      `O que pede atenção: ${TEMAS[p.melhorar]}.\n\n` +
      'Escreva a sua opinião em quatro partes, cada uma com até 160 caracteres:\n' +
      '- "abertura": uma frase sobre a semana, citando um número.\n' +
      '- "bem": o ponto forte, com o número dele' + (p.bem ? '.' : ' (deixe vazio).') + '\n' +
      '- "melhorar": o que pede atenção, com o número dele, sem culpa.\n' +
      '- "conselho": uma ação pequena e concreta para os próximos dias, ligada ao que pede atenção.\n' +
      'Formato: {"abertura": "...", "bem": "...", "melhorar": "...", "conselho": "..."}' }
  ];
}

const limpo = (t, max) => typeof t === 'string' && t.trim().length >= (max > 0 ? 8 : 0) && t.length <= 240 && !/[<>]|https?:|www\./i.test(t);

// Texto que o modelo devolveu. Cada modelo do Workers AI responde num formato:
// { response: "..." }, { response: {...} }, { result: { response } } ou o formato de chat { choices: [{ message: { content } }] }.
export function textoDaSaida(saida) {
  if (!saida) return null;
  if (typeof saida === 'string') return saida;
  if (saida.result) return textoDaSaida(saida.result);
  if (saida.response !== undefined && saida.response !== null) return saida.response;
  const c = saida.choices && saida.choices[0];
  if (c && c.message && c.message.content !== undefined) return c.message.content;
  if (c && typeof c.text === 'string') return c.text;
  return null;
}

// Acha o último objeto JSON que dá para ler no texto (o modelo às vezes pensa em voz alta ou põe ```json em volta).
function ultimoJson(t) {
  t = t.replace(/<think>[\s\S]*?<\/think>/g, '');
  for (let fim = t.lastIndexOf('}'); fim >= 0; fim = t.lastIndexOf('}', fim - 1)) {
    for (let ini = t.lastIndexOf('{', fim); ini >= 0; ini = t.lastIndexOf('{', ini - 1)) {
      try { const o = JSON.parse(t.slice(ini, fim + 1)); if (o && typeof o === 'object') return o; } catch (e) { /* tenta o próximo */ }
    }
  }
  return null;
}

// Lê o JSON da resposta do modelo e confere cada parte.
export function lerResposta(saida, p) {
  const bruto = textoDaSaida(saida);
  let o = bruto && typeof bruto === 'object' ? bruto : null;
  if (!o && typeof bruto === 'string') o = ultimoJson(bruto);
  if (!o) return null;
  if (p.tipo === 'mes') return limpo(o.frase, 1) ? { frase: o.frase.trim() } : null;
  const r = {};
  for (const k of ['abertura', 'melhorar', 'conselho']) { if (!limpo(o[k], 1)) return null; r[k] = o[k].trim(); }
  if (p.bem) { if (!limpo(o.bem, 1)) return null; r.bem = o.bem.trim(); } else r.bem = '';
  return r;
}

// Conta um pedido. Devolve false se o dia (UTC, como a cota da Cloudflare) ou o aparelho já passaram do limite.
async function contar(env, id) {
  const dia = new Date().toISOString().slice(0, 10);
  const g = await env.DB.prepare('SELECT n FROM zumi_uso WHERE chave = ?').bind('g:' + dia).first();
  if (g && g.n >= LIMITE_DIA) return false;
  const a = await env.DB.prepare('SELECT n FROM zumi_uso WHERE chave = ?').bind('a:' + id + ':' + dia).first();
  if (a && a.n >= LIMITE_APARELHO) return false;
  const mais = 'INSERT INTO zumi_uso (chave, dia, n) VALUES (?, ?, 1) ON CONFLICT(chave) DO UPDATE SET n = n + 1';
  await env.DB.prepare(mais).bind('g:' + dia, dia).run();
  await env.DB.prepare(mais).bind('a:' + id + ':' + dia, dia).run();
  return true;
}

export async function limparUso(env, agora) {
  const antes = new Date(agora - 2 * 864e5).toISOString().slice(0, 10);
  await env.DB.prepare('DELETE FROM zumi_uso WHERE dia < ?').bind(antes).run();
}

// Devolve [status, corpo]
export async function zumi(env, b) {
  const p = pedidoValido(b);
  if (!p) return [400, { erro: 'dados' }];
  if (!env.AI) return [503, { erro: 'sem ia' }];
  if (!(await contar(env, p.id))) return [429, { erro: 'cota' }];
  let saida;
  try { saida = await env.AI.run(env.ZUMI_MODELO || MODELO, { messages: mensagens(p), max_tokens: 700, temperature: 0.6 }); }
  catch (e) { return [502, { erro: 'ia' }]; }
  const r = lerResposta(saida, p);
  if (!r) console.log('zumi: resposta recusada', JSON.stringify(saida).slice(0, 600));
  return r ? [200, r] : [502, { erro: 'resposta' }];
}
