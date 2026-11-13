# Push da Rotina

Cloudflare Worker que faz os lembretes da [Rotina](../rotina/) avisarem com o app fechado. Por que um servidor e por que este: [decisão 0004](../decisoes/0004-push-cloudflare-worker.md). O que a pessoa vê: [spec](../rotina/specs/lembretes-app-fechado.md).

## Como funciona

1. Em Ajustes, a pessoa liga "Avisar com o app fechado". O app assina o push do navegador e manda ao Worker a agenda: chaves dos lembretes, horários, intervalos, dias e fuso. **Sem o nome do lembrete.**
2. O nome fica no aparelho, no cache `zumi-push`, que o service worker da Rotina lê.
3. A cada minuto, o Cron roda `vencidos()` (em `agenda.mjs`) para cada aparelho e manda um push cifrado com só a chave: `{"k":"m1abc"}`.
4. O service worker monta a notificação ("Hora de: Tomar o remédio.") com os botões "Daqui a 10 min" e "Ignorar dessa vez".

| Arquivo | O que faz |
| --- | --- |
| `worker.mjs` | Rotas (`GET /chave`, `POST /aparelho`, `/adiar`, `/remover`) e o Cron |
| `agenda.mjs` | Decide o que toca agora; confere a agenda que chega |
| `webpush.mjs` | VAPID (RFC 8292) e cifra aes128gcm (RFC 8291) só com WebCrypto |
| `schema.sql` | Tabela `aparelhos` do D1 |
| `gerar-chaves.mjs` | Gera o par de chaves VAPID |
| `testes/` | Testes sem rede; o `scripts/validar` roda os dois |

## Publicar (uma vez)

No Mac, na pasta do repositório `ako`, com Node 20 ou mais novo:

```sh
cd push
npx wrangler login                                   # abre o navegador para entrar na conta Cloudflare
npx wrangler d1 create rotina-push                   # mostra um database_id
```

Cole o `database_id` no `wrangler.toml`, no lugar de `COLE-AQUI-O-ID-DO-D1` (o id não é segredo; pode commitar).

```sh
npx wrangler d1 execute rotina-push --remote --file=schema.sql
node gerar-chaves.mjs                                # mostra VAPID_PUBLIC e VAPID_PRIVATE
npx wrangler secret put VAPID_PUBLIC                 # cole o valor depois do "="
npx wrangler secret put VAPID_PRIVATE
npx wrangler deploy
```

Confira: <https://rotina-push.rizzygo.com.br/chave> mostra `{"chave":"B..."}`. A partir daí, a opção aparece em Ajustes da Rotina.

**Nunca** troque as chaves VAPID depois de publicado: todas as assinaturas param de funcionar e cada pessoa precisa desligar e ligar de novo.

## Mudar o Worker depois

Edite, rode `scripts/validar` e, com a PR mesclada, `cd push && npx wrangler deploy`. O Pages não publica o Worker.

## Limites do plano free

- Workers: 100 mil requests por dia (o Cron gasta 1.440) e até 50 subrequests por execução. O Cron manda no máximo 40 push por minuto e deixa o resto para o minuto seguinte, em ordem aleatória.
- D1: o Cron lê a tabela inteira a cada minuto. Com 1.000 aparelhos são 1,44 milhão de linhas lidas por dia, dentro dos 5 milhões do free. Passou disso, o plano pago do Workers (US$5/mês) cobre.
- Aparelho que não manda a agenda há 60 dias sai da tabela. Assinatura que o serviço de push dá como morta (404 ou 410) sai na hora.
