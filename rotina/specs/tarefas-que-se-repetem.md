# Spec: tarefas que se repetem

## Problema

Quem usa a Rotina tem compromissos que voltam com um ritmo próprio: a feira todo sábado, uma atividade toda terça, uma reunião só na última sexta do mês. Antes, havia dois caminhos: a rotina, que volta todo dia e enche a lista, ou marcar cada data na Agenda, uma por uma. Para quem tem TDAH, lembrar de anotar de novo toda semana é justamente o que falha.

## Resultado esperado

A pessoa cria a tarefa uma vez, escolhe como ela se repete, e ela aparece na lista de hoje só nos dias certos.

## Fora do escopo

- Repetir a cada N dias ou a cada N semanas (ex.: a cada 15 dias).
- Dia fixo do mês por número (ex.: todo dia 10).
- Data de fim da repetição. Para parar, a pessoa usa "Parar de repetir".
- Pular uma ocorrência sem marcar como feita.
- Aviso ou notificação no dia: quem precisa disso usa um lembrete em Ajustes.

## Critérios de aceite

- [ ] Dado que a pessoa escolhe um dia na Agenda, quando abre Repetir, então vêm as opções daquele dia: Não repetir, "Toda terça", "Escolher os dias", "Toda 4ª terça do mês" (até a 4ª) e "Toda última terça do mês" (só se o dia está na última semana do mês).
- [ ] Dado "Escolher os dias", então aparecem os dias da semana, com o dia escolhido já marcado. Sem nenhum dia marcado, a Zumi pede para escolher.
- [ ] Dado uma tarefa que se repete, então ela entra na lista de hoje só nos dias da regra, a partir do dia escolhido, e nunca antes dele.
- [ ] Dado um dia da regra, então o calendário marca o dia e a lista daquele dia mostra a tarefa com a etiqueta da regra (ex.: "🔁 toda última terça do mês").
- [ ] Cada dia é marcado à parte: concluir hoje não marca a próxima vez.
- [ ] Em dia futuro, a linha não tem o ×: tirar de um dia tiraria de todos. Para parar, a pessoa usa "Parar de repetir" em "Tarefas que se repetem", ou o × na lista de hoje.
- [ ] Dado quem já usava a Rotina, quando abre a versão nova, então nada muda: rotina sem regra continua voltando todo dia.

## Como conferir

- Comandos: `scripts/validar` e `node rotina/testes/e2e.js` (passo 2b, com relógio falso: cria "toda última terça do mês" e "terças e sábados", confere a Agenda, a lista de hoje antes do dia e na última terça de dezembro, e marca como feita).
- Prévia: Tarefas > Agenda no computador, no celular e no modo escuro. Criar uma de cada tipo, abrir "Tarefas que se repetem", parar uma.
- Dados: tarefa que se repete é uma rotina (`rotina: true`) com `repete`: `{ dias: [2, 6], desde }` ou `{ ordem: 3, dia: 1, desde }`, em que `ordem: -1` é a última e `dia` vai de 0 (domingo) a 6. `desde` é o dia escolhido na Agenda. Sem `repete`, a rotina volta todo dia, como antes. Campo novo e opcional: dado antigo não precisa de migração.

## Decisões ligadas

- Pedido do fundador em 13/11/2026: "toda segunda-feira", "3ª segunda-feira do mês" e "última sexta-feira do mês", para ver nas tarefas do dia.
