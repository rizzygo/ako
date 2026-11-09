# Rotina com a Zumi

Um app gratuito para manter o foco no trabalho e no estudo sem largar o lazer, a água, a respiração e as pausas longe da tela. A Zumi guia o dia. Fica em **https://ako.rizzygo.com.br/rotina/**.

## O problema: um bloco emendado no outro

Quem trabalha e estuda emenda um bloco no outro. A água fica para depois, o corpo trava, o lazer vira culpa e o dia termina sem saber o que deu certo.

## O que o app faz no dia

| Parte | Como funciona |
| --- | --- |
| Blocos do dia | Timer de foco e pausa para **trabalho** e **estudo**, e um bloco de **lazer** que também vale ponto. A pessoa ajusta todos os tempos. |
| Lembretes | Água, respiração e pausa sem tela, cada um com o seu intervalo, só dentro do horário escolhido. |
| Seus lembretes | A pessoa cria os dela, como tomar um remédio: todo dia num horário ou a cada X minutos. |
| Respiração guiada | Um minuto: 4 segundos inspirando e 6 soltando, com uma bolha que cresce e diminui. |
| Tempo sem tela | A pessoa escolhe 5, 10, 15 ou 30 minutos, 1 hora ou 2 horas, e, se quiser, para quê: família, saúde, descanso ou outra coisa. Pode bloquear o celular: na volta, a Zumi conta o tempo. Quem volta antes ganha os pontos do tempo que já cumpriu. |
| Água | Sem contar copos: no fim do dia a pessoa marca se a água foi Ruim, Bom ou Excelente. Os lembretes cuidam do resto. O histórico mostra os últimos 7 dias, e qualquer um deles pode ser corrigido. A média dos últimos 7 e 30 dias considera só os dias marcados. |
| Tarefas e rotinas | Lista do dia com tarefas, que somem quando concluídas, e rotinas, que voltam todo dia. A estrela marca ou tira a prioridade, e as prioridades sobem para o topo. |
| Metas do ano | Poucas metas por ano. Cada uma tem quatro trimestres, e no fim de cada um a Zumi pergunta se a meta está no caminho, atrasada, parada ou concluída. |
| Checks de exercício | Academia, corrida e aeróbico, uma vez por dia cada. |
| Fim do dia | Uma pergunta de reflexão por dia, respondida no app ou no papel. Depois vem a revisão: quantos itens saíram, o que ficou pendente (vai para amanhã ou sai da lista) e o que já entra na lista de amanhã. |
| Pontos e títulos | Cada ação soma pontos e o título sobe. A semana aparece num gráfico de barras. |

## Quanto vale cada ação

| Ação | Pontos | Limite por dia |
| --- | --- | --- |
| Bloco de trabalho, estudo ou lazer concluído | 10 | sem limite |
| Água do dia marcada como Bom / Excelente | 10 / 20 | 1 vez |
| Respirar 1 minuto | 5 | 6 vezes |
| Tempo sem tela: 5, 10, 15, 30 min, 1 h, 2 h | 5, 8, 10, 15, 25, 40 | 60 pontos |
| Academia, corrida ou aeróbico | 20 cada | 1 vez cada |
| Reflexão do fim do dia | 10 | 1 vez |
| Lembrete próprio marcado como feito | 2 | 10 vezes |
| Tarefa ou rotina concluída | 3, ou 5 se for prioridade | 40 pontos |
| Revisão trimestral de uma meta | 10 | 5 metas |
| Dia sem nenhuma atividade | −10 | 7 dias seguidos |

Pular um bloco não dá ponto. Um dia comum, com quatro blocos, água boa, uma respiração, 30 minutos sem tela, um exercício e a reflexão, rende cerca de 100 pontos.

## O dia fecha às 23h59

À meia-noite o dia fecha sozinho e guarda os pontos e o nível da água. Na próxima vez que a pessoa abre o app, a Zumi conta como o dia de ontem fechou.

