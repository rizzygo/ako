# 0005: A IA da Zumi roda no Cloudflare Workers AI

- Estado: aceita
- Data: 13/11/2026, escolha do fundador depois do discovery de IA gratuita

## Contexto

A Rotina passa a ter a opinião da Zumi sobre a semana e o fechamento do mês. Um modelo de linguagem escreve o texto. A Rotina é gratuita, então a IA precisa caber num free tier, sem cartão, e não pode expor dado de saúde ou de humor.

## Decisão

O Worker que já manda o push ganha a rota `POST /zumi`, que chama o Workers AI (binding `AI`). O aparelho soma os números e escolhe as categorias. O Worker só escreve o texto. Ele não grava o resumo nem a resposta, conta os pedidos do dia num D1 (`zumi_uso`) e para antes da cota grátis. Sem resposta, o aparelho usa um texto pronto.

## Opções consideradas

- **Cloudflare Workers AI (escolhida):** 10.000 neurons por dia grátis, e passou disso dá erro, sem cobrança. A Cloudflare não usa o conteúdo para treinar modelos. O Worker e a conta já existem.
- **Firebase AI Logic (Gemini Developer API, free tier):** grátis sem faturamento, mas no free tier o Google usa o conteúdo para melhorar produtos e pessoas podem revisá-lo. Os termos também pedem 18 anos e dizem que a API não é para uso de consumidor. Desde 02/11/2026 exige App Check.
- **IA do Chrome (Gemini Nano no aparelho):** grátis e privada, mas só no Chrome de computador com bastante memória. Não roda em Android nem iPhone, e o português não aparece na lista de idiomas.

## Consequências

- Um pedido gasta perto de 10 neurons, então a cota dá cerca de 900 pedidos por dia. O Worker para em 900 e o aparelho mostra o texto pronto.
- Publicar o Worker exige rodar de novo o `schema.sql` no D1 (tabela `zumi_uso`) e o `wrangler deploy` (passo a passo em [`push/README.md`](../push/README.md)).
- Trocar de modelo é mudar `ZUMI_MODELO` no `wrangler.toml`, sem mexer no app.
- A página de Privacidade explica o que vai para a IA.
