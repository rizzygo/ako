# AGENTS.md da fatia trilhas

Vale para `trilhas/`: as trilhas, os mapas das áreas e as lições em português. As regras gerais estão no [`AGENTS.md`](../AGENTS.md) da raiz. O README desta pasta explica o conteúdo para pessoas; aqui ficam só os pontos em que um agente costuma errar.

## Onde mexer

| Quero... | Arquivo |
| --- | --- |
| Mudar um tópico, pergunta ou material | `dados/<trilha>.json` |
| Mudar um mapa de área | `dados/mapas.json` |
| Escrever ou corrigir uma lição | `materiais/<lição>.html` (e o índice em `materiais/`) |
| Mudar o app das trilhas | `app.js`, `app.css`, `index.html` |
| Escrever a spec de uma mudança | `specs/<nome>.md`, no [modelo dos Favos](https://github.com/rizzygo/favos/blob/main/regras/modelo-spec.md) |

## Pegadinhas

- **Trilha nova** entra em quatro listas: `TRILHAS` de `app.js`, `TRILHAS` de `mapas/mapas.js`, `TRILHAS` de `/conta.js` e `OUTRAS_TRILHAS` de `validar.py`. Passo a passo no [README](README.md#mais-de-uma-trilha).
- **Trilhas que se cruzam:** conteúdo comum a várias trilhas (comunicação, feedback, prioridade) mora na Habilidades humanas. As outras apontam para ela por `mapa_antes` ou por recurso `./?trilha=habilidades-humanas#/t/<tópico>`. Não copie o tópico. Spec em [`specs/trilhas-que-se-cruzam.md`](specs/trilhas-que-se-cruzam.md).
- **Progresso salvo** fica no navegador da pessoa, numa chave por trilha (`rizzygo-trilhas-v1`, `rizzygo-trilha-<id>-v1`). Não renomeie id de trilha, de tópico ou de chave: quem já estudou perde o progresso.
- **Material pago** leva `"gratuito": "não, ..."` e fica em "Para ir além". Nota e avaliações só depois de conferidas na fonte.
- **Lição própria** quando o melhor material gratuito é só um texto solto ou só existe em inglês.
- **A skill `proximo-passo`** dos Favos lê `dados/*.json`. Mudou a estrutura do JSON, avise no PR.

## Conferir

```sh
python3 trilhas/validar.py
node --check trilhas/app.js && node --check trilhas/mapas/mapas.js
```

Na prévia, abra a trilha mudada, um tópico, o desafio e o mapa, no celular e no modo escuro.