Dia sem nenhuma atividade tira 10 pontos. Só abrir o app não conta: vale marcar a água, marcar uma tarefa, fazer um bloco ou qualquer outro check. A perda para em 7 dias seguidos, para quem some não voltar zerado. Depois de mais de 7 dias parados, a Zumi pergunta se a pessoa quer zerar e começar de novo. Zerar apaga pontos, títulos e histórico e mantém metas, tarefas, lembretes e ajustes. Quem esqueceu de marcar pode corrigir a água de um dos últimos 7 dias, e isso tira a perda daquele dia. O título conquistado nunca cai: a ideia é seguir construindo a colmeia aos poucos.

## Títulos da colmeia

A Zumi é uma abelha sem ferrão. As abelhas sem ferrão guardam o mel em potes de cera, e os títulos seguem a vida da colmeia.

| Pontos | Título | O que a Zumi diz |
| --- | --- | --- |
| 0 | Primeiro zumbido | Você chegou na colmeia. Agora é achar o seu ritmo. |
| 60 | Primeiro voo | Um dia inteiro de rotina. O voo começou. |
| 200 | Rota do néctar | Você já conhece o caminho. Agora é repetir. |
| 500 | Guarda da entrada | Você protege o seu foco e também o seu descanso. |
| 1000 | Construção do favo | Cada dia vira um pedaço da estrutura. |
| 2000 | Pote de mel | A rotina já rende. Guarde o que funcionou. |
| 4000 | Colmeia em ritmo | Trabalho, estudo e lazer no mesmo compasso. |

Com cerca de 100 pontos por dia, o segundo título chega no primeiro dia e o último em umas seis semanas.

## Quando a Zumi pede a revisão das metas

Nos últimos 15 dias de cada trimestre, a Zumi avisa uma vez por dia enquanto houver meta sem resposta. Se o trimestre virar sem revisão, ela ainda pergunta nos primeiros 30 dias do seguinte. A pessoa também pode revisar a qualquer hora. Uma meta concluída não pede mais revisão.

Tarefa que não saiu e não passou pela revisão continua na lista no dia seguinte, com a etiqueta "Veio de antes".

## Como o app foi feito

- HTML, CSS e JavaScript puro, sem build, como o resto do Ako. Carrega o `ds/rizzygo.css` primeiro.
- Os dados ficam no `localStorage` do aparelho, na chave `rizzygo-rotina-v1`. Sem login e sem servidor. O app guarda os últimos 60 dias e mantém os pontos dos dias mais antigos.
- É um PWA: `manifest.webmanifest` e `sw.js` deixam instalar na tela inicial e abrir sem internet.
- O relógio usa o horário de término, não um contador. Se o navegador segurar a aba, o tempo continua certo quando ela volta.

## O limite dos lembretes: app fechado não avisa

Os avisos funcionam enquanto o app está aberto, mesmo em outra aba, minimizado ou instalado e em segundo plano. Com o app **fechado**, o navegador não acorda a página sozinho: isso exige Web Push, com um servidor que mande o aviso na hora certa.

Próximo passo, se o MVP pegar: um Cloudflare Worker com Cron Trigger que guarda só a inscrição de push e os horários, sem dado pessoal, e manda o aviso. No iPhone, o push só funciona com o app instalado na tela inicial.

## O que cada arquivo faz

| Arquivo | O que é |
| --- | --- |
| `index.html` | A página |
| `rotina.css` | O estilo só desta página |
| `rotina.js` | Timer, lembretes, pontos, títulos e reflexão |
| `sw.js` | Service worker: cache para abrir sem internet e clique na notificação |
| `manifest.webmanifest` | Nome, ícones e modo de tela cheia do app instalado |

Mudou o CSS ou o JS? Troque o `?v=` no `index.html` e o nome do `CACHE` no `sw.js`.
