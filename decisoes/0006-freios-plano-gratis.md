# 0006: Freios contra robô para o plano grátis não acabar

- Estado: aceita
- Data: 14/11/2026, pedido do fundador

## Contexto

O Ako roda nos planos grátis da Cloudflare e do Firebase. Neles, passar da cota não gera conta: o serviço para até a cota zerar. O risco de um ataque é deixar todo mundo sem lembrete, sem opinião da Zumi ou sem nuvem até o dia seguinte.

O que pode acabar, e com quê:

| Serviço | Cota grátis | Quem gasta |
| --- | --- | --- |
| Pages (site) | Requests estáticos sem limite | Ninguém esgota |
| Worker `rotina-push` | 100 mil requests por dia (zera 00:00 UTC) | Qualquer pedido ao Worker, até um 404 |
| D1 | 5 milhões de linhas lidas e 100 mil gravadas por dia | O Cron lê a tabela inteira a cada minuto; robô que cria aparelho falso multiplica isso |
| Workers AI | 10 mil neurons por dia | `/zumi`, já com teto de 900 por dia e 3 por aparelho |
| Firestore | 50 mil leituras e 20 mil gravações por dia, 10 GiB por mês de saída | Só quem entra com a conta Google; as regras deixam cada um mexer só no próprio documento |

## Decisão

Três camadas, da borda para dentro:

1. **Uma regra de rate limiting no WAF** (o plano Free tem uma): por IP, nos caminhos do Worker. Pedido barrado ali não chega ao Worker. Passo a passo em [`push/README.md`](../push/README.md).
2. **Binding de rate limit no Worker** (`LIMITE`): 20 POST por minuto por IP e por rota. O IP não é gravado. Se o binding falhar, o pedido passa, para o freio não derrubar o lembrete.
3. **Teto de aparelhos no D1:** no máximo 300 aparelhos novos por dia e 3.000 no total. Com 3.000, o Cron lê 4,3 milhões de linhas por dia, abaixo dos 5 milhões.

O endereço `*.workers.dev` foi desligado: ele passaria por fora do WAF.

## Opções consideradas

- **Durable Objects para um contador global exato:** mais preciso, mas mais código e mais cota para um risco pequeno. Fica para quando houver muito uso.
- **Turnstile no `/aparelho`:** barra robô de verdade, mas pede um widget e uma chave a mais. Fica como próximo passo se a camada 3 começar a encher.
- **App Check no Firestore:** barra script fora do navegador. Exige chave do reCAPTCHA e ligar o enforcement no console; a cota grátis do reCAPTCHA é de 10 mil avaliações por mês. Fica como próximo passo, com o OK do fundador.

## Consequências

- Os contadores da Cloudflare são por data center e aproximados: um ataque espalhado ainda passa um pouco. A cota diária continua sendo o teto final, sem cobrança.
- Passou de 3.000 aparelhos, quem liga os avisos recebe "chegou ao limite de agora". Aí é hora de otimizar o Cron (ler só quem vence no minuto) ou ir para o Workers Paid.
- Publicar: `cd push && npx wrangler deploy`. A regra do WAF é no painel.
