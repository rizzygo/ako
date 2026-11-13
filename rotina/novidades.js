// Novidades da Rotina: a lista de cada mês, o pop-up que aparece uma vez só e a página /rotina/novidades/.
// Spec: rotina/specs/manual-e-novidades.md. Edição nova entra no TOPO de EDICOES; o pop-up mostra os 3 primeiros itens.
(function () {
  'use strict';

  var EDICOES = [
    {
      id: '2026-11',
      titulo: 'Novidades de novembro',
      resumo: 'A Zumi agora dá opinião sobre a sua semana, as tarefas se repetem sozinhas e os lembretes chegam com o app fechado.',
      itens: [
        { ic: '🐝', titulo: 'Opinião da Zumi toda segunda', texto: 'Toque em "Como estou indo?". A Zumi conta o que está indo bem, o que dá para melhorar e dá um conselho para a semana.', link: '/rotina/manual/#opiniao' },
        { ic: '🔁', titulo: 'Tarefas que se repetem', texto: 'Na Agenda, use Repetir: toda terça, em dias escolhidos, na 3ª segunda do mês ou na última sexta.', link: '/rotina/manual/#agenda' },
        { ic: '🔔', titulo: 'Lembretes com o app fechado', texto: 'Em Ajustes, ligue "Avisar com o app fechado" e o lembrete chega mesmo com a Rotina fechada. No iPhone, abra pelo ícone da tela inicial.', link: '/rotina/manual/#lembretes' },
        { ic: '🗓️', titulo: 'Meu mês com a Zumi', texto: 'Do dia 1 ao dia 7, a Zumi fecha o mês num card com os seus números, para guardar ou compartilhar.', link: '/rotina/manual/#meu-mes' },
        { ic: '⏱️', titulo: 'O mesmo relógio no celular e no computador', texto: 'Com a conta ligada, o bloco de foco que começou num aparelho aparece no outro com o mesmo tempo.', link: '/rotina/manual/#foco' },
        { ic: '✏️', titulo: 'Editar e mudar a ordem', texto: 'A caneta muda o texto de tarefas, metas e lembretes. A alça ⠿ arrasta a tarefa para outra posição.', link: '/rotina/manual/#tarefas' },
        { ic: '🧭', titulo: 'Manual da Rotina', texto: 'O botão ? no topo abre o manual, com uma imagem de cada parte do app.', link: '/rotina/manual/' }
      ]
    }
  ];

  var CHAVE = 'rizzygo-rotina-novidades-v1';
  function lerVista() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function marcarVista(id) { try { localStorage.setItem(CHAVE, id); } catch (e) { /* sem localStorage, o pop-up volta: tudo bem */ } }

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'texto') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  function itemLista(it) {
    return el('li', {}, [
      el('span', { class: 'novas-ic', 'aria-hidden': 'true', texto: it.ic }),
      el('div', {}, [el('b', { texto: it.titulo }), el('p', { texto: it.texto })])
    ]);
  }

  // Pop-up: só para quem já usava a Rotina e ainda não viu a edição mais nova.
  // Devolve true (mostrou), false (nada a mostrar) ou 'depois' (outro aviso está aberto).
  // novo = true quando a pessoa abriu a Rotina pela primeira vez: marca a edição como vista e não mostra nada.
  function talvezMostrar(opcoes) {
    var ed = EDICOES[0];
    if (!ed || lerVista() === ed.id) return false;
    if (opcoes && opcoes.novo) { marcarVista(ed.id); return false; }
    if (document.querySelector('.sobre:not([hidden]), .recomeco:not([hidden]), .novas')) return 'depois'; // outro aviso aberto: tenta de novo mais tarde
    var mostrar = ed.itens.slice(0, 3), resto = ed.itens.length - mostrar.length;
    var fechar = function () { marcarVista(ed.id); fundo.remove(); document.removeEventListener('keydown', tecla); };
    var tecla = function (e) { if (e.key === 'Escape') fechar(); };
    var entendi = el('button', { type: 'button', class: 'btn btn-sec', texto: 'Entendi' });
    var todas = el('a', { class: 'btn', href: '/rotina/novidades/', texto: resto > 0 ? 'Ver todas (mais ' + resto + ')' : 'Ver as novidades' });
    entendi.addEventListener('click', fechar);
    todas.addEventListener('click', function () { marcarVista(ed.id); });
    var caixa = el('div', { class: 'novas-caixa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'novas-titulo' }, [
      el('div', { class: 'novas-cab' }, [
        el('img', { src: '/zumi/abelha-ola.png', width: '72', height: '72', alt: '' }),
        el('div', {}, [el('p', { class: 'novas-sobre', texto: 'O que mudou na Rotina' }), el('h2', { id: 'novas-titulo', texto: ed.titulo })])
      ]),
      el('ul', { class: 'novas-lista' }, mostrar.map(itemLista)),
      el('div', { class: 'novas-acoes' }, [todas, entendi])
    ]);
    var fundo = el('div', { class: 'novas' }, [caixa]);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fundo);
    caixa.setAttribute('tabindex', '-1');
    caixa.focus({ preventScroll: true }); // começa do topo, com a Zumi e o título à vista
    caixa.scrollTop = 0;
    return true;
  }

  // Página /rotina/novidades/: todas as edições, da mais nova para a mais antiga.
  function montarPagina(alvo) {
    EDICOES.forEach(function (ed) {
      var lista = el('ul', { class: 'novas-lista' }, ed.itens.map(function (it) {
        var li = itemLista(it);
        if (it.link) li.querySelector('div').appendChild(el('a', { href: it.link, texto: 'Como usar' }));
        return li;
      }));
      alvo.appendChild(el('section', { class: 'novas-edicao', id: 'ed-' + ed.id, 'aria-labelledby': 't-' + ed.id }, [
        el('h2', { id: 't-' + ed.id, texto: ed.titulo }), el('p', { class: 'lead', texto: ed.resumo }), lista
      ]));
    });
    if (EDICOES[0]) marcarVista(EDICOES[0].id);
  }

  var api = { EDICOES: EDICOES, CHAVE: CHAVE, talvezMostrar: talvezMostrar, montarPagina: montarPagina };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.RotinaNovidades = api;
})();
