# 0004: Push dos lembretes por um Cloudflare Worker

- Estado: aceita
- Data: 12/11/2026, escolha do fundador entre as opções abaixo

## Contexto

Os lembretes da Rotina rodam num relógio dentro da página. Com a página fechada, nada roda e o lembrete não aparece, no celular e no computador. O navegador não tem como agendar uma notificação sozinho: a API Notification Triggers parou no Chrome, e o Periodic Background Sync roda de horas em horas, sem horário certo. O único jeito que funciona com o app fechado é Web Push, e ele precisa de um servidor que mande o push na hora. A [0003](0003-firebase-opcional.md) dizia "sem servidor próprio"; esta decisão abre uma exceção só para o push.

## Decisão

Um Cloudflare Worker (`push/`) com Cron a cada minuto, banco D1 e Web Push com VAPID, sem biblioteca. O aparelho manda só os horários e uma chave de cada lembrete; o nome fica no aparelho, num cache que o service worker lê. Não pede conta. É opcional e começa desligado.

## Opções consideradas

- **Cloudflare Worker + D1 (escolhida):** custo zero no plano free (1.440 execuções do Cron por dia, contra 100 mil requests), mesma conta do Pages, não guarda o nome do lembrete.
- **Firebase Cloud Messaging + Cloud Functions:** exige o plano Blaze (cartão) e gasta leituras do Firestore a cada minuto.
- **Deixar como está:** zero custo, mas o lembrete de remédio não avisa com o app fechado.

## Consequências

- Passa a existir um servidor para manter: segredos VAPID, banco D1 e deploy com `wrangler` (passo a passo em [`push/README.md`](../push/README.md)).
- No plano free, um Worker faz até 50 subrequests por execução: o código manda até 40 push por minuto e deixa o resto para o minuto seguinte. Com muita gente no mesmo minuto, o aviso atrasa um pouco; o plano pago do Workers (US$5/mês) resolve.
- iPhone só recebe com o atalho na tela inicial (iOS 16.4+). Computador precisa do navegador aberto.
- A página de Privacidade explica o que vai para o servidor.
