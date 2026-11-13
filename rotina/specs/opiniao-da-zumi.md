# Spec: opinião da Zumi e meu mês com a Zumi

<!-- Escrita em 13/11/2026, a pedido do fundador. A Zumi é a IA: a tela fala da opinião e do conselho dela. -->

## Problema

A pessoa marca foco, água, treinos e tarefas todo dia, mas não enxerga o próprio caminho. Ela só percebe que a semana desandou quando o mês já acabou. E quem usa a Rotina não tem um jeito fácil de mostrar a outras pessoas o que conquistou.

## Resultado esperado

- **Toda segunda-feira**, a Zumi dá a opinião dela sobre a semana que passou: o que está indo bem, o que dá para melhorar e um conselho para a semana. Assim dá para corrigir a rota antes de o mês acabar.
- A qualquer dia, o chip **"Como estou indo?"** mostra a última opinião. Se ela não é de hoje, a pessoa pode pedir uma nova (uma por dia).
- **No começo do mês**, a Zumi fecha o mês anterior num card com os 4 melhores números da pessoa, para baixar ou compartilhar.
- O conselho vira um botão que já faz a ação (ex.: "Fazer o primeiro passo agora" abre as tarefas paradas).

## Fora do escopo

- Ler o texto das reflexões, o humor, o nome de tarefas, de lembretes ou de remédios. Nada disso sai do aparelho.
- Conversa livre com a Zumi (chat).
- Opinião automática sem a pessoa tocar num botão.

## Critérios de aceite

- [ ] O topo da Rotina mostra uma matriz com três células: "Como estou indo?", "Evolução" e "Ajustes", no celular e no computador.
- [ ] Trocar de aba (ou de parte da aba Tarefas) leva a tela para o topo.
- [ ] Na segunda-feira, se a última opinião é de antes dessa segunda, o painel Hoje mostra "A Zumi tem uma opinião sobre a sua semana" com o botão "Ver a opinião".
- [ ] "Pedir a opinião da Zumi" manda só números somados (blocos, minutos de foco, dias de água boa, respirações, minutos sem tela, treinos, reflexões feitas, tarefas feitas e paradas, dias ativos) e a categoria boa e a que precisa de atenção, escolhidas no aparelho.
- [ ] Se o Worker não responde, a cota acabou ou a resposta veio estranha, a Zumi mostra um texto pronto feito com as mesmas regras. A pessoa nunca fica sem resposta.
- [ ] A opinião fecha sempre com "Estou com você. Espero que continue assim, muito mel pra você! Tmj! Zumi 🐝" (vem do código, não da IA).
- [ ] Pedir de novo no mesmo dia não chama a IA: mostra a opinião de hoje.
- [ ] Do dia 1 ao dia 7, se o mês anterior teve 3 dias ativos ou mais, o painel Hoje mostra "A Zumi fechou o seu <mês>" com "Ver meu mês".
- [ ] O card do mês mostra os 4 maiores números diferentes de zero, o título (opcional) e uma frase da Zumi. "Compartilhar" usa o menu do aparelho quando existe; "Baixar a imagem" salva um PNG 1080x1350.
- [ ] Dados antigos abrem sem erro: o campo novo `zumi` nasce vazio.

## Como conferir

- Comandos: `scripts/validar` (inclui `node rotina/testes/opiniao.test.js`, `node push/testes/worker.test.mjs` com a rota `/zumi` e o e2e da Rotina).
- Prévia: abrir com dados de uma semana, tocar em "Como estou indo?" e pedir a opinião (sem o Worker no ar, aparece o texto pronto). Conferir no celular e no modo escuro. Gerar o card do mês e baixar.
- Dados: campo novo `S.zumi = { op: null, mes: null }`. `op` guarda a última opinião (data, textos, categorias, se veio da IA). `mes` guarda o último mês fechado.
