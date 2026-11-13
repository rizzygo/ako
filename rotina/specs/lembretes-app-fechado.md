# Spec: avisar com o app fechado

<!-- Escrita em 12/11/2026, depois da escolha do fundador (decisão 0004). -->

## Problema

O lembrete da Rotina só aparece com o app aberto ou em segundo plano. Quem fecha a aba, ou o celular encerra o app, perde o aviso, inclusive o do remédio. Para quem tem TDAH, um lembrete que falha uma vez faz a pessoa parar de confiar nele.

## Resultado esperado

Quem liga "Avisar com o app fechado" recebe a notificação na hora, com a Rotina fechada, sem criar conta e sem que o servidor saiba do que é o lembrete.

## Fora do escopo

- Marcar "Feito" (e ganhar pontos) direto na notificação: tocar nela abre o app com o aviso.
- Lembrete de revisão das metas do trimestre: continua só com o app aberto.
- Push em navegador sem suporte (iPhone fora do atalho na tela inicial, iOS antes do 16.4).

## Critérios de aceite

- [ ] A opção fica em Ajustes, em Lembretes, desligada para todo mundo. Some quando o navegador não tem push ou o servidor não responde.
- [ ] No iPhone fora do atalho na tela inicial (Safari, sem push), a opção aparece desligada e explica como adicionar à Tela de Início; com iOS antes do 16.4, explica que precisa atualizar.
- [ ] Em Ajustes há uma chave "Notificações" que liga e desliga neste aparelho. Desligar também desliga o aviso com o app fechado; ligar de novo não pede nada se a permissão já foi dada. Quando o navegador bloqueou, a chave explica como liberar no iPhone, no Android e no computador, porque o site não consegue pedir de novo.
- [ ] Ligar pede a permissão de notificação, assina o push e manda ao servidor a agenda (horários, intervalos, dias, fuso) sem o nome do lembrete.
- [ ] O nome do lembrete fica num cache do aparelho, que o service worker usa no texto da notificação.
- [ ] Com a Rotina fechada, o lembrete no horário toca uma vez no dia escolhido; o por intervalo toca dentro do horário de avisos.
- [ ] A notificação tem "Daqui a 10 min" (o servidor manda de novo em 10 min) e "Ignorar dessa vez" (fecha e pronto). Tocar no texto abre a Rotina com o aviso.
- [ ] Com a Rotina aberta e na frente, no Chrome, o push não duplica o aviso que o app já mostrou.
- [ ] Mudou um lembrete no app: o servidor recebe a agenda nova em alguns segundos.
- [ ] Desligar apaga o aparelho do servidor e cancela a assinatura.

## Como conferir

- Comandos: `scripts/validar` roda `push/testes/` (agenda, cifra RFC 8291, JWT VAPID e o Worker com D1 simulado) e o e2e da Rotina (opção some sem servidor; ligar manda a agenda sem o nome; o service worker mostra a notificação com os dois botões).
- Prévia: só depois do Worker publicado. No Android, ligar, criar um lembrete para daqui a 2 min, fechar o Chrome e esperar. No iPhone, pelo atalho na tela inicial.
- Dados: campo novo só no `localStorage` `rizzygo-rotina-push-v1` (`id`, `on`), fora do estado da Rotina e fora da nuvem.

## Decisões ligadas

- [0004: push por um Cloudflare Worker](../../decisoes/0004-push-cloudflare-worker.md).
