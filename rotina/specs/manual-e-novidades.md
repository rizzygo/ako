# Spec: manual da Rotina e novidades do mês

<!-- Escrita em 13/11/2026, a pedido do fundador. -->

## Problema

A Rotina ganhou muitas funções em poucas semanas: tarefas que se repetem, lembretes com o app fechado, a opinião da Zumi, o card do mês. Quem usa não sabe para que serve cada parte. Quem já usava não percebe o que mudou. A melhoria passa despercebida e a pessoa não volta para usar.

## Resultado esperado

- Um **manual** em `/rotina/manual/`, com um print de cada função e um texto curto que diz para que ela serve e como usar.
- Um **ícone de ajuda (?)** no topo da Rotina, ao lado do botão de tema, e um link no rodapé. Os dois levam ao manual.
- Uma página de **novidades** em `/rotina/novidades/`, com o que mudou em cada mês.
- Uma vez por mês, um **pop-up de novidades** aparece uma única vez para quem abre a Rotina. Ele mostra até 3 novidades, diz quantas outras há e leva à página de novidades.

## Fora do escopo

- Tour guiado dentro do app, passo a passo sobre a tela.
- Novidades por e-mail ou push.
- Manual das Trilhas e dos Mapas.

## Critérios de aceite

- [ ] O topo da Rotina tem um botão "?" ao lado do botão de tema. Ele leva a `/rotina/manual/`.
- [ ] O rodapé da Rotina tem os links "Manual da Rotina" e "Novidades".
- [ ] O manual tem uma seção com print para cada parte: o topo com a Zumi, Hoje, Fim do dia, Foco, Tarefas (Hoje, Agenda e Sem data), Bem-estar, Metas, Evolução (opinião da Zumi, meu mês, semana e títulos) e Ajustes (lembretes, nuvem e celular). Também tem um índice com âncoras, pontos e títulos, e seus dados.
- [ ] Quem já usava a Rotina vê o pop-up da edição mais nova uma única vez. Fechar ("Entendi") ou ir para a página de novidades marca a edição como vista, e o pop-up não volta.
- [ ] Quem abre a Rotina pela primeira vez não vê o pop-up. A edição atual já fica marcada como vista.
- [ ] O pop-up não aparece por cima de outro aviso aberto (respiração, recomeço, nuvem).
- [ ] As novidades saem de um lugar só, `rotina/novidades.js`, usado pelo pop-up e pela página.

## Como conferir

- Comandos: `scripts/validar`. O e2e confere o botão de ajuda, os links do rodapé, o pop-up que aparece uma vez só e as páginas do manual e das novidades sem erro de JavaScript.
- Prévia: abra a Rotina com dados antigos e veja o pop-up. Recarregue e confira que ele não volta. Abra o manual no celular, no computador e no modo escuro.
- Dados: a chave `rizzygo-rotina-novidades-v1` do `localStorage` guarda o id da última edição vista (ex.: `2026-11`). Ela não vai para a nuvem.

## Como publicar uma edição nova

1. No começo do mês, acrescente a edição no topo da lista `EDICOES` em `rotina/novidades.js`, com `id` (`AAAA-MM`), título e itens. A ordem dos itens é a ordem de importância, porque o pop-up mostra os 3 primeiros.
2. Troque o `?v=` do `novidades.js` no `index.html` e no `sw.js`, e o `CACHE` do `sw.js`.
3. Se a novidade muda o jeito de usar, atualize a seção do manual e o print.
