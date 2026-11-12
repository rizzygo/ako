# Spec: trilhas que se cruzam

## Problema

Quem estuda no Ako escolhe uma trilha por área. Só que comunicação, feedback, prioridade e controle emocional aparecem em todas as áreas, e em toda altura da carreira. Hoje esse assunto vive num único tópico da Primeiros passos. Quem segue para Platform Engineering, ou para outra área, não volta a ele. E quem quer desenvolver software não tem trilha.

## Resultado esperado

A pessoa encontra as habilidades humanas numa trilha própria, que todas as outras apontam, e quem quer desenvolver tem uma trilha que termina no projeto "Qual é o B.O.?".

## Fora do escopo

- Trilhas novas de Dados, QA, Segurança e Produto. Elas entram depois, apontando para a mesma trilha de habilidades humanas.
- Mudar o formato do progresso salvo ou as chaves que já existem.
- Login obrigatório. Continua opcional.

## Critérios de aceite

- [ ] Dado que a pessoa abre `/trilhas/?trilha=habilidades-humanas`, quando escolhe um tópico, então vê o essencial, a seção "Na sua altura" com uma pergunta para cada cargo (júnior, pleno, sênior, especialista, tech lead e gestão), o checklist, materiais gratuitos conferidos e o desafio.
- [ ] Dado que a pessoa abre `/trilhas/?trilha=desenvolvimento`, quando chega na última etapa, então encontra o projeto "Qual é o B.O.?", com as sete etapas e a lição própria.
- [ ] Dado que a pessoa está na Primeiros passos, no tópico de comunicação, então vê o link para a trilha Habilidades humanas.
- [ ] Dado que a pessoa escolhe a área Desenvolvimento na ramificação, então vê o link para a trilha Desenvolvimento, como já acontece com Infraestrutura e Platform Engineering.
- [ ] Dado que a pessoa abre o mapa de Platform Engineering ou de Desenvolvimento, então a seção "Antes de começar" aponta para a trilha Habilidades humanas.
- [ ] Dado que a pessoa entrou com a conta, quando estuda as trilhas novas, então o progresso vai para a nuvem como nas outras.
- [ ] Quem já estudava Primeiros passos ou Platform Engineering não perde nada.

## Como conferir

- Comandos: `python3 trilhas/validar.py` e `node --check` em `trilhas/app.js`, `trilhas/mapas/mapas.js` e `conta.js`.
- Prévia: abrir as duas trilhas novas, um tópico de cada, o desafio, a lição "Qual é o B.O.?" e os mapas, no computador, no celular e no modo escuro.
- Dados antigos: as chaves `rizzygo-trilhas-v1` e `rizzygo-trilha-platform-engineering-v1` não mudam. As trilhas novas usam `rizzygo-trilha-habilidades-humanas-v1` e `rizzygo-trilha-desenvolvimento-v1`.

## Como funciona

- Trilha nova entra em quatro listas: `TRILHAS` de `app.js`, `TRILHAS` de `mapas/mapas.js`, `TRILHAS` de `/conta.js` e `OUTRAS_TRILHAS` de `validar.py`.
- O campo opcional `alturas` de um tópico traz uma pergunta por cargo. O app mostra a seção "Na sua altura" só quando o campo existe, e o prompt de "Estudar com IA" leva as perguntas junto.
- Um nó de `mapa_antes` pode apontar para o tópico de outra trilha com `"trilha"` e `"topico"`, ou para o mapa inteiro com `"mapa"`. É assim que as trilhas se cruzam sem copiar conteúdo.

## Decisões ligadas

- Nenhuma nova. Segue `decisoes/0001-sem-build.md`: tudo continua em JSON e JS puro.
