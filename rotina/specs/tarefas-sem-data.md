# Spec: tarefas sem data

<!-- Escrita em 12/11/2026, depois da entrega, para registrar o comportamento e servir de exemplo. -->

## Problema

Quem usa a Rotina para organizar o dia tem coisas que não quer esquecer e que não têm dia certo: trocar a senha do roteador, comprar algo para uma viagem. Antes, havia dois caminhos: pôr na lista de hoje, que enchia e virava culpa no fim do dia, ou marcar um dia inventado na Agenda. Para quem tem TDAH, uma lista de hoje longa trava o começo do dia.

## Resultado esperado

A pessoa guarda o que não tem dia num lugar próprio, separado por grupo, e a lista de hoje fica curta.

## Fora do escopo

- Prazo, lembrete ou notificação para item sem data.
- Grupos compartilhados com outra pessoa.
- Um sexto botão na barra de baixo: o Sem data é uma parte da aba Tarefas.

## Critérios de aceite

- [ ] Dado que a pessoa abre `#/tarefas/sem-data`, quando escreve um item e guarda, então ele aparece na lista, no grupo escolhido ou sem grupo.
- [ ] Dado que a pessoa nunca criou grupo, então vêm prontos Viagem ✈️, Mercado 🛒 e Comprar na internet 📦. Ela cria, edita e apaga os dela.
- [ ] Dado um item sem data, quando a pessoa escolhe "Hoje" ou um dia da Agenda, então ele sai do Sem data e entra na lista daquele dia.
- [ ] Dado um item guardado há mais de 30 dias, então ele mostra a etiqueta "Faz tempo" e a pergunta "Ainda quer?".
- [ ] Dado que a lista de hoje está vazia ou toda feita, então o painel Hoje lembra quantas coisas estão sem data.
- [ ] O Sem data não conta para a meta "Tudo feito por hoje".
- [ ] Dado quem já usava a Rotina antes, quando abre a versão nova, então nada some: tarefas, metas e lembretes continuam lá.

## Como conferir

- Comandos: `scripts/validar` e `node rotina/testes/e2e.js` (guarda um item sem data, recarrega e confere que ele continua lá, inclusive com dados de uma versão anterior).
- Prévia: Tarefas > Sem data no computador, no celular e no modo escuro. Criar grupo, mover item para hoje e para um dia da Agenda.
- Dados: item sem data é uma tarefa com `dia: null`, `grupo` e `criada`. Os grupos ficam em `grupos`. Quem não tinha esses campos ganha o valor padrão ao abrir.

## Decisões ligadas

- Os grupos com emoji e o painel separado foram pedidos pelo fundador quando aprovou a proposta, em 10/11/2026.
