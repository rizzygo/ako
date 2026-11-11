# 0003: Conta e nuvem opcionais com Firebase

- Estado: aceita
- Data: registrada em 11/11/2026; vale desde 09/11/2026 (ako#29)

## Contexto

Quem estuda no Ako quer continuar de outro aparelho. O site é estático no Cloudflare Pages, que não oferece login para o público. O custo precisa ficar em zero, e quem não quer conta precisa continuar usando tudo.

## Decisão

Login opcional com Google ou e-mail e senha pelo Firebase Authentication e uma cópia dos dados no Cloud Firestore, no plano gratuito. Sem servidor próprio e sem Cloud Functions. O site continua no Cloudflare Pages. Detalhes em [`firebase/README.md`](../firebase/README.md).

## Opções consideradas

- **Firebase Auth + Firestore (escolhida):** login pronto, regras por usuário, plano gratuito suficiente para o começo.
- **Só `localStorage`:** zero custo e zero dado pessoal, mas o progresso fica preso a um aparelho.
- **Back-end próprio:** controle total, mas custo e manutenção que o projeto não tem como bancar agora.

## Consequências

- O progresso local continua sendo a fonte; a nuvem é uma cópia. Sem conta, nada sai do aparelho.
- A cota diária do plano gratuito vale para todo mundo junto. O código lê e grava o mínimo e avisa quando a cota acaba.
- As regras do Firestore são um arquivo só para o Ako e o site principal. Mudou um lado, mude o outro e publique pelo console.
