# Spec: trilha Cloud com AWS e Google Cloud

## Problema

Quem termina a Primeiros passos e escolhe infraestrutura cai direto na Platform Engineering, que começa em Docker e Kubernetes. Falta a nuvem: conta, IAM, rede, máquinas, storage, serverless e custo. O mapa de Infraestrutura apresentava só o Google Cloud, e a AWS é a nuvem mais pedida nas vagas.

## Resultado esperado

A pessoa estuda AWS e Google Cloud lado a lado numa trilha própria, entre a Primeiros passos e a Platform Engineering, sem gastar dinheiro e sem susto na fatura.

## Fora do escopo

- Azure. Fica como nó opcional no mapa de Infraestrutura.
- Preparação para certificação. As provas aparecem só em "Para ir além", como opcionais pagas.
- Mudar o formato do progresso salvo.

## Critérios de aceite

- [ ] Dado que a pessoa abre `/trilhas/?trilha=cloud`, então vê 6 etapas e 14 tópicos, cada um com essencial, checklist, desafio e materiais conferidos.
- [ ] Dado que a pessoa abre um tópico, então cada material mostra uma etiqueta: Conteúdo Rizzygo, Gratuito ou Pago. Vale para todas as trilhas.
- [ ] Dado que a pessoa escolhe Infraestrutura na Primeiros passos, então o próximo caminho sugerido é a trilha Cloud.
- [ ] Dado que a pessoa abre o mapa da Platform Engineering, então "Antes de começar" aponta para a trilha Cloud.
- [ ] Dado que a pessoa quer treinar sem conta, então o tópico de CLI aponta emuladores gratuitos (Moto, LocalStack Hobby, DynamoDB local, emuladores da gcloud) e o AWS Educate.
- [ ] Dado que a pessoa entrou com a conta, então o progresso da trilha Cloud vai para a nuvem como nas outras.

## Como conferir

- Comandos: `scripts/validar`.
- Prévia: a trilha, um tópico, o desafio, as 6 lições novas e o mapa de Infraestrutura, no computador, no celular e no modo escuro.
- Dados antigos: as chaves existentes não mudam. A trilha nova usa `rizzygo-trilha-cloud-v1`.

## Como funciona

- `dados/cloud.json`, registrado nas quatro listas (`app.js`, `mapas/mapas.js`, `/conta.js`, `validar.py`).
- A área `infra` da Primeiros passos aponta para `cloud`. A trilha Cloud termina apontando para a Platform Engineering.
- A etiqueta sai do próprio recurso: `gratuito` começando com "não" vira Pago; link para `./materiais/`, `../favos/` ou outra trilha vira Conteúdo Rizzygo; o resto vira Gratuito.

## Decisões ligadas

- Nenhuma nova. Segue `decisoes/0001-sem-build.md`.
